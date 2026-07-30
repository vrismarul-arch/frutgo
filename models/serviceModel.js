const pool = require("../config/db");

const TABLE = "services";

function normalizeRow(row) {
  if (!row) return row;
  return {
    ...row,
    plans: Array.isArray(row.plans) ? row.plans : row.plans ? JSON.parse(row.plans) : [],
  };
}

const ServiceModel = {
  async findAll() {
    const [rows] = await pool.query(`SELECT * FROM ${TABLE} ORDER BY createdAt DESC`);
    return rows.map(normalizeRow);
  },

  async findById(id) {
    const [rows] = await pool.query(`SELECT * FROM ${TABLE} WHERE id = ? LIMIT 1`, [id]);
    return normalizeRow(rows[0]) || null;
  },

  async create({ serviceName, category, status, plans }) {
    const [result] = await pool.query(
      `INSERT INTO ${TABLE} (serviceName, category, status, plans) VALUES (?, ?, ?, ?)`,
      [serviceName, category, status || "Active", JSON.stringify(plans || [])]
    );
    return this.findById(result.insertId);
  },

  async update(id, { serviceName, category, status, plans }) {
    const fields = [];
    const values = [];

    if (serviceName !== undefined) {
      fields.push("serviceName = ?");
      values.push(serviceName);
    }
    if (category !== undefined) {
      fields.push("category = ?");
      values.push(category);
    }
    if (status !== undefined) {
      fields.push("status = ?");
      values.push(status);
    }
    if (plans !== undefined) {
      fields.push("plans = ?");
      values.push(JSON.stringify(plans || []));
    }

    if (fields.length === 0) return this.findById(id);

    values.push(id);
    await pool.query(`UPDATE ${TABLE} SET ${fields.join(", ")} WHERE id = ?`, values);
    return this.findById(id);
  },

  async remove(id) {
    const [result] = await pool.query(`DELETE FROM ${TABLE} WHERE id = ?`, [id]);
    return result.affectedRows > 0;
  },
};

module.exports = ServiceModel;