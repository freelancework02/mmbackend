const mysql = require("mysql");

const pool = mysql.createPool({
  connectionLimit: 10,
  host: "bom1plzcpnl503547.prod.bom1.secureserver.net",
  user: "hkxhmqn0p94j",
  password: "MoS#awes77@",
  database: "MMDATA",
  connectTimeout: 10000,
  acquireTimeout: 10000
});

pool.on("error", (err) => console.error("MySQL Pool Error:", err));

module.exports = pool;
