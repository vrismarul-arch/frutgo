// ============================================================
// controllers/orderController.js
// ORDER CONTROLLER
// Firebase / Push Notification Removed
// ============================================================

const orderModel = require("../models/orderModel");
const cartModel = require("../models/cartModel");

// ============================================================
// CONFIG
// ============================================================

const DELIVERY_TIME_MINUTES = 45;

// ============================================================
// FREE DELIVERY (fruit salads on the weekly plan)
// ============================================================
//
// Mirrors the rule used on the frontend (CartDrawer.jsx /
// Checkout.jsx) so the price the backend actually charges always
// matches what the customer saw before placing the order. Only a
// cart made up entirely of fruit-salad items on the "1 Week" plan
// gets delivery free regardless of subtotal; "1 Day" / "1 Month"
// fruit salad items fall back to the normal freeDeliveryAbove
// threshold, same as any other item.
// ============================================================

const FREE_DELIVERY_CATEGORIES = ["fruit salads", "salad", "salads"];
const FREE_DELIVERY_VARIANT = "1 Week";

const isWeeklyVariant = (variant = "") =>
  String(variant).trim().toLowerCase() ===
  FREE_DELIVERY_VARIANT.toLowerCase();

const isFreeDeliveryEligible = (cartItems = []) =>
  cartItems.length > 0 &&
  cartItems.every((item) => {
    const isFreeCategory = FREE_DELIVERY_CATEGORIES.includes(
      String(item.category || "").trim().toLowerCase()
    );

    return isFreeCategory && isWeeklyVariant(item.variant);
  });

// ============================================================
// VALIDATE ORDER
// ============================================================

const validateOrderBody = (body = {}) => {
  const errors = {};

  // ----------------------------------------------------------
  // NAME
  // ----------------------------------------------------------

  if (!body.name || !String(body.name).trim()) {
    errors.name = "Name is required";
  }

  // ----------------------------------------------------------
  // MOBILE
  // ----------------------------------------------------------

  if (
    !body.mobile ||
    !/^[6-9]\d{9}$/.test(String(body.mobile).trim())
  ) {
    errors.mobile = "Enter a valid 10-digit mobile number";
  }

  // ----------------------------------------------------------
  // EMAIL
  // ----------------------------------------------------------

  if (
    !body.email ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
      String(body.email).trim()
    )
  ) {
    errors.email = "Enter a valid email address";
  }

  // ----------------------------------------------------------
  // ADDRESS
  // ----------------------------------------------------------

  if (!body.address || !String(body.address).trim()) {
    errors.address = "Delivery address is required";
  }

  // ----------------------------------------------------------
  // CITY
  // ----------------------------------------------------------

  if (!body.city || !String(body.city).trim()) {
    errors.city = "City is required";
  }

  // ----------------------------------------------------------
  // PINCODE
  // ----------------------------------------------------------

  if (
    !body.pincode ||
    !/^\d{6}$/.test(String(body.pincode).trim())
  ) {
    errors.pincode = "Enter a valid 6-digit pincode";
  }

  // ----------------------------------------------------------
  // DELIVERY DATE
  // ----------------------------------------------------------

  if (!body.deliveryDate) {
    errors.deliveryDate = "Select a delivery date";
  }

  // ----------------------------------------------------------
  // PAYMENT
  // ----------------------------------------------------------

  if (
    !body.paymentMethod ||
    !["upi", "cod"].includes(body.paymentMethod)
  ) {
    errors.paymentMethod = "Select a valid payment method";
  }

  return errors;
};

// ============================================================
// PLACE ORDER
// ============================================================

const placeOrder = async (req, res) => {
  const errors = validateOrderBody(req.body);

  if (Object.keys(errors).length > 0) {
    return res.status(400).json({
      errors,
    });
  }

  try {
    // ========================================================
    // USER
    // ========================================================

    const userId = req.user.id;

    // ========================================================
    // CART
    // ========================================================

    const cart = await cartModel.getCartByUser(userId);

    if (
      !cart ||
      !Array.isArray(cart.items) ||
      cart.items.length === 0
    ) {
      return res.status(400).json({
        message: "Your cart is empty",
      });
    }

    // ========================================================
    // BODY
    // ========================================================

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
    } = req.body;

    // ========================================================
    // PAYMENT
    // ========================================================

    if (paymentMethod !== "cod") {
      return res.status(400).json({
        message: "Only Cash on Delivery is available right now",
      });
    }

    // ========================================================
    // TOTAL
    // ========================================================

    const freeDeliveryAbove = 299;
    const baseDeliveryFee = 40;

    const subtotal = Number(cart.subtotal) || 0;

    // Weekly-fruit-salad-only carts always get free delivery;
    // everything else falls back to the ₹299 threshold rule.
    const freeDeliveryCartOnly = isFreeDeliveryEligible(cart.items);

    const deliveryFee = freeDeliveryCartOnly
      ? 0
      : subtotal >= freeDeliveryAbove
      ? 0
      : baseDeliveryFee;

    const total = subtotal + deliveryFee;

    // ========================================================
    // CREATE ORDER
    // ========================================================

    const order = await orderModel.createOrder(userId, {
      name: String(name).trim(),

      mobile: String(mobile).trim(),

      email: String(email)
        .trim()
        .toLowerCase(),

      address: String(address).trim(),

      addressLine2: String(addressLine2 || "").trim(),

      city: String(city).trim(),

      state: String(state || "").trim(),

      pincode: String(pincode).trim(),

      deliveryDate,

      paymentMethod,

      subtotal,

      deliveryFee,

      total,

      items: cart.items.map((item) => ({
        productId: item.product_id,

        variantId: item.variant_id,

        name: item.name,

        variant: item.variant,

        image: item.image,

        price: Number(item.price),

        qty: Number(item.qty),
      })),
    });

    // ========================================================
    // CREATE FAILED
    // ========================================================

    if (!order) {
      return res.status(500).json({
        message: "Order was not created",
      });
    }

    // ========================================================
    // BOOKING TIME
    // ========================================================

    const bookedAt = order.booked_at || null;

    const expectedDeliveryAt =
      order.expected_delivery_at || null;

    const deliveryMinutes =
      Number(order.delivery_time_minutes) ||
      DELIVERY_TIME_MINUTES;

    // ========================================================
    // SERVER TIME
    // ========================================================

    const serverTime = new Date().toISOString();

    // ========================================================
    // CLEAR CART
    // ========================================================

    await cartModel.clearCart(userId);

    // ========================================================
    // RESPONSE
    // ========================================================

    return res.status(201).json({
      success: true,

      message: "Order placed successfully",

      order,

      booking: {
        bookedAt,

        deliveryMinutes,

        expectedDeliveryAt,
      },

      deliveryConfig: {
        deliveryMinutes,
      },

      serverTime,
    });
  } catch (error) {
    // ========================================================
    // STOCK ERROR
    // ========================================================

    if (error.code === "INSUFFICIENT_STOCK") {
      return res.status(409).json({
        message:
          "One or more items in your cart went out of stock. Please review your cart and try again.",
      });
    }

    console.error("placeOrder error:", error);

    return res.status(500).json({
      message: "Failed to place order",
    });
  }
};

// ============================================================
// GET MY ORDERS
// ============================================================

const getMyOrders = async (req, res) => {
  try {
    const userId = req.user.id;

    const orders =
      await orderModel.getOrdersByUser(userId);

    const normalizedOrders = (orders || []).map(
      (order) => ({
        ...order,

        delivery_time_minutes:
          Number(order.delivery_time_minutes) ||
          DELIVERY_TIME_MINUTES,

        booked_at:
          order.booked_at ||
          order.created_at ||
          null,

        expected_delivery_at:
          order.expected_delivery_at ||
          null,
      })
    );

    return res.json({
      success: true,

      orders: normalizedOrders,

      deliveryConfig: {
        deliveryMinutes:
          DELIVERY_TIME_MINUTES,
      },

      serverTime: new Date().toISOString(),
    });
  } catch (error) {
    console.error("getMyOrders error:", error);

    return res.status(500).json({
      message: "Failed to fetch orders",
    });
  }
};

// ============================================================
// GET SINGLE ORDER
// ============================================================

const getOrderById = async (req, res) => {
  try {
    const userId = req.user.id;

    const order =
      await orderModel.getOrderById(
        req.params.id,
        userId
      );

    if (!order) {
      return res.status(404).json({
        message: "Order not found",
      });
    }

    const deliveryMinutes =
      Number(order.delivery_time_minutes) ||
      DELIVERY_TIME_MINUTES;

    return res.json({
      success: true,

      order: {
        ...order,

        delivery_time_minutes:
          deliveryMinutes,

        booked_at:
          order.booked_at ||
          order.created_at ||
          null,

        expected_delivery_at:
          order.expected_delivery_at ||
          null,
      },

      deliveryConfig: {
        deliveryMinutes,
      },

      serverTime: new Date().toISOString(),
    });
  } catch (error) {
    console.error("getOrderById error:", error);

    return res.status(500).json({
      message: "Failed to fetch order",
    });
  }
};

// ============================================================
// REVIEW
// ============================================================

const addOrderReview = async (req, res) => {
  try {
    const userId = req.user.id;

    const orderId = req.params.id;

    const {
      rating,
      review,
    } = req.body;

    const numericRating = Number(rating);

    if (
      !Number.isInteger(numericRating) ||
      numericRating < 1 ||
      numericRating > 5
    ) {
      return res.status(400).json({
        message: "Rating must be between 1 and 5",
      });
    }

    const reviewText =
      review == null
        ? ""
        : String(review).trim();

    if (reviewText.length > 1000) {
      return res.status(400).json({
        message:
          "Review cannot exceed 1000 characters",
      });
    }

    const order =
      await orderModel.addOrderReview(
        orderId,
        userId,
        numericRating,
        reviewText
      );

    if (!order) {
      return res.status(400).json({
        message:
          "You can review only your delivered orders",
      });
    }

    return res.json({
      success: true,

      message:
        "Review submitted successfully",

      order,

      serverTime: new Date().toISOString(),
    });
  } catch (error) {
    console.error("addOrderReview error:", error);

    return res.status(500).json({
      message: "Failed to submit review",
    });
  }
};

// ============================================================
// EXPORT
// ============================================================

module.exports = {
  placeOrder,
  getMyOrders,
  getOrderById,
  addOrderReview,
};