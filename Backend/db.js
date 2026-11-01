const mysql = require("mysql2");

const { readSettings, saveSettings } = require("./localSettings");
let host = readSettings().dbHost;

function createPool(dbHost) {
  return mysql.createPool({
    host: dbHost,
    user: "root",
    password: "johxun-budzac-Nidna9",
    database: "ipos",
  })
  .promise();
}

let pool = createPool(host);
module.exports = {
  execute: (...args) => pool.execute(...args),
  query: (...args) => pool.query(...args),
  getConnection: (...args) => pool.getConnection(...args),
  end: () => pool.end(),
  getHost: () => host,
  setHost: (value) => {
    const settings = saveSettings({ dbHost: value });
    if (settings.dbHost !== host) {
      const previous = pool;
      pool = createPool(settings.dbHost);
      host = settings.dbHost;
      previous.end().catch(error => console.error("Could not close previous database pool:", error.message));
    }
    return { dbHost: host };
  },
};
