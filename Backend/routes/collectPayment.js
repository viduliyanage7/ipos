const express = require("express");
const router = express.Router();
const db = require("../db");

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

    // Previous unsettled bills for this customer (oldest first)
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
        AND o.status IN (1,2)
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
        AND o.status IN (1,2)
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
  const { order_id, customer_id, payment, userId } = req.body;

  if (!order_id || !customer_id || payment == null) {
    return res.status(400).json({
      success: false,
      message: "Missing required fields.",
    });
  }

  const paymentAmount = Number(payment);

  if (!Number.isFinite(paymentAmount) || paymentAmount <= 0) {
    return res.status(400).json({
      success: false,
      message: "Invalid payment amount.",
    });
  }

  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    /*
     * Get all outstanding bills for this customer,
     * starting from the oldest bill.
     *
     * We calculate the outstanding amount using
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

    let remainingPayment = paymentAmount;

    for (const order of orders) {
      if (remainingPayment <= 0) {
        break;
      }

      const orderTotal = Number(order.total);
      const alreadyPaid = Number(order.paid_amount);
      const outstanding = Number(order.outstanding_amount);

      /*
       * How much of this payment should go
       * toward this particular bill?
       */
      const paymentForOrder = Math.min(remainingPayment, outstanding);

      /*
       * Record the actual payment.
       *
       * This is important for partial payments.
       */
      await connection.execute(
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
        [order.order_id, 1, paymentForOrder, userId],
      );

      const newPaidAmount = alreadyPaid + paymentForOrder;

      /*
       * Fully paid
       */
      if (newPaidAmount >= orderTotal) {
        await connection.execute(
          `
          UPDATE orders
          SET status = 3
          WHERE order_id = ?
          `,
          [order.order_id],
        );
      } else {
        /*
         * Partially paid
         */
        await connection.execute(
          `
          UPDATE orders
          SET status = 2
          WHERE order_id = ?
          `,
          [order.order_id],
        );
      }

      remainingPayment -= paymentForOrder;
    }

    /*
     * If the customer paid more than all outstanding
     * bills, don't silently lose the extra money.
     */
    if (remainingPayment > 0) {
      await connection.rollback();

      return res.status(400).json({
        success: false,
        message: "Payment exceeds the total outstanding amount.",
      });
    }

    await connection.commit();

    return res.json({
      success: true,
      message: "Payment completed successfully.",
    });
  } catch (err) {
    await connection.rollback();

    console.error("complete-payment error:", err);

    return res.status(500).json({
      success: false,
      message: "Failed to complete payment.",
    });
  } finally {
    connection.release();
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
