const pool = require("../config/db");

// Ensures a cart row exists for the given user, returns the cart's id.
// user_id is stored as a plain INT (no FK — no users table in this DB).
const getOrCreateCart = async (userId) => {
  const [rows] = await pool.query(`SELECT id FROM carts WHERE user_id = ?`, [userId]);
  if (rows.length > 0) return rows[0].id;

  const [result] = await pool.query(`INSERT INTO carts (user_id) VALUES (?)`, [userId]);
  return result.insertId;
};

// Fetches the full cart for a user, with product + variant details joined
// so the frontend (CartDrawer) can render name/image/price/category directly.
const getCartByUser = async (userId) => {
  const cartId = await getOrCreateCart(userId);

  const [items] = await pool.query(
    `SELECT
        ci.id AS item_id,
        ci.qty,
        p.id AS product_id,
        p.name,
        p.image,
        p.category,
        pv.id AS variant_id,
        pv.label AS variant,
        pv.unit,
        pv.price
     FROM cart_items ci
     JOIN products p ON p.id = ci.product_id
     JOIN product_variants pv ON pv.id = ci.variant_id
     WHERE ci.cart_id = ?
     ORDER BY ci.created_at DESC`,
    [cartId]
  );

  const mappedItems = items.map((item) => ({
    ...item,
    price: Number(item.price),
    qty: Number(item.qty),
  }));

  const subtotal = mappedItems.reduce((sum, item) => sum + item.price * item.qty, 0);

  return { cartId, items: mappedItems, subtotal };
};

// Adds an item, or bumps qty if that exact variant is already in the cart
// (relies on the uniq_cart_variant unique key + ON DUPLICATE KEY UPDATE).
const addItem = async (userId, { productId, variantId, qty = 1 }) => {
  const cartId = await getOrCreateCart(userId);

  await pool.query(
    `INSERT INTO cart_items (cart_id, product_id, variant_id, qty)
     VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE qty = qty + VALUES(qty)`,
    [cartId, productId, variantId, qty]
  );

  return getCartByUser(userId);
};

// Sets qty directly (used by the +/- stepper). qty <= 0 removes the item.
const updateItemQty = async (userId, itemId, qty) => {
  const cartId = await getOrCreateCart(userId);

  if (qty <= 0) {
    await pool.query(`DELETE FROM cart_items WHERE id = ? AND cart_id = ?`, [itemId, cartId]);
  } else {
    await pool.query(
      `UPDATE cart_items SET qty = ? WHERE id = ? AND cart_id = ?`,
      [qty, itemId, cartId]
    );
  }

  return getCartByUser(userId);
};

const removeItem = async (userId, itemId) => {
  const cartId = await getOrCreateCart(userId);
  await pool.query(`DELETE FROM cart_items WHERE id = ? AND cart_id = ?`, [itemId, cartId]);
  return getCartByUser(userId);
};

const clearCart = async (userId) => {
  const cartId = await getOrCreateCart(userId);
  await pool.query(`DELETE FROM cart_items WHERE cart_id = ?`, [cartId]);
  return { cartId, items: [], subtotal: 0 };
};

module.exports = { getCartByUser, addItem, updateItemQty, removeItem, clearCart };