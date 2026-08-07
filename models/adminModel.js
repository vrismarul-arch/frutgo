const pool = require("../config/db");

const withRetry = async (fn, retries = 1) => {
  try {
    return await fn();
  } catch (err) {
    const isDroppedConnection =
      err.code === "ECONNRESET" || err.code === "PROTOCOL_CONNECTION_LOST" || err.fatal === true;
    if (retries > 0 && isDroppedConnection) {
      console.warn(`DB connection dropped (${err.code}), retrying...`);
      return withRetry(fn, retries - 1);
    }
    throw err;
  }
};

const findByEmail = async (email) => {
  return withRetry(async () => {
    const [rows] = await pool.query(`SELECT * FROM admins WHERE email = ?`, [email]);
    return rows.length > 0 ? rows[0] : null;
  });
};

const findById = async (id) => {
  return withRetry(async () => {
    const [rows] = await pool.query(`SELECT id, email, name FROM admins WHERE id = ?`, [id]);
    return rows.length > 0 ? rows[0] : null;
  });
};

module.exports = { findByEmail, findById };