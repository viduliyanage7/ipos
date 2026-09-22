const mysql = require("mysql2");

module.exports = mysql
  .createPool({
    host: "localhost",
    user: "root",
    password: "johxun-budzac-Nidna9",
    database: "ipos",
  })
  .promise();
