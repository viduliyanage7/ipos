const express = require("express");
const router = express.Router();
const db = require("../db");

router.get("/stock-log", async (req, res) => {
  const { from = "", to = "" } = req.query;
  const validDate = value => typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
  if ((from !== "" && !validDate(from)) || (to !== "" && !validDate(to)) || (from && to && from > to)) {
    return res.status(400).json({ message: "Select a valid date range. From date must be on or before To date." });
  }
  const conditions = ["t.transaction_type = 3"];
  const params = [];
  if (from) { conditions.push("t.transaction_date >= ?"); params.push(from); }
  if (to) { conditions.push("t.transaction_date < DATE_ADD(?, INTERVAL 1 DAY)"); params.push(to); }
  try {
    const [rows] = await db.execute(`
      SELECT t.transaction_id, t.product_id, t.quantity, t.transaction_date,
        p.productName AS product_name, pc.name AS category_name,
        tt.type AS transaction_type
      FROM inventory_transactions t
      LEFT JOIN products p ON p.id = t.product_id
      LEFT JOIN product_categories pc ON pc.id = p.c_id
      LEFT JOIN inventory_transaction_types tt ON tt.id = t.transaction_type
      WHERE ${conditions.join(" AND ")}
      ORDER BY t.transaction_date DESC, t.transaction_id DESC
      ${from || to ? "" : "LIMIT 25"}
    `, params);
    return res.json({ rows });
  } catch (error) {
    console.error("stock-log error:", error);
    return res.status(500).json({ message: "Couldn't load stock additions." });
  }
});

router.post("/add", async (req, res) => {
  const { product_id, quantity } = req.body;

  if (!product_id || quantity === undefined) {
    return res
      .status(400)
      .json({ error: "Product ID and quantity are required" });
  }

  try {
    const [updateResult] = await db.execute(
      "UPDATE products SET productStock = productStock + ? WHERE id = ?",
      [quantity, product_id],
    );

    if (updateResult.affectedRows === 0) {
      return res.status(404).json({ error: "Product not found" });
    }

    const [rows] = await db.execute(
      "SELECT productStock FROM products WHERE id = ?",
      [product_id],
    );

    const updated_to = rows[0].productStock;

    await db.execute(
      `INSERT INTO inventory_transactions (product_id,order_id,quantity,transaction_type) VALUES (?, ?, ?, ?)`,
      [product_id, 0, quantity, 3],
    );

    await db.execute(
      `INSERT INTO inventory_balance (product_id,quantity,updated_to) VALUES (?, ?, ?)`,
      [product_id, quantity, updated_to],
    );

    res.status(200).json({
      message: "Product added to inventory successfully",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to add product to inventory" });
  }
});

router.get("/products", async (req, res) => {
  try {
    const [rows] = await db.execute(
      `SELECT
            pc.name AS category_name,
            p.c_id AS category_id,
            GROUP_CONCAT(p.id ORDER BY p.id ASC) AS productIds,
            GROUP_CONCAT(p.productName ORDER BY p.id ASC) AS productNames,
            GROUP_CONCAT(p.productStock ORDER BY p.id ASC) AS productStock
        FROM products AS p
        LEFT JOIN product_categories AS pc ON p.c_id = pc.id
        GROUP BY c_id;`,
    );
    if (rows.length > 0) {
      return res.json({
        data: rows,
      });
    } else {
      return res.status(401).json({
        message: "No products to show",
      });
    }
  } catch (error) {
    return res.status(401).json({
      message: "Connection Error",
    });
  }
});

module.exports = router;
