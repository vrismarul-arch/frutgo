// backend/config/s


const mysql = require("mysql2/promise");

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 3306),

  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,

  database: process.env.DB_NAME,

  waitForConnections: true,

  connectionLimit: 10,

  queueLimit: 0,

  /*
   * Helps avoid stale connections.
   */
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,

  /*
   * Return DATE/DATETIME values consistently.
   */
  dateStrings: false,
});

module.exports = pool;