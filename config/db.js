const mysql = require("mysql2/promise");
require("dotenv").config();

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  // Keeps the underlying TCP connection alive so remote hosts (Hostinger,
  // etc.) don't silently drop idle pooled connections and cause
  // ECONNRESET on the next query that tries to reuse them.
  enableKeepAlive: true,
  keepAliveInitialDelay: 10000, // 10s
});

// Verify the pool can actually connect on startup, and log clearly if not —
// makes connection issues visible immediately instead of surfacing only
// as a cryptic ECONNRESET deep inside some unrelated request later.
pool
  .getConnection()
  .then((conn) => {
    console.log("✅ Connected to MySQL database:", process.env.DB_NAME);
    conn.release();
  })
  .catch((err) => {
    console.error("❌ MySQL connection failed:", err.message);
  });

module.exports = pool;