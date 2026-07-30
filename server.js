const app = require("./app");
const env = require("./config/env");
const pool = require("./config/db");

async function start() {
  try {
    // verify DB connection before accepting traffic
    const connection = await pool.getConnection();
    connection.release();
    console.log("Database connected");

    app.listen(env.PORT, () => {
      console.log(`Server running on port ${env.PORT}`);
    });
  } catch (err) {
    console.error("Failed to connect to database:", err.message);
    process.exit(1);
  }
}

start();
