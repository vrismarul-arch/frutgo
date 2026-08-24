// ============================================================
// models/deviceTokenModel.js
// CRUD for FCM device tokens
// ============================================================

const pool = require("../config/db");

// ============================================================
// SAVE / UPSERT TOKEN
// ============================================================
// Called every time the app starts / user logs in, so the
// token always points to the current logged-in user, even if
// the same device is used for a different account later.
// ============================================================

const saveToken = async (userId, token, platform = "android") => {
  await pool.query(
    `
    INSERT INTO device_tokens (user_id, token, platform)
    VALUES (?, ?, ?)
    ON DUPLICATE KEY UPDATE
      user_id = VALUES(user_id),
      platform = VALUES(platform),
      updated_at = CURRENT_TIMESTAMP
    `,
    [userId, token, platform]
  );
};

// ============================================================
// GET ALL TOKENS FOR A USER
// ============================================================

const getTokensByUser = async (userId) => {
  const [rows] = await pool.query(
    `SELECT token FROM device_tokens WHERE user_id = ?`,
    [userId]
  );

  return rows.map((row) => row.token);
};

// ============================================================
// REMOVE A SINGLE TOKEN (e.g. on logout)
// ============================================================

const removeToken = async (token) => {
  await pool.query(`DELETE FROM device_tokens WHERE token = ?`, [token]);
};

// ============================================================
// REMOVE DEAD/INVALID TOKENS
// (call this when FCM says a token is no longer registered)
// ============================================================

const removeTokens = async (tokens = []) => {
  if (!tokens.length) return;

  await pool.query(`DELETE FROM device_tokens WHERE token IN (?)`, [tokens]);
};

module.exports = {
  saveToken,
  getTokensByUser,
  removeToken,
  removeTokens,
};