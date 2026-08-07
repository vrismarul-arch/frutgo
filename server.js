require("dotenv").config();

const pool = require("./config/db");
const app = require("./app");

const PORT = process.env.PORT || 5000;

// Verify the MySQL connection before accepting traffic, so a bad
// DB_HOST/DB_PASSWORD in .env fails loudly at startup instead of
// silently breaking the first request that hits the database.
const startServer = async () => {
  try {
    const connection = await pool.getConnection();
    await connection.ping();
    connection.release();
    console.log("✅ Connected to MySQL database:", process.env.DB_NAME);

    app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error("❌ Failed to connect to MySQL database.");
    console.error("   Check DB_HOST, DB_USER, DB_PASSWORD, DB_NAME in your .env file.");
    console.error("   Error:", err.message);
    process.exit(1);
  }
};

startServer();