// ============================================================
// models/orderModel.js
// COMPLETE ORDER MODEL
// UTC TIME SAFE
// ============================================================

const pool = require("../config/db");
const productModel = require("./productModel");

// ============================================================
// CONFIG
// ============================================================

const DELIVERY_TIME_MINUTES = 45;

const DELIVERY_TIME_MS =
  DELIVERY_TIME_MINUTES *
  60 *
  1000;

const ALLOWED_STATUSES = [
  "pending",
  "confirmed",
  "out_for_delivery",
  "delivered",
  "cancelled",
];

// ============================================================
// SUBSCRIPTION PLANS
// ============================================================

const SUBSCRIPTION_PLAN_DAYS = {
  "1 Day": 1,
  "1 Week": 7,
  "1 Month": 30,
};

// ============================================================
// RETRY
// ============================================================

const withRetry = async (
  fn,
  retries = 1
) => {
  try {
    return await fn();
  } catch (err) {
    const connectionDropped =
      err.code === "ECONNRESET" ||
      err.code ===
        "PROTOCOL_CONNECTION_LOST" ||
      err.fatal === true;

    if (
      retries > 0 &&
      connectionDropped
    ) {
      console.warn(
        `Database connection dropped (${err.code}), retrying...`
      );

      return withRetry(
        fn,
        retries - 1
      );
    }

    throw err;
  }
};

// ============================================================
// DATABASE UTC DATETIME -> ISO UTC
// ============================================================

const dbUTCToISO = (
  value
) => {
  if (!value) {
    return null;
  }

  // mysql2 can return Date
  if (value instanceof Date) {
    return value.toISOString();
  }

  const valueString =
    String(value).trim();

  if (!valueString) {
    return null;
  }

  // Already ISO UTC
  if (
    valueString.endsWith("Z")
  ) {
    const date =
      new Date(valueString);

    if (
      Number.isNaN(
        date.getTime()
      )
    ) {
      return null;
    }

    return date.toISOString();
  }

  // MySQL:
  // 2026-08-21 13:54:27.321
  //
  // Convert to:
  // 2026-08-21T13:54:27.321Z

  const isoString =
    valueString.replace(
      " ",
      "T"
    ) + "Z";

  const date =
    new Date(isoString);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return null;
  }

  return date.toISOString();
};

// ============================================================
// DATE ONLY
// ============================================================

const toISODate = (
  date
) =>
  date
    .toISOString()
    .split("T")[0];

// ============================================================
// SUBSCRIPTION WINDOW
// ============================================================

const getSubscriptionWindow = (
  variantLabel,
  orderDeliveryDate
) => {
  const days =
    SUBSCRIPTION_PLAN_DAYS[
      variantLabel
    ];

  if (
    !days ||
    !orderDeliveryDate
  ) {
    return {
      start: null,
      end: null,
    };
  }

  const start =
    new Date(
      `${orderDeliveryDate}T00:00:00.000Z`
    );

  const end =
    new Date(start);

  end.setUTCDate(
    end.getUTCDate() +
      days -
      1
  );

  return {
    start:
      toISODate(start),

    end:
      toISODate(end),
  };
};

// ============================================================
// CREATE ORDER
// ============================================================

const createOrder = async (
  userId,
  orderData
) => {
  const {
    name,
    mobile,
    email,
    address,
    addressLine2,
    city,
    state,
    pincode,
    deliveryDate,
    paymentMethod,
    subtotal,
    deliveryFee,
    total,
    items,
  } = orderData;

  const connection =
    await pool.getConnection();

  try {
    await connection.beginTransaction();

    // ========================================================
    // STOCK
    // ========================================================

    for (const item of items) {
      await productModel.decrementStockInTransaction(
        connection,
        item.productId,
        item.qty
      );
    }

    // ========================================================
    // CREATE ORDER
    // ========================================================
    //
    // DO NOT USE:
    //
    // new Date() from frontend
    //
    // DO NOT USE:
    //
    // NOW()
    //
    // Use:
    //
    // UTC_TIMESTAMP(3)
    //
    // This is the authoritative booking time.
    // ========================================================

    const [result] =
      await connection.query(
        `
        INSERT INTO orders
        (
          user_id,
          name,
          mobile,
          email,
          address,
          address_line2,
          city,
          state,
          pincode,
          delivery_date,
          payment_method,
          subtotal,
          delivery_fee,
          total,
          booked_at
        )
        VALUES
        (
          ?,
          ?,
          ?,
          ?,
          ?,
          ?,
          ?,
          ?,
          ?,
          ?,
          ?,
          ?,
          ?,
          ?,
          UTC_TIMESTAMP(3)
        )
        `,
        [
          userId,

          name,

          mobile,

          email,

          address,

          addressLine2 || "",

          city,

          state || "",

          pincode,

          deliveryDate,

          paymentMethod,

          subtotal,

          deliveryFee,

          total,
        ]
      );

    const orderId =
      result.insertId;

    // ========================================================
    // ORDER ITEMS
    // ========================================================

    const itemValues =
      items.map((item) => {
        const {
          start,
          end,
        } =
          getSubscriptionWindow(
            item.variant,
            deliveryDate
          );

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

    if (
      itemValues.length > 0
    ) {
      await connection.query(
        `
        INSERT INTO order_items
        (
          order_id,
          product_id,
          variant_id,
          name,
          variant_label,
          image,
          price,
          qty,
          subscription_start_date,
          subscription_end_date
        )
        VALUES ?
        `,
        [itemValues]
      );
    }

    // ========================================================
    // COMMIT
    // ========================================================

    await connection.commit();

    // ========================================================
    // RETURN FRESH ORDER
    // ========================================================

    return withRetry(
      () =>
        getOrderById(
          orderId,
          userId
        )
    );
  } catch (error) {
    try {
      await connection.rollback();
    } catch {}

    throw error;
  } finally {
    connection.release();
  }
};

// ============================================================
// ORDER ITEM SELECT
// ============================================================

const ORDER_ITEMS_SELECT = `
  id,
  product_id,
  variant_id,
  name,
  variant_label AS variant,
  image,
  price,
  qty,
  subscription_start_date AS subscription_start,
  subscription_end_date AS subscription_end
`;

// ============================================================
// MAP ITEM
// ============================================================

const mapItem = (
  item
) => ({
  ...item,

  price:
    Number(item.price) || 0,

  qty:
    Number(item.qty) || 0,

  is_subscription:
    Boolean(
      item.subscription_start
    ),
});

// ============================================================
// MAP ORDER
// ============================================================

const mapOrder = (
  order,
  items
) => {
  // ========================================================
  // BOOKING TIME
  // ========================================================

  const rawBookedAt =
    order.booked_at ||
    order.created_at;

  const bookedAt =
    dbUTCToISO(
      rawBookedAt
    );

  // ========================================================
  // EXPECTED DELIVERY
  // ========================================================

  let expectedDeliveryAt =
    null;

  if (bookedAt) {
    const bookedMilliseconds =
      new Date(
        bookedAt
      ).getTime();

    if (
      !Number.isNaN(
        bookedMilliseconds
      )
    ) {
      expectedDeliveryAt =
        new Date(
          bookedMilliseconds +
            DELIVERY_TIME_MS
        ).toISOString();
    }
  }

  // ========================================================
  // RETURN
  // ========================================================

  return {
    ...order,

    id: order.id,

    user_id:
      order.user_id,

    name:
      order.name || "",

    mobile:
      order.mobile || "",

    email:
      order.email || "",

    address:
      order.address || "",

    address_line2:
      order.address_line2 ||
      "",

    city:
      order.city || "",

    state:
      order.state || "",

    pincode:
      order.pincode || "",

    payment_method:
      order.payment_method ||
      "cod",

    subtotal:
      Number(
        order.subtotal
      ) || 0,

    delivery_fee:
      Number(
        order.delivery_fee
      ) || 0,

    total:
      Number(
        order.total
      ) || 0,

    status:
      order.status ||
      "pending",

    created_at:
      dbUTCToISO(
        order.created_at
      ),

    updated_at:
      dbUTCToISO(
        order.updated_at
      ),

    delivery_date:
      order.delivery_date ||
      null,

    // ======================================================
    // AUTHORITATIVE BOOKING TIME
    // ======================================================

    booked_at:
      bookedAt,

    delivery_time_minutes:
      DELIVERY_TIME_MINUTES,

    expected_delivery_at:
      expectedDeliveryAt,

    // ======================================================
    // REVIEW
    // ======================================================

    review_rating:
      order.review_rating
        ? Number(
            order.review_rating
          )
        : null,

    review_text:
      order.review_text ||
      null,

    reviewed_at:
      dbUTCToISO(
        order.reviewed_at
      ),

    // ======================================================
    // ITEMS
    // ======================================================

    items:
      items.map(mapItem),
  };
};

// ============================================================
// GET ORDER BY ID
// ============================================================

const getOrderById = async (
  orderId,
  userId
) => {
  return withRetry(
    async () => {
      const [orders] =
        await pool.query(
          `
          SELECT *
          FROM orders
          WHERE id = ?
          AND user_id = ?
          `,
          [
            orderId,
            userId,
          ]
        );

      if (
        orders.length === 0
      ) {
        return null;
      }

      const [items] =
        await pool.query(
          `
          SELECT
            ${ORDER_ITEMS_SELECT}
          FROM order_items
          WHERE order_id = ?
          `,
          [orderId]
        );

      return mapOrder(
        orders[0],
        items
      );
    }
  );
};

// ============================================================
// GET USER ORDERS
// ============================================================

const getOrdersByUser =
  async (userId) => {
    return withRetry(
      async () => {
        const [orders] =
          await pool.query(
            `
            SELECT *
            FROM orders
            WHERE user_id = ?
            ORDER BY created_at DESC
            `,
            [userId]
          );

        if (
          orders.length === 0
        ) {
          return [];
        }

        const orderIds =
          orders.map(
            (order) =>
              order.id
          );

        const [items] =
          await pool.query(
            `
            SELECT
              order_id,
              ${ORDER_ITEMS_SELECT}
            FROM order_items
            WHERE order_id IN (?)
            `,
            [orderIds]
          );

        return orders.map(
          (order) => {
            const orderItems =
              items.filter(
                (item) =>
                  item.order_id ===
                  order.id
              );

            return mapOrder(
              order,
              orderItems
            );
          }
        );
      }
    );
  };

// ============================================================
// GET ALL ORDERS - ADMIN
// ============================================================

const getAllOrders =
  async (filters = {}) => {
    return withRetry(
      async () => {
        const {
          status = "",
          search = "",
        } = filters;

        let sql = `
          SELECT *
          FROM orders
          WHERE 1 = 1
        `;

        const params = [];

        if (
          status &&
          ALLOWED_STATUSES.includes(
            status
          )
        ) {
          sql += `
            AND status = ?
          `;

          params.push(status);
        }

        if (search) {
          sql += `
            AND (
              name LIKE ?
              OR email LIKE ?
              OR mobile LIKE ?
            )
          `;

          params.push(
            `%${search}%`,
            `%${search}%`,
            `%${search}%`
          );
        }

        sql += `
          ORDER BY created_at DESC
        `;

        const [orders] =
          await pool.query(
            sql,
            params
          );

        if (
          orders.length === 0
        ) {
          return [];
        }

        const orderIds =
          orders.map(
            (order) =>
              order.id
          );

        const [items] =
          await pool.query(
            `
            SELECT
              order_id,
              ${ORDER_ITEMS_SELECT}
            FROM order_items
            WHERE order_id IN (?)
            `,
            [orderIds]
          );

        return orders.map(
          (order) => {
            const orderItems =
              items.filter(
                (item) =>
                  item.order_id ===
                  order.id
              );

            return mapOrder(
              order,
              orderItems
            );
          }
        );
      }
    );
  };

// ============================================================
// GET ANY ORDER BY ID - ADMIN
// ============================================================

const getAnyOrderById =
  async (orderId) => {
    return withRetry(
      async () => {
        const [orders] =
          await pool.query(
            `
            SELECT *
            FROM orders
            WHERE id = ?
            `,
            [orderId]
          );

        if (
          orders.length === 0
        ) {
          return null;
        }

        const [items] =
          await pool.query(
            `
            SELECT
              ${ORDER_ITEMS_SELECT}
            FROM order_items
            WHERE order_id = ?
            `,
            [orderId]
          );

        return mapOrder(
          orders[0],
          items
        );
      }
    );
  };

// ============================================================
// UPDATE ORDER STATUS
// ============================================================

const updateOrderStatus =
  async (
    orderId,
    status
  ) => {
    if (
      !ALLOWED_STATUSES.includes(
        status
      )
    ) {
      throw new Error(
        "Invalid order status"
      );
    }

    const connection =
      await pool.getConnection();

    try {
      await connection.beginTransaction();

      const [
        existingRows,
      ] =
        await connection.query(
          `
          SELECT status
          FROM orders
          WHERE id = ?
          `,
          [orderId]
        );

      if (
        existingRows.length ===
        0
      ) {
        await connection.rollback();

        return null;
      }

      const previousStatus =
        existingRows[0].status;

      await connection.query(
        `
        UPDATE orders
        SET status = ?
        WHERE id = ?
        `,
        [
          status,
          orderId,
        ]
      );

      // ======================================================
      // RESTORE STOCK
      // ======================================================

      if (
        status ===
          "cancelled" &&
        previousStatus !==
          "cancelled"
      ) {
        const [items] =
          await connection.query(
            `
            SELECT
              product_id,
              qty
            FROM order_items
            WHERE order_id = ?
            `,
            [orderId]
          );

        for (const item of items) {
          await productModel.incrementStockInTransaction(
            connection,
            item.product_id,
            item.qty
          );
        }
      }

      await connection.commit();

      return withRetry(
        () =>
          getAnyOrderById(
            orderId
          )
      );
    } catch (error) {
      try {
        await connection.rollback();
      } catch {}

      throw error;
    } finally {
      connection.release();
    }
  };

// ============================================================
// REVIEW
// ============================================================

const addOrderReview =
  async (
    orderId,
    userId,
    rating,
    reviewText
  ) => {
    const [result] =
      await pool.query(
        `
        UPDATE orders
        SET
          review_rating = ?,
          review_text = ?,
          reviewed_at = UTC_TIMESTAMP(3)
        WHERE id = ?
        AND user_id = ?
        AND status = 'delivered'
        `,
        [
          rating,
          reviewText || null,
          orderId,
          userId,
        ]
      );

    if (
      result.affectedRows === 0
    ) {
      return null;
    }

    return getOrderById(
      orderId,
      userId
    );
  };

// ============================================================
// EXPORT
// ============================================================

module.exports = {
  DELIVERY_TIME_MINUTES,

  createOrder,

  getOrderById,

  getOrdersByUser,

  getAllOrders,

  getAnyOrderById,

  updateOrderStatus,

  addOrderReview,
};