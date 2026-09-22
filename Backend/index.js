const express = require("express");
const cors = require("cors");
const mysql = require("mysql2/promise");

const general = require("./routes/general");
const createBill = require("./routes/createBill");
const inventory = require("./routes/inventory");
const customer = require("./routes/customer");
const CollectPayment = require("./routes/collectPayment");

const app = express();

app.use(express.json());
app.use(cors());

app.use("/api/", general);
app.use("/api/create-bill/", createBill);
app.use("/api/inventory/", inventory);
app.use("/api/customer/", customer);
app.use("/api/collect-payment/", CollectPayment);

app.listen(3002, "0.0.0.0", () => {
  console.log("Listening");
});
