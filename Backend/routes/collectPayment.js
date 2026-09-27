const express = require("express");
const router = express.Router();
const db = require("../db");

router.get("/fetch-all", async (req, res) => {
  try {
    const [rows] = await db.execute(`
      SELECT
    o1.order_id,
    o1.order_number,
    o1.customer_id,
    o1.created_at,
    c.name AS customer_name,

    o1.total AS bill_total,

    COALESCE((
        SELECT SUM(o2.total)
        FROM orders AS o2
        WHERE o2.customer_id = o1.customer_id
          AND o2.order_id < o1.order_id
          AND o2.status IN (1, 2)
    ), 0) AS previous_bill_total,

    COALESCE((
        SELECT SUM(op.amount)
        FROM order_payments AS op
        INNER JOIN orders AS o2
            ON o2.order_id = op.order_id
        WHERE o2.customer_id = o1.customer_id
          AND o2.order_id < o1.order_id
          AND o2.status IN (1, 2)
    ), 0) AS previous_paid_total,

    GREATEST(
        COALESCE((
            SELECT SUM(o2.total)
            FROM orders AS o2
            WHERE o2.customer_id = o1.customer_id
              AND o2.order_id < o1.order_id
              AND o2.status IN (1, 2)
        ), 0)
        -
        COALESCE((
            SELECT SUM(op.amount)
            FROM order_payments AS op
            INNER JOIN orders AS o2
                ON o2.order_id = op.order_id
            WHERE o2.customer_id = o1.customer_id
              AND o2.order_id < o1.order_id
              AND o2.status IN (1, 2)
        ), 0),
        0
    ) AS previous_balance,

    o1.total +
    GREATEST(
        COALESCE((
            SELECT SUM(o2.total)
            FROM orders AS o2
            WHERE o2.customer_id = o1.customer_id
              AND o2.order_id < o1.order_id
              AND o2.status IN (1, 2)
        ), 0)
        -
        COALESCE((
            SELECT SUM(op.amount)
            FROM order_payments AS op
            INNER JOIN orders AS o2
                ON o2.order_id = op.order_id
            WHERE o2.customer_id = o1.customer_id
              AND o2.order_id < o1.order_id
              AND o2.status IN (1, 2)
        ), 0),
        0
    ) AS total_due

FROM orders AS o1

LEFT JOIN customers AS c
    ON c.id = o1.customer_id

WHERE o1.status = 1

ORDER BY o1.created_at DESC;
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

module.exports = router;
