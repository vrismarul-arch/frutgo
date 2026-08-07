const pool = require("../config/db");

const withRetry = async (fn, retries = 1) => {
  try {
    return await fn();
  } catch (err) {
    const isDroppedConnection =
      err.code === "ECONNRESET" ||
      err.code === "PROTOCOL_CONNECTION_LOST" ||
      err.fatal === true;

    if (retries > 0 && isDroppedConnection) {
      console.warn(`DB connection dropped (${err.code}), retrying...`);
      return withRetry(fn, retries - 1);
    }
    throw err;
  }
};

// ... findAll, findSpecialOffers, findById, create, update stay exactly as they are ...

const findAll = async (search = "") => {
  return withRetry(async () => {
    let sql = `
      SELECT p.id, p.name, p.category, p.image, p.stock, p.status,
             p.is_special_offer, p.discount_percent,
             p.created_at, p.updated_at
      FROM products p
    `;
    const params = [];

    if (search) {
      sql += ` WHERE p.name LIKE ? OR p.category LIKE ? `;
      params.push(`%${search}%`, `%${search}%`);
    }

    sql += ` ORDER BY p.created_at DESC`;

    const [products] = await pool.query(sql, params);
    if (products.length === 0) return [];

    const productIds = products.map((p) => p.id);
    const [variants] = await pool.query(
      `SELECT id, product_id, unit, label, price FROM product_variants WHERE product_id IN (?)`,
      [productIds]
    );

    return products.map((product) => ({
      ...product,
      is_special_offer: !!product.is_special_offer,
      discount_percent: Number(product.discount_percent),
      variants: variants
        .filter((v) => v.product_id === product.id)
        .map((v) => ({ id: v.id, unit: v.unit, label: v.label, price: Number(v.price) })),
    }));
  });
};

const findSpecialOffers = async () => {
  return withRetry(async () => {
    const sql = `
      SELECT p.id, p.name, p.category, p.image, p.stock, p.status,
             p.is_special_offer, p.discount_percent,
             p.created_at, p.updated_at
      FROM products p
      WHERE p.is_special_offer = TRUE
        AND p.status = 'active'
      ORDER BY p.discount_percent DESC, p.created_at DESC
    `;
    const [products] = await pool.query(sql);
    if (products.length === 0) return [];

    const productIds = products.map((p) => p.id);
    const [variants] = await pool.query(
      `SELECT id, product_id, unit, label, price FROM product_variants WHERE product_id IN (?)`,
      [productIds]
    );

    return products.map((product) => ({
      ...product,
      is_special_offer: !!product.is_special_offer,
      discount_percent: Number(product.discount_percent),
      variants: variants
        .filter((v) => v.product_id === product.id)
        .map((v) => ({ id: v.id, unit: v.unit, label: v.label, price: Number(v.price) })),
    }));
  });
};

const findById = async (id) => {
  return withRetry(async () => {
    const [rows] = await pool.query(`SELECT * FROM products WHERE id = ?`, [id]);
    if (rows.length === 0) return null;

    const [variants] = await pool.query(
      `SELECT id, unit, label, price FROM product_variants WHERE product_id = ?`,
      [id]
    );

    return {
      ...rows[0],
      is_special_offer: !!rows[0].is_special_offer,
      discount_percent: Number(rows[0].discount_percent),
      variants: variants.map((v) => ({ id: v.id, unit: v.unit, label: v.label, price: Number(v.price) })),
    };
  });
};

const create = async ({ name, category, image, stock, status, variants, is_special_offer = false, discount_percent = 0 }) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [result] = await connection.query(
      `INSERT INTO products (name, category, image, stock, status, is_special_offer, discount_percent)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [name, category, image, stock, status, !!is_special_offer, Number(discount_percent) || 0]
    );
    const productId = result.insertId;

    if (variants && variants.length > 0) {
      const values = variants.map((v) => [productId, v.unit === "pc" ? "pc" : "weight", v.label, v.price]);
      await connection.query(
        `INSERT INTO product_variants (product_id, unit, label, price) VALUES ?`,
        [values]
      );
    }

    await connection.commit();
    return findById(productId);
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
};

const update = async (id, { name, category, image, stock, status, variants, is_special_offer = false, discount_percent = 0 }) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    await connection.query(
      `UPDATE products
       SET name = ?, category = ?, image = ?, stock = ?, status = ?,
           is_special_offer = ?, discount_percent = ?
       WHERE id = ?`,
      [name, category, image, stock, status, !!is_special_offer, Number(discount_percent) || 0, id]
    );

    await connection.query(`DELETE FROM product_variants WHERE product_id = ?`, [id]);

    if (variants && variants.length > 0) {
      const values = variants.map((v) => [id, v.unit === "pc" ? "pc" : "weight", v.label, v.price]);
      await connection.query(
        `INSERT INTO product_variants (product_id, unit, label, price) VALUES ?`,
        [values]
      );
    }

    await connection.commit();
    return findById(id);
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
};

const remove = async (id) => {
  return withRetry(async () => {
    const [result] = await pool.query(`DELETE FROM products WHERE id = ?`, [id]);
    return result.affectedRows > 0;
  });
};

// ---- Stock adjustment (new) ----

// Decrements stock for a single product within an EXISTING transaction
// (must be called with a `connection`, not the pool, so it's part of the
// same atomic operation as order creation). Throws if stock would go
// negative — this is what prevents overselling when two customers
// checkout the same low-stock item at nearly the same time, since the
// row lock from this UPDATE serializes concurrent attempts.
const decrementStockInTransaction = async (connection, productId, qty) => {
  const [result] = await connection.query(
    `UPDATE products SET stock = stock - ? WHERE id = ? AND stock >= ?`,
    [qty, productId, qty]
  );
  if (result.affectedRows === 0) {
    const err = new Error("INSUFFICIENT_STOCK");
    err.code = "INSUFFICIENT_STOCK";
    err.productId = productId;
    throw err;
  }
};

// Restores stock for a single product — used when an order is cancelled.
const incrementStockInTransaction = async (connection, productId, qty) => {
  await connection.query(`UPDATE products SET stock = stock + ? WHERE id = ?`, [qty, productId]);
};

module.exports = {
  findAll,
  findSpecialOffers,
  findById,
  create,
  update,
  remove,
  decrementStockInTransaction,
  incrementStockInTransaction,
};