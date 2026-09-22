const express = require("express");
const router = express.Router();
const db = require("../db");

router.post("/customer-search", async (req, res) => {
  const { ph_number } = req.body;
  if (!ph_number) {
    return req.status(400).json({
      status: "Error",
      message: "Invalid Phone number",
    });
  }

  try {
    const [rows] = await db.execute(
      "SELECT id,phone_number,name,vehicle_no,location,customer_type,is_verified from customers WHERE phone_number = ?",
      [ph_number],
    );
    if (rows.length > 0) {
      return res.json({
        data: rows[0],
      });
    } else {
      return res.status(401).json({
        message: "User not found",
      });
    }
  } catch (error) {
    console.log(error);
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
        WHERE productStock > 0
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

router.get("/product_price", async (req, res) => {
  const { pid, qty } = req.query;
  if (!pid || !qty) {
    return res.status(400).json({
      message: "Invalid Product ID or Quantity",
    });
  }
  try {
    const [rows] = await db.execute(
      `SELECT price from product_prices
                WHERE pid = ? AND min_qty <= ? AND max_qty >= ?`,
      [req.query.pid, req.query.qty, req.query.qty],
    );
    if (rows.length > 0) {
      return res.json({
        data: rows[0],
      });
    } else {
      return res.status(401).json({
        message: "Product price not found",
      });
    }
  } catch (error) {
    return res.status(401).json({
      message: "Connection Error",
    });
  }
});

router.post("/generate-bill", async (req, res) => {
  const { user_id, c_id, items, total } = req.body;
  if (!c_id || !items || items.length === 0) {
    return res.status(400).json({
      message: "Invalid request data",
    });
  }

  try {
    const today = new Date();

    const datePrefix =
      today.getFullYear().toString() +
      String(today.getMonth() + 1).padStart(2, "0") +
      String(today.getDate()).padStart(2, "0");

    const [rows] = await db.execute(
      `SELECT order_number FROM orders WHERE order_number LIKE ? ORDER BY order_number DESC LIMIT 1
            FOR UPDATE`,
      [`${datePrefix}%`],
    );

    let nextSeq = 1;

    if (rows.length > 0) {
      const lastNumber = rows[0].order_number;
      const lastSeq = Number(lastNumber) % 1000;
      nextSeq = lastSeq + 1;
    }

    const orderNumber = datePrefix + String(nextSeq).padStart(3, "0");
    const [billResult] = await db.execute(
      "INSERT INTO orders (order_number,customer_id,total, user_id,status,created_at,updated_at) VALUES (?, ?, ?, ?, ?, NOW(),NOW())",
      [orderNumber, c_id, total, user_id, 1],
    );

    const billId = billResult.insertId;

    for (const item of items) {
      await db.execute(
        `UPDATE products SET productStock = productStock - ? WHERE id = ?`,
        [item.qty, item.id],
      );

      await db.execute(
        `INSERT INTO inventory_transactions (product_id,order_id,quantity,transaction_type) VALUES (?, ?, ?, ?)`,
        [item.id, billId, item.qty, 1],
      );

      await db.execute(
        "INSERT INTO order_items (order_id, product_id, quantity, unit_price) VALUES (?, ?, ?, ?)",
        [billId, item.id, item.qty, item.price],
      );
    }

    return res.json({
      message: "Bill saved successfully",
      billId: billId,
    });
  } catch (error) {
    console.log(error);
    console.error(error);
    return res.status(500).json({
      message: "Failed to save bill",
    });
  }
});

router.post("/customer-registration", async (req, res) => {
  const { phone, name, vehicleNo, location } = req.body;
  if (!phone || !name || !vehicleNo || !location) {
    return res.status(400).json({
      message: "Invalid request data",
    });
  }

  try {
    const [rows] = await db.execute(
      "INSERT INTO customers (phone_number, name, vehicle_no, location) VALUES (?, ?, ?, ?)",
      [phone, name, vehicleNo, location],
    );

    const [customerRows] = await db.execute(
      "SELECT id, phone_number, name, vehicle_no, location FROM customers WHERE id = ?",
      [rows.insertId],
    );

    if (customerRows.length > 0) {
      return res.json({
        status: "Success",
        message: "Customer registered successfully",
        data: customerRows[0],
      });
    } else {
      return res.status(500).json({
        message: "Failed to retrieve registered customer",
      });
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Failed to register customer",
    });
  }
});

module.exports = router;
