const pool = require("../config/db");
const productModel = require("./productModel");

/* -------------------------------------------------------------------------
 * REQUIRED MIGRATION before this file works:
 *
 *   ALTER TABLE order_items
 *     ADD COLUMN subscription_start_date DATE NULL AFTER qty,
 *     ADD COLUMN subscription_end_date   DATE NULL AFTER subscription_start_date;
 *
 * These two columns are NULL for regular (weight/pc/ml) items and populated
 * only for Daily/Weekly/Monthly subscription items, so the order's item
 * rows carry their own delivery window instead of that info living only in
 * the frontend (which never reaches the backend/admin otherwise).
 * ---------------------------------------------------------------------- */

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

const ALLOWED_STATUSES = ["pending", "confirmed", "out_for_delivery", "delivered", "cancelled"];

// Subscription plan labels (must match the admin's UNIT_CONFIG fixedLabel
// values exactly: "1 Day", "1 Week", "1 Month") and how many days each runs.
const SUBSCRIPTION_PLAN_DAYS = {
  "1 Day": 1,
  "1 Week": 7,
  "1 Month": 30,
};

const toISODate = (d) => d.toISOString().split("T")[0];

// Computes { start, end } ISO date strings for a subscription item, based
// on the ORDER's delivery date (the single source of truth — never trusts
// any date the client might have pre-computed and sent up). Returns
// { start: null, end: null } for non-subscription variants.
const getSubscriptionWindow = (variantLabel, orderDeliveryDate) => {
  const days = SUBSCRIPTION_PLAN_DAYS[variantLabel];
  if (!days || !orderDeliveryDate) return { start: null, end: null };

  const start = new Date(orderDeliveryDate);
  const end = new Date(start);
  end.setDate(end.getDate() + days - 1);

  return { start: toISODate(start), end: toISODate(end) };
};

// Creates an order plus its item rows AND decrements product stock — all
// inside a single transaction, so if stock runs out partway through, the
// whole order (and any stock already decremented in this same call) rolls
// back together instead of leaving a partially-fulfilled order.
const createOrder = async (userId, orderData) => {
  const {
    name,
    mobile,
    email,
    address,
    city,
    pincode,
    deliveryDate,
    paymentMethod,
    subtotal,
    deliveryFee,
    total,
    items,
  } = orderData;

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // Decrement stock for every item FIRST — if any product doesn't have
    // enough stock, this throws INSUFFICIENT_STOCK and the whole
    // transaction rolls back before any order row is ever written.
    for (const item of items) {
      await productModel.decrementStockInTransaction(connection, item.productId, item.qty);
    }

    const [result] = await connection.query(
      `INSERT INTO orders
        (user_id, name, mobile, email, address, city, pincode,
         delivery_date, payment_method, subtotal, delivery_fee, total)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [userId, name, mobile, email, address, city, pincode, deliveryDate, paymentMethod, subtotal, deliveryFee, total]
    );
    const orderId = result.insertId;

    // Every item gets its subscription window computed server-side from
    // the item's own variant label + the order's delivery date. Regular
    // (weight/pc/ml) items simply get null/null here.
    const itemValues = items.map((item) => {
      const { start, end } = getSubscriptionWindow(item.variant, deliveryDate);
      return [
        orderId,
        item.productId,
        item.variantId,
        item.name,
        item.variant,
        item.image,
        item.price,
        item.qty,
        start,
        end,
      ];
    });

    await connection.query(
      `INSERT INTO order_items
        (order_id, product_id, variant_id, name, variant_label, image, price, qty,
         subscription_start_date, subscription_end_date)
       VALUES ?`,
      [itemValues]
    );

    await connection.commit();
    return withRetry(() => getOrderById(orderId, userId));
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
};

// Shared SELECT column list for order_items across every read function,
// so subscription fields are always returned consistently.
const ORDER_ITEMS_SELECT = `
  id, product_id, variant_id, name, variant_label AS variant, image, price, qty,
  subscription_start_date AS subscription_start,
  subscription_end_date AS subscription_end
`;

const mapItem = (i) => ({
  ...i,
  price: Number(i.price),
  qty: Number(i.qty),
  // Convenience flag so the frontend doesn't have to re-derive this from
  // the variant label — the backend already knows definitively.
  is_subscription: Boolean(i.subscription_start),
});

const getOrderById = async (orderId, userId) => {
  return withRetry(async () => {
    const [orders] = await pool.query(`SELECT * FROM orders WHERE id = ? AND user_id = ?`, [orderId, userId]);
    if (orders.length === 0) return null;

    const [items] = await pool.query(
      `SELECT ${ORDER_ITEMS_SELECT} FROM order_items WHERE order_id = ?`,
      [orderId]
    );

    return {
      ...orders[0],
      subtotal: Number(orders[0].subtotal),
      delivery_fee: Number(orders[0].delivery_fee),
      total: Number(orders[0].total),
      items: items.map(mapItem),
    };
  });
};

const getOrdersByUser = async (userId) => {
  return withRetry(async () => {
    const [orders] = await pool.query(`SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC`, [userId]);
    if (orders.length === 0) return [];

    const orderIds = orders.map((o) => o.id);
    const [items] = await pool.query(
      `SELECT order_id, ${ORDER_ITEMS_SELECT} FROM order_items WHERE order_id IN (?)`,
      [orderIds]
    );

    return orders.map((order) => ({
      ...order,
      subtotal: Number(order.subtotal),
      delivery_fee: Number(order.delivery_fee),
      total: Number(order.total),
      items: items.filter((i) => i.order_id === order.id).map(mapItem),
    }));
  });
};

const getAllOrders = async (filters = {}) => {
  return withRetry(async () => {
    const { status = "", search = "" } = filters;
    let sql = `SELECT * FROM orders WHERE 1=1`;
    const params = [];

    if (status && ALLOWED_STATUSES.includes(status)) {
      sql += ` AND status = ?`;
      params.push(status);
    }
    if (search) {
      sql += ` AND (name LIKE ? OR email LIKE ? OR mobile LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    sql += ` ORDER BY created_at DESC`;

    const [orders] = await pool.query(sql, params);
    if (orders.length === 0) return [];

    const orderIds = orders.map((o) => o.id);
    const [items] = await pool.query(
      `SELECT order_id, ${ORDER_ITEMS_SELECT} FROM order_items WHERE order_id IN (?)`,
      [orderIds]
    );

    return orders.map((order) => ({
      ...order,
      subtotal: Number(order.subtotal),
      delivery_fee: Number(order.delivery_fee),
      total: Number(order.total),
      items: items.filter((i) => i.order_id === order.id).map(mapItem),
    }));
  });
};

const getAnyOrderById = async (orderId) => {
  return withRetry(async () => {
    const [orders] = await pool.query(`SELECT * FROM orders WHERE id = ?`, [orderId]);
    if (orders.length === 0) return null;

    const [items] = await pool.query(
      `SELECT ${ORDER_ITEMS_SELECT} FROM order_items WHERE order_id = ?`,
      [orderId]
    );

    return {
      ...orders[0],
      subtotal: Number(orders[0].subtotal),
      delivery_fee: Number(orders[0].delivery_fee),
      total: Number(orders[0].total),
      items: items.map(mapItem),
    };
  });
};

// Updates order status. If moving INTO "cancelled" from any other status,
// restores stock for every item in the order — all inside one transaction
// so a failure partway through doesn't leave stock half-restored.
const updateOrderStatus = async (orderId, status) => {
  if (!ALLOWED_STATUSES.includes(status)) {
    throw new Error("Invalid order status");
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [existingRows] = await connection.query(`SELECT status FROM orders WHERE id = ?`, [orderId]);
    if (existingRows.length === 0) {
      await connection.rollback();
      return null;
    }
    const previousStatus = existingRows[0].status;

    await connection.query(`UPDATE orders SET status = ? WHERE id = ?`, [status, orderId]);

    // Only restore stock on the transition INTO cancelled — guards against
    // double-restoring stock if an order is somehow set to "cancelled" twice.
    if (status === "cancelled" && previousStatus !== "cancelled") {
      const [items] = await connection.query(
        `SELECT product_id, qty FROM order_items WHERE order_id = ?`,
        [orderId]
      );
      for (const item of items) {
        await productModel.incrementStockInTransaction(connection, item.product_id, item.qty);
      }
    }

    await connection.commit();
    return withRetry(() => getAnyOrderById(orderId));
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
};

module.exports = {
  createOrder,
  getOrderById,
  getOrdersByUser,
  getAllOrders,
  getAnyOrderById,
  updateOrderStatus,
};