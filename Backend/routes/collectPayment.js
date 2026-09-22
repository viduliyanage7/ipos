const express = require("express");
const router = express.Router();
const db = require("../db");

router.get("/fetch-all", async (req, res) => {
  try {
    const [rows] = await db.execute(
      `
SELECT
    o1.order_id,
    o1.order_number,
    o1.created_at,
    o1.total AS bill_total,
    c.id AS customer_id,
    c.name AS customer_name,

    COALESCE(SUM(o2.total), 0) AS pre_bills_total,

    o1.total + COALESCE(SUM(o2.total), 0) AS total_due

FROM orders AS o1

LEFT JOIN customers AS c
    ON o1.customer_id = c.id

LEFT JOIN orders AS o2
    ON o2.customer_id = o1.customer_id
    AND o2.status = 2

WHERE o1.status = 1

GROUP BY
    o1.order_id,
    o1.order_number,
    o1.created_at,
    o1.total,
    c.id,
    c.name

ORDER BY o1.created_at DESC;
      `,
    );

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
  const { order_id, customer_id, payment, amountDue, userId } = req.body;
  if (!order_id || !customer_id || payment == null || amountDue == null) {
    return res.status(400).json({
      success: false,
      message: "Missing required fields.",
    });
  }

  if (payment < 0) {
    return res.status(400).json({
      success: false,
      message: "Invalid payment amount.",
    });
  }

  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const [orders] = await connection.execute(
      `SELECT order_id, total
       FROM orders
       WHERE order_id <= ?
         AND status <> 3
         AND customer_id = ?
       ORDER BY order_id ASC
       FOR UPDATE`,
      [order_id, customer_id],
    );

    if (orders.length === 0) {
      await connection.rollback();

      return res.status(400).json({
        success: false,
        message: "No unpaid orders found.",
      });
    }

    let remainingPayment = payment;

    for (const row of orders) {
      if (remainingPayment >= row.total) {
        // This bill can be completely paid
        await connection.execute(
          `UPDATE orders
           SET status = 3
           WHERE order_id = ?`,
          [row.order_id],
        );

        await connection.execute(
          `INSERT INTO order_payments
           (order_id, payment_method, amount, user_id)
           VALUES (?, ?, ?, ?)`,
          [row.order_id, 1, row.total, userId],
        );

        remainingPayment -= row.total;
      } else {
        await connection.execute(
          `UPDATE orders
           SET status = 2
           WHERE order_id = ?`,
          [row.order_id],
        );
      }
    }

    await connection.commit();

    return res.json({
      success: true,
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
