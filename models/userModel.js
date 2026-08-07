const pool = require("../config/db");

// Fetches a user by email — used for both local login and to check if a
// Google email already has an existing local account (account linking).
const findByEmail = async (email) => {
  const [rows] = await pool.query(`SELECT * FROM users WHERE email = ?`, [email]);
  return rows.length > 0 ? rows[0] : null;
};

// Fetches a user by their Google "sub" id — the stable unique identifier
// Google issues per account, stored in users.google_id.
const findByGoogleId = async (googleId) => {
  const [rows] = await pool.query(`SELECT * FROM users WHERE google_id = ?`, [googleId]);
  return rows.length > 0 ? rows[0] : null;
};

// Fetches a user by primary key — used by requireUserAuth-protected routes
// like GET /me.
const findById = async (id) => {
  const [rows] = await pool.query(`SELECT * FROM users WHERE id = ?`, [id]);
  return rows.length > 0 ? rows[0] : null;
};

// Creates a user who signed up with email + password.
const createLocalUser = async ({ name, email, hashedPassword }) => {
  const [result] = await pool.query(
    `INSERT INTO users (name, email, password, provider)
     VALUES (?, ?, ?, 'local')`,
    [name, email, hashedPassword]
  );
  return findById(result.insertId);
};

// Creates a user who signed up via "Sign in with Google" — no password.
const createGoogleUser = async ({ name, email, googleId, avatar }) => {
  const [result] = await pool.query(
    `INSERT INTO users (name, email, google_id, avatar, provider)
     VALUES (?, ?, ?, ?, 'google')`,
    [name, email, googleId, avatar || null]
  );
  return findById(result.insertId);
};

// Links a Google account to an existing local-signup user that shares the
// same email address, so they can log in either way going forward.
const linkGoogleId = async (userId, googleId, avatar) => {
  await pool.query(
    `UPDATE users
     SET google_id = ?, avatar = COALESCE(?, avatar)
     WHERE id = ?`,
    [googleId, avatar || null, userId]
  );
  return findById(userId);
};

module.exports = {
  findByEmail,
  findByGoogleId,
  findById,
  createLocalUser,
  createGoogleUser,
  linkGoogleId,
};