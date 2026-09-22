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
      "INSERT INTO inventory_transactions (updated_by, updated_to, product_id) VALUES (?, ?, ?)",
      [quantity, updated_to, product_id],
    );

    await db.execute(
      `INSERT INTO inventory_transactions (product_id,order_id,quantity,transaction_type) VALUES (?, ?, ?, ?)`,
      [product_id, 0, quantity, 3],
    );

    res.status(200).json({
      message: "Product added to inventory successfully",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to add product to inventory" });
  }
});

module.exports = router;
