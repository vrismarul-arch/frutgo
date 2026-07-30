const pool = require("../config/db");

const TABLE = "leads";

const FIELDS = `
  l.id, l.businessName, l.gstNumber, l.primaryContactName, l.email, l.mobileNumber,
  l.typeOfLeads, l.addressLine1, l.addressLine2, l.city, l.state, l.pincode, l.country,
  l.accountStatus, l.sourceType, l.referralPersonName, l.basicServices, l.addonServices,
  l.addNote, l.assignedTo, u.name AS assignedToName,
  l.createdAt, l.updatedAt
`;

// mysql2 auto-parses JSON columns, but guard against null/legacy string rows
function normalizeRow(row) {
  if (!row) return row;
  return {
    ...row,
    basicServices: Array.isArray(row.basicServices)
      ? row.basicServices
      : row.basicServices
      ? JSON.parse(row.basicServices)
      : [],
    addonServices: Array.isArray(row.addonServices)
      ? row.addonServices
      : row.addonServices
      ? JSON.parse(row.addonServices)
      : [],
  };
}

const LeadModel = {
  // filter: { assignedTo?: number } — pass assignedTo to restrict to one staff member's leads
  async findAll(filter = {}) {
    let query = `
      SELECT ${FIELDS}
      FROM ${TABLE} l
      LEFT JOIN users u ON l.assignedTo = u.id
    `;
    const params = [];

    if (filter.assignedTo) {
      query += ` WHERE l.assignedTo = ?`;
      params.push(filter.assignedTo);
    }

    query += ` ORDER BY l.createdAt DESC`;

    const [rows] = await pool.query(query, params);
    return rows.map(normalizeRow);
  },

  async findById(id) {
    const [rows] = await pool.query(
      `SELECT ${FIELDS} FROM ${TABLE} l LEFT JOIN users u ON l.assignedTo = u.id WHERE l.id = ? LIMIT 1`,
      [id]
    );
    return normalizeRow(rows[0]) || null;
  },

  async create(data) {
    const [result] = await pool.query(
      `INSERT INTO ${TABLE} (
        businessName, gstNumber, primaryContactName, email, mobileNumber,
        typeOfLeads, addressLine1, addressLine2, city, state, pincode, country,
        accountStatus, sourceType, referralPersonName, basicServices, addonServices, addNote,
        assignedTo
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.businessName || null,
        data.gstNumber || null,
        data.primaryContactName,
        data.email,
        data.mobileNumber,
        data.typeOfLeads,
        data.addressLine1,
        data.addressLine2 || null,
        data.city,
        data.state,
        data.pincode,
        data.country || "India",
        data.accountStatus || "Lead",
        data.sourceType,
        data.sourceType === "Referral" ? data.referralPersonName : null,
        JSON.stringify(data.basicServices || []),
        JSON.stringify(data.addonServices || []),
        data.addNote || null,
        data.assignedTo || null,
      ]
    );
    return this.findById(result.insertId);
  },

  async update(id, data) {
    const allowed = [
      "businessName",
      "gstNumber",
      "primaryContactName",
      "email",
      "mobileNumber",
      "typeOfLeads",
      "addressLine1",
      "addressLine2",
      "city",
      "state",
      "pincode",
      "country",
      "accountStatus",
      "sourceType",
      "referralPersonName",
      "basicServices",
      "addonServices",
      "addNote",
      "assignedTo",
    ];
    const keys = Object.keys(data).filter((k) => allowed.includes(k));
    if (keys.length === 0) return this.findById(id);

    // clear referral name when source type isn't Referral
    if (data.sourceType && data.sourceType !== "Referral" && !keys.includes("referralPersonName")) {
      keys.push("referralPersonName");
      data.referralPersonName = null;
    }

    const setClause = keys.map((k) => `${k} = ?`).join(", ");
    const values = keys.map((k) => {
      if (k === "basicServices" || k === "addonServices") {
        return JSON.stringify(data[k] || []);
      }
      if (k === "assignedTo") {
        return data[k] || null;
      }
      return data[k];
    });
    values.push(id);

    await pool.query(`UPDATE ${TABLE} SET ${setClause} WHERE id = ?`, values);
    return this.findById(id);
  },

  async remove(id) {
    const [result] = await pool.query(`DELETE FROM ${TABLE} WHERE id = ?`, [id]);
    return result.affectedRows > 0;
  },
};

module.exports = LeadModel;