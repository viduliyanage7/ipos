const express = require("express");
const router = express.Router();
const db = require("../db");

const validDate = (value) => typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) &&
  !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
const summary = `SELECT o.*, c.name AS customer_name, c.phone_number AS customer_phone,
  c.vehicle_no, c.location, u.username AS created_by,
  COALESCE(p.paid_amount, 0) AS paid_amount,
  GREATEST(o.total - COALESCE(p.paid_amount, 0), 0) AS outstanding_amount
  FROM orders o
  LEFT JOIN customers c ON c.id = o.customer_id
  LEFT JOIN users u ON u.id = o.user_id
  LEFT JOIN (SELECT order_id, SUM(amount) AS paid_amount FROM order_payments GROUP BY order_id) p ON p.order_id = o.order_id`;

router.get("/", async (req, res) => {
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Colombo", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  const { from = today, to = today, status = "all" } = req.query;
  if ((from !== "" && !validDate(from)) || (to !== "" && !validDate(to)) || (from && to && from > to) || !["all", "unpaid", "partial", "paid"].includes(status)) {
    return res.status(400).json({ message: "Select a valid date range and payment status." });
  }
  const statusFilter = {
    all: "", unpaid: " AND COALESCE(p.paid_amount, 0) = 0 AND o.total > 0",
    partial: " AND COALESCE(p.paid_amount, 0) > 0 AND COALESCE(p.paid_amount, 0) < o.total",
    paid: " AND COALESCE(p.paid_amount, 0) >= o.total",
  }[status];
  const conditions = ["1 = 1"];
  const params = [];
  if (from) { conditions.push("o.created_at >= ?"); params.push(from); }
  if (to) { conditions.push("o.created_at < DATE_ADD(?, INTERVAL 1 DAY)"); params.push(to); }
  try {
    const [rows] = await db.execute(`${summary}
      WHERE ${conditions.join(" AND ")}
      ${statusFilter} ORDER BY o.created_at DESC, o.order_id DESC`, params);
    return res.json({ rows });
  } catch (error) {
    console.error("orders list error:", error);
    return res.status(500).json({ message: "Couldn't load orders." });
  }
});

router.get("/:id", async (req, res) => {
  if (!Number.isSafeInteger(Number(req.params.id)) || Number(req.params.id) < 1) {
    return res.status(400).json({ message: "Invalid order ID." });
  }
  try {
    const [orders] = await db.execute(`${summary} WHERE o.order_id = ?`, [req.params.id]);
    if (!orders.length) return res.status(404).json({ message: "Order not found." });
    const [items] = await db.execute(`
      SELECT oi.order_item_id, oi.product_id, p.productName AS product_name,
        pc.name AS category_name, oi.quantity, oi.unit_price, 0 AS is_custom
      FROM order_items oi LEFT JOIN products p ON p.id = oi.product_id
      LEFT JOIN product_categories pc ON pc.id = p.c_id WHERE oi.order_id = ?
      UNION ALL
      SELECT order_item_id, NULL, product_name, 'Custom', quantity, unit_price, 1
      FROM order_items_custom WHERE order_id = ? ORDER BY order_item_id`, [req.params.id, req.params.id]);
    const [payments] = await db.execute(`
      SELECT op.payment_id, op.amount, op.payment_time, op.reference_no,
        op.user_id, u.username AS received_by, pm.types AS payment_method, bt.reference_number AS bank_reference
      FROM order_payments op LEFT JOIN bank_transfers bt ON bt.payment_id = op.payment_id LEFT JOIN users u ON u.id = op.user_id
      LEFT JOIN order_payment_methods pm ON pm.id = op.payment_method
      WHERE op.order_id = ? ORDER BY op.payment_time, op.payment_id`, [req.params.id]);
    return res.json({ data: { ...orders[0], items, payments } });
  } catch (error) {
    console.error("order detail error:", error);
    return res.status(500).json({ message: "Couldn't load order details." });
  }
});
module.exports = router;
