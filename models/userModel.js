const pool = require("../config/db");

const TABLE = "users";

const PUBLIC_FIELDS =
  "id, name, email, mobileNumber, role, status, createdAt, updatedAt";

const UserModel = {
  async findAll() {
    const [rows] = await pool.query(
      `SELECT ${PUBLIC_FIELDS} FROM ${TABLE} ORDER BY createdAt DESC`
    );
    return rows;
  },

  async findById(id) {
    const [rows] = await pool.query(
      `SELECT ${PUBLIC_FIELDS} FROM ${TABLE} WHERE id = ? LIMIT 1`,
      [id]
    );
    return rows[0] || null;
  },

  async findByEmail(email, excludeId = null) {
    const query = excludeId
      ? `SELECT id FROM ${TABLE} WHERE email = ? AND id != ? LIMIT 1`
      : `SELECT id FROM ${TABLE} WHERE email = ? LIMIT 1`;
    const params = excludeId ? [email, excludeId] : [email];
    const [rows] = await pool.query(query, params);
    return rows[0] || null;
  },

  async findAuthByEmail(email) {
    // includes password hash, used only for login/auth checks
    const [rows] = await pool.query(
      `SELECT id, name, email, password, role, status FROM ${TABLE} WHERE email = ? LIMIT 1`,
      [email]
    );
    return rows[0] || null;
  },

  async create({ name, email, mobileNumber, role, password, status }) {
    const [result] = await pool.query(
      `INSERT INTO ${TABLE} (name, email, mobileNumber, role, password, status)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [name, email, mobileNumber, role, password, status || "Active"]
    );
    return this.findById(result.insertId);
  },

  async update(id, fields) {
    const allowed = ["name", "email", "mobileNumber", "role", "password", "status"];
    const keys = Object.keys(fields).filter((k) => allowed.includes(k));

    if (keys.length === 0) return this.findById(id);

    const setClause = keys.map((k) => `${k} = ?`).join(", ");
    const values = keys.map((k) => fields[k]);
    values.push(id);

    await pool.query(`UPDATE ${TABLE} SET ${setClause} WHERE id = ?`, values);
    return this.findById(id);
  },

  async remove(id) {
    const [result] = await pool.query(`DELETE FROM ${TABLE} WHERE id = ?`, [id]);
    return result.affectedRows > 0;
  },
};

module.exports = UserModel;
