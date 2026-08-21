const pool = require("../config/db");

// =====================================================
// FIND USER BY EMAIL
// =====================================================
const findByEmail = async (email) => {
  const [rows] = await pool.query(
    `SELECT * FROM users WHERE email = ?`,
    [email]
  );

  return rows.length > 0 ? rows[0] : null;
};

// =====================================================
// FIND USER BY GOOGLE ID
// =====================================================
const findByGoogleId = async (googleId) => {
  const [rows] = await pool.query(
    `SELECT * FROM users WHERE google_id = ?`,
    [googleId]
  );

  return rows.length > 0 ? rows[0] : null;
};

// =====================================================
// FIND USER BY ID
// =====================================================
const findById = async (id) => {
  const [rows] = await pool.query(
    `SELECT * FROM users WHERE id = ?`,
    [id]
  );

  return rows.length > 0 ? rows[0] : null;
};

// =====================================================
// CREATE LOCAL USER
// =====================================================
const createLocalUser = async ({
  name,
  email,
  phone,
  hashedPassword,
}) => {
  const [result] = await pool.query(
    `INSERT INTO users
      (name, email, phone, password, provider)
     VALUES (?, ?, ?, ?, 'local')`,
    [
      name,
      email,
      phone,
      hashedPassword,
    ]
  );

  return findById(result.insertId);
};

// =====================================================
// CREATE GOOGLE USER
// =====================================================
// Phone is NULL initially because Google login does not
// normally provide the user's phone number.
const createGoogleUser = async ({
  name,
  email,
  googleId,
  avatar,
}) => {
  const [result] = await pool.query(
    `INSERT INTO users
      (name, email, google_id, avatar, provider)
     VALUES (?, ?, ?, ?, 'google')`,
    [
      name,
      email,
      googleId,
      avatar || null,
    ]
  );

  return findById(result.insertId);
};

// =====================================================
// LINK GOOGLE ACCOUNT
// =====================================================
const linkGoogleId = async (
  userId,
  googleId,
  avatar
) => {
  await pool.query(
    `UPDATE users
     SET
       google_id = ?,
       avatar = COALESCE(?, avatar)
     WHERE id = ?`,
    [
      googleId,
      avatar || null,
      userId,
    ]
  );

  return findById(userId);
};

// =====================================================
// UPDATE PHONE NUMBER
// =====================================================
const updatePhone = async (userId, phone) => {
  await pool.query(
    `UPDATE users
     SET phone = ?
     WHERE id = ?`,
    [
      phone,
      userId,
    ]
  );

  return findById(userId);
};

// =====================================================
// EXPORT
// =====================================================
module.exports = {
  findByEmail,
  findByGoogleId,
  findById,
  createLocalUser,
  createGoogleUser,
  linkGoogleId,
  updatePhone,
};