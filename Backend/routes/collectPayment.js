const express = require("express");
const router = express.Router();
const db = require("../db");

router.post("/delete-order", async (req, res) => {
  const orderId = Number(req.body.order_id);
  if (!Number.isSafeInteger(orderId) || orderId <= 0) {
    return res.status(400).json({ message: "Invalid order ID." });
  }
  let connection;
  try {
    connection = await db.getConnection();
    await connection.beginTransaction();
    const [orders] = await connection.execute(
      "SELECT order_id, status FROM orders WHERE order_id = ? FOR UPDATE", [orderId],
    );
    if (!orders.length) {
      await connection.rollback();
      return res.status(404).json({ message: "Order not found." });
    }
    // Only entries still available on Collect Payment can be deleted here.
    if (Number(orders[0].status) !== 1) {
      await connection.rollback();
      return res.status(409).json({ message: "This order has already been processed. Refresh the list." });
    }
    // Reverse the recorded stock deductions, including repeated product lines.
    const [movements] = await connection.execute(
      `SELECT product_id, quantity FROM inventory_transactions
       WHERE order_id = ? AND transaction_type = 1 ORDER BY product_id FOR UPDATE`, [orderId],
    );
    for (const movement of movements) {
      const [result] = await connection.execute(
        "UPDATE products SET productStock = productStock + ? WHERE id = ?",
        [movement.quantity, movement.product_id],
      );
      if (result.affectedRows !== 1) throw new Error("Cannot restore stock for a missing product.");
    }
    // Delete child records before their parent to respect foreign keys.
    await connection.execute("DELETE FROM bank_transfers WHERE order_id = ?", [orderId]);
    await connection.execute("DELETE FROM order_payments WHERE order_id = ?", [orderId]);
    await connection.execute("DELETE FROM order_items_custom WHERE order_id = ?", [orderId]);
    await connection.execute("DELETE FROM order_items WHERE order_id = ?", [orderId]);
    await connection.execute("DELETE FROM inventory_transactions WHERE order_id = ?", [orderId]);
    await connection.execute("DELETE FROM orders WHERE order_id = ?", [orderId]);
    await connection.commit();
    return res.json({ success: true, message: "Order deleted and stock restored." });
  } catch (error) {
    if (connection) await connection.rollback();
    console.error("delete-order error:", error);
    return res.status(500).json({ message: "Couldn't delete the order. No changes were saved." });
  } finally {
    if (connection) connection.release();
  }
});

// Pending balances are derived from recorded payments, regardless of status.
router.get("/pending", async (req, res) => {
  try {
    const [rows] = await db.execute(`
      SELECT o.order_id, o.order_number, o.customer_id, o.created_at,
        o.total AS bill_total, c.name AS customer_name,
        c.phone_number AS customer_phone,
        COALESCE(p.paid_amount, 0) AS paid_amount,
        o.total - COALESCE(p.paid_amount, 0) AS outstanding_amount
      FROM orders o
      LEFT JOIN customers c ON c.id = o.customer_id
      LEFT JOIN (
        SELECT order_id, SUM(amount) AS paid_amount
        FROM order_payments GROUP BY order_id
      ) p ON p.order_id = o.order_id
      WHERE o.total > COALESCE(p.paid_amount, 0)
      ORDER BY o.created_at ASC, o.order_id ASC
    `);
    return res.json({ success: true, rows });
  } catch (error) {
    console.error("pending orders error:", error);
    return res.status(500).json({ message: "Failed to load pending payments." });
  }
});

// Settle only the selected order; the existing collection flow allocates oldest first.
router.post("/settle-pending", async (req, res) => {
  const { order_id, payment, userId } = req.body;
  const amount = Number(payment);
  const cents = Math.round(amount * 100);
  if (!Number.isSafeInteger(Number(order_id)) || Number(order_id) <= 0 ||
      !userId || !Number.isFinite(amount) || cents <= 0 ||
      !Number.isSafeInteger(cents) || Math.abs(amount * 100 - cents) > 0.000001) {
    return res.status(400).json({ message: "Enter a valid order, user and payment amount (up to two decimal places)." });
  }
  let connection;
  try {
    connection = await db.getConnection();
    await connection.beginTransaction();
    // Serialize settlements on this order before reading its payment balance.
    const [orders] = await connection.execute(
      "SELECT total FROM orders WHERE order_id = ? FOR UPDATE", [order_id],
    );
    if (!orders.length) {
      await connection.rollback();
      return res.status(404).json({ message: "Order not found." });
    }
    const [[paid]] = await connection.execute(
      "SELECT COALESCE(SUM(amount), 0) AS paid_amount FROM order_payments WHERE order_id = ?", [order_id],
    );
    const outstanding = Math.round(Number(orders[0].total) * 100) - Math.round(Number(paid.paid_amount) * 100);
    if (cents > outstanding) {
      await connection.rollback();
      return res.status(400).json({ message: "Payment exceeds the current outstanding balance. Refresh and try again." });
    }
    await connection.execute(
      "INSERT INTO order_payments (order_id, payment_method, amount, user_id) VALUES (?, ?, ?, ?)",
      [order_id, 1, cents / 100, userId],
    );
    await connection.execute("UPDATE orders SET status = ? WHERE order_id = ?", [cents === outstanding ? 3 : 2, order_id]);
    await connection.commit();
    return res.json({ success: true, balance: (outstanding - cents) / 100 });
  } catch (error) {
    if (connection) await connection.rollback();
    console.error("settle-pending error:", error);
    return res.status(500).json({ message: "Failed to save payment." });
  } finally {
    if (connection) connection.release();
  }
});

router.get("/fetch-all", async (req, res) => {
  try {
    const [rows] = await db.execute(`
      SELECT
        o.order_id,
        o.order_number,
        o.customer_id,
        o.created_at,
        o.total AS bill_total,
        c.name AS customer_name
      FROM orders AS o
      LEFT JOIN customers AS c ON o.customer_id = c.id
      WHERE o.status = 1
      ORDER BY o.created_at DESC;
    `);

    return res.status(200).json({
      success: true,
      rows,
    });
  } catch (error) {
    console.error("fetch-all error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch orders.",
    });
  }
});

router.get("/order-details/:orderID", async (req, res) => {
  const { orderID } = req.params;

  if (!orderID) {
    return res.status(400).json({
      success: false,
      message: "Missing order ID.",
    });
  }

  try {
    const [orderRows] = await db.execute(
      `
      SELECT
        o.order_id,
        o.order_number,
        o.customer_id,
        o.created_at,
        o.total AS bill_total,
        c.name AS customer_name,
        c.phone_number AS customer_phone,
        c.location AS location,
        c.vehicle_no AS vehicle_no
      FROM orders AS o
      LEFT JOIN customers AS c ON c.id = o.customer_id
      WHERE o.order_id = ?
        AND o.status IN (1, 2)
      `,
      [orderID],
    );

    if (orderRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Order not found.",
      });
    }

    const order = orderRows[0];

    // Include both unpaid and partially paid previous bills, matching payment allocation.
    const [previousBills] = await db.execute(
      `
      SELECT
        o.order_id,
        o.order_number,
        o.created_at,
        o.total
      FROM orders AS o
      WHERE o.customer_id = ?
        AND o.order_id < ?
        AND o.status <> 3
      ORDER BY o.order_id ASC
      `,
      [order.customer_id, order.order_id],
    );

    // Payments already made against those previous bills
    const [[paid]] = await db.execute(
      `
      SELECT COALESCE(SUM(p.amount), 0) AS previous_paid_total
      FROM order_payments AS p
      INNER JOIN orders AS o ON o.order_id = p.order_id
      WHERE o.customer_id = ?
        AND o.order_id < ?
        AND o.status <> 3
      `,
      [order.customer_id, order.order_id],
    );

    const billTotal = Number(order.bill_total) || 0;
    const previousBillTotal = previousBills.reduce(
      (sum, b) => sum + (Number(b.total) || 0),
      0,
    );
    const previousPaidTotal = Number(paid.previous_paid_total) || 0;
    const previousBalance = Math.max(previousBillTotal - previousPaidTotal, 0);

    return res.status(200).json({
      success: true,
      data: {
        ...order,
        bill_total: billTotal,
        previous_bills: previousBills.map((b) => ({
          order_id: b.order_id,
          order_number: b.order_number,
          created_at: b.created_at,
          total: Number(b.total) || 0,
        })),
        previous_bill_total: previousBillTotal,
        previous_paid_total: previousPaidTotal,
        previous_balance: previousBalance,
        total_due: billTotal + previousBalance,
      },
    });
  } catch (error) {
    console.error("order-details error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch order details.",
    });
  }
});

router.post("/complete-payment", async (req, res) => {
  const { order_id, customer_id, payment, userId, payment_method = "cash", reference_number } = req.body;
  const isBankTransfer = payment_method === "bank_transfer";
  if (!["cash", "bank_transfer"].includes(payment_method) ||
      (isBankTransfer && (typeof reference_number !== "string" || !/^\d{1,12}$/.test(reference_number)))) {
    return res.status(400).json({ success: false, message: "Choose a valid payment method and enter a bank reference of 1–12 digits." });
  }

  if (!order_id || !customer_id || payment == null) {
    return res.status(400).json({
      success: false,
      message: "Missing required fields.",
    });
  }

  const paymentAmount = Number(payment);

  // 0 is allowed (customer pays nothing now; the order becomes unsettled)
  if (!Number.isFinite(paymentAmount) || paymentAmount < 0 || !Number.isSafeInteger(Math.round(paymentAmount * 100)) || Math.abs(paymentAmount * 100 - Math.round(paymentAmount * 100)) > 0.000001) {
    return res.status(400).json({
      success: false,
      message: "Invalid payment amount.",
    });
  }

  if (isBankTransfer && paymentAmount <= 0) {
    return res.status(400).json({ success: false, message: "Bank transfer amount must be greater than zero." });
  }
  let connection;
  try {
    connection = await db.getConnection();
    await connection.beginTransaction();

    /*
     * Get all outstanding bills for this customer,
     * starting from the oldest bill.
     *
     * The outstanding amount is calculated from the
     * payments already recorded for each order.
     */
    const [orders] = await connection.execute(
      `
      SELECT
          o.order_id,
          o.order_number,
          o.total,
          o.status,

          COALESCE(SUM(op.amount), 0) AS paid_amount,

          (
              o.total - COALESCE(SUM(op.amount), 0)
          ) AS outstanding_amount

      FROM orders AS o

      LEFT JOIN order_payments AS op
          ON op.order_id = o.order_id

      WHERE o.customer_id = ?
        AND o.order_id <= ?
        AND o.status <> 3

      GROUP BY
          o.order_id,
          o.order_number,
          o.total,
          o.status

      HAVING outstanding_amount > 0

      ORDER BY o.order_id ASC

      FOR UPDATE
      `,
      [customer_id, order_id],
    );

    if (orders.length === 0) {
      await connection.rollback();

      return res.status(400).json({
        success: false,
        message: "No outstanding orders found.",
      });
    }

    const amountDueCents = orders.reduce((sum, order) => sum + Math.round(Number(order.outstanding_amount) * 100), 0);
    if (isBankTransfer && Math.round(paymentAmount * 100) > amountDueCents) {
      await connection.rollback();
      return res.status(400).json({ success: false, message: "Bank transfers cannot exceed the outstanding amount. Change is available for cash payments only." });
    }
    let remainingPayment = Math.round(paymentAmount * 100);

    for (const order of orders) {
      const orderTotal = Math.round(Number(order.total) * 100);
      const alreadyPaid = Math.round(Number(order.paid_amount) * 100);
      const outstanding = Math.round(Number(order.outstanding_amount) * 100);

      /*
       * How much of this payment goes toward this bill.
       * This is 0 when the customer paid 0, or when the
       * payment has already been used up on older bills.
       */
      const paymentForOrder = Math.min(remainingPayment, outstanding);

      /*
       * Only record real payments (no zero-amount rows).
       */
      if (paymentForOrder > 0) {
        const [paymentResult] = await connection.execute(
          `
          INSERT INTO order_payments
            (
              order_id,
              payment_method,
              amount,
              user_id
            )
          VALUES (?, ?, ?, ?)
          `,
          [order.order_id, isBankTransfer ? 2 : 1, paymentForOrder / 100, userId],
        );
        if (isBankTransfer) {
          await connection.execute(
            `INSERT INTO bank_transfers (payment_id, order_id, customer_id, reference_number, amount, user_id)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [paymentResult.insertId, order.order_id, customer_id, reference_number, paymentForOrder / 100, userId],
          );
        }
      }

      const newPaidAmount = alreadyPaid + paymentForOrder;

      /*
       * 3 = fully paid
       * 2 = unsettled (partially paid, or nothing paid yet)
       *
       * Every order in the loop is updated, so the current
       * order always leaves status 1 and drops off the list.
       */
      await connection.execute(
        `
        UPDATE orders
        SET status = ?
        WHERE order_id = ?
        `,
        [newPaidAmount >= orderTotal ? 3 : 2, order.order_id],
      );

      remainingPayment -= paymentForOrder;
    }

    // Any cash left after settling the bills is returned to the customer as change.
    await connection.commit();

    return res.json({
      success: true,
      message: "Payment completed successfully.",
      data: {
        paymentMethod: payment_method,
        referenceNumber: isBankTransfer ? reference_number : null,
        amountDue: amountDueCents / 100,
        amountPaid: paymentAmount,
        amountApplied: (Math.round(paymentAmount * 100) - remainingPayment) / 100,
        change: remainingPayment / 100,
        balance: (amountDueCents - Math.round(paymentAmount * 100)) / 100,
      },
    });
  } catch (err) {
    if (connection) await connection.rollback();

    console.error("complete-payment error:", err);

    return res.status(500).json({
      success: false,
      message: "Failed to complete payment.",
    });
  } finally {
    if (connection) connection.release();
  }
});

router.get("/fetch-bill-items", async (req, res) => {
  const { orderID } = req.query;

  if (!orderID) {
    return res.status(400).json({
      success: false,
      message: "Missing order ID.",
    });
  }

  try {
    const [rows] = await db.execute(
      `
      SELECT
        p.productName AS productName,
        pc.name       AS categoryName,
        oi.quantity   AS qty,
        oi.unit_price AS price,
        0             AS isCustom
      FROM order_items AS oi
      LEFT JOIN products AS p ON p.id = oi.product_id
      LEFT JOIN product_categories AS pc ON pc.id = p.c_id
      WHERE oi.order_id = ?

      UNION ALL

      SELECT
        oic.product_name  AS productName,
        'Custom'       AS categoryName,
        oic.quantity   AS qty,
        oic.unit_price AS price,
        1              AS isCustom
      FROM order_items_custom AS oic
      WHERE oic.order_id = ?
      `,
      [orderID, orderID],
    );

    return res.status(200).json({
      success: true,
      rows,
    });
  } catch (error) {
    console.error("fetch-bill-items error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch bill items.",
    });
  }
});

module.exports = router;
