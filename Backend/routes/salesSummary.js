const express = require("express");
const db = require("../db");
const router = express.Router();

router.get("/", async (req, res) => {
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Colombo", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  const year = Number(today.slice(0, 4));
  const month = Number(today.slice(5, 7));
  const { from = `${today.slice(0, 7)}-01`, to = `${today.slice(0, 7)}-${new Date(Date.UTC(year, month, 0)).getUTCDate()}` } = req.query;
  const validDate = value => typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
  if (!validDate(from) || !validDate(to) || from > to) {
    return res.status(400).json({ message: "Select a valid From and To date range." });
  }
  try {
    // Aggregate quantities without joining payments to avoid counting split payments twice.
    const [rows] = await db.execute(`
      SELECT category_key, category_name, product_name,
        SUM(quantity) AS quantity_sold
      FROM (
        SELECT COALESCE(CONCAT('category-', pc.id), 'uncategorized') AS category_key,
          COALESCE(pc.name, 'Uncategorized') AS category_name,
          COALESCE(p.productName, CONCAT('Product #', oi.product_id)) AS product_name,
          oi.quantity
        FROM order_items oi
        INNER JOIN orders o ON o.order_id = oi.order_id
        LEFT JOIN products p ON p.id = oi.product_id
        LEFT JOIN product_categories pc ON pc.id = p.c_id
        WHERE o.created_at >= ? AND o.created_at < DATE_ADD(?, INTERVAL 1 DAY)
        UNION ALL
        SELECT 'custom', 'Custom items', oi.product_name, oi.quantity
        FROM order_items_custom oi
        INNER JOIN orders o ON o.order_id = oi.order_id
        WHERE o.created_at >= ? AND o.created_at < DATE_ADD(?, INTERVAL 1 DAY)
      ) sales
      GROUP BY category_key, category_name, product_name
      ORDER BY category_name, category_key, product_name
    `, [from, to, from, to]);
    return res.json({ rows, from, to });
  } catch (error) {
    console.error("sales summary error:", error);
    return res.status(500).json({ message: "Couldn't load product sales. Try again." });
  }
});

module.exports = router;
