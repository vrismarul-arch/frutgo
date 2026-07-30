const pool = require("../config/db");

const TABLE = "businesses";

const BusinessModel = {
  async findAll() {
    const [rows] = await pool.query(`SELECT * FROM ${TABLE} ORDER BY name ASC`);
    return rows;
  },

  async findById(id) {
    const [rows] = await pool.query(`SELECT * FROM ${TABLE} WHERE id = ? LIMIT 1`, [id]);
    return rows[0] || null;
  },

  async findByName(name, excludeId = null) {
    const query = excludeId
      ? `SELECT id FROM ${TABLE} WHERE name = ? AND id != ? LIMIT 1`
      : `SELECT id FROM ${TABLE} WHERE name = ? LIMIT 1`;
    const params = excludeId ? [name, excludeId] : [name];
    const [rows] = await pool.query(query, params);
    return rows[0] || null;
  },

  async create({ name }) {
    const [result] = await pool.query(`INSERT INTO ${TABLE} (name) VALUES (?)`, [name]);
    return this.findById(result.insertId);
  },

  async update(id, { name }) {
    await pool.query(`UPDATE ${TABLE} SET name = ? WHERE id = ?`, [name, id]);
    return this.findById(id);
  },

  async remove(id) {
    const [result] = await pool.query(`DELETE FROM ${TABLE} WHERE id = ?`, [id]);
    return result.affectedRows > 0;
  },
};

module.exports = BusinessModel;
