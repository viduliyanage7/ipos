const express = require("express");
const router = express.Router();
const db = require("../db");

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
