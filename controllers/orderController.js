const orderModel = require("../models/orderModel");
const cartModel = require("../models/cartModel");

const validateOrderBody = (body) => {
  const errors = {};

  if (!body.name || !body.name.trim()) errors.name = "Name is required";

  if (!body.mobile || !/^[6-9]\d{9}$/.test(String(body.mobile).trim())) {
    errors.mobile = "Enter a valid 10-digit mobile number";
  }

  if (!body.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(body.email).trim())) {
    errors.email = "Enter a valid email address";
  }

  if (!body.address || !body.address.trim()) errors.address = "Delivery address is required";
  if (!body.city || !body.city.trim()) errors.city = "City is required";

  if (!body.pincode || !/^\d{6}$/.test(String(body.pincode).trim())) {
    errors.pincode = "Enter a valid 6-digit pincode";
  }

  if (!body.deliveryDate) errors.deliveryDate = "Select a delivery date";

  if (!body.paymentMethod || !["upi", "cod"].includes(body.paymentMethod)) {
    errors.paymentMethod = "Select a valid payment method";
  }

  return errors;
};

// POST /api/orders
// Places an order from the user's CURRENT cart. Items/prices are always
// pulled fresh from the server-side cart. Stock is decremented atomically
// inside orderModel.createOrder — if any item is out of stock, the whole
// order is rejected and nothing is written.
const placeOrder = async (req, res) => {
  const errors = validateOrderBody(req.body);
  if (Object.keys(errors).length > 0) {
    return res.status(400).json({ errors });
  }

  try {
    const userId = req.user.id;

    const cart = await cartModel.getCartByUser(userId);
    if (!cart.items || cart.items.length === 0) {
      return res.status(400).json({ message: "Your cart is empty" });
    }

    const { name, mobile, email, address, city, pincode, deliveryDate, paymentMethod } = req.body;

    if (paymentMethod !== "cod") {
      return res.status(400).json({ message: "Only Cash on Delivery is available right now" });
    }

    const freeDeliveryAbove = 499;
    const baseDeliveryFee = 25;
    const deliveryFee = cart.subtotal >= freeDeliveryAbove ? 0 : baseDeliveryFee;
    const total = cart.subtotal + deliveryFee;

    const order = await orderModel.createOrder(userId, {
      name: name.trim(),
      mobile: mobile.trim(),
      email: email.trim().toLowerCase(),
      address: address.trim(),
      city: city.trim(),
      pincode: pincode.trim(),
      deliveryDate,
      paymentMethod,
      subtotal: cart.subtotal,
      deliveryFee,
      total,
      items: cart.items.map((item) => ({
        productId: item.product_id,
        variantId: item.variant_id,
        name: item.name,
        variant: item.variant,
        image: item.image,
        price: item.price,
        qty: item.qty,
      })),
    });

    // Order placed successfully — clear the cart server-side
    await cartModel.clearCart(userId);

    res.status(201).json({ order, message: "Order placed" });
  } catch (err) {
    if (err.code === "INSUFFICIENT_STOCK") {
      return res.status(409).json({
        message: "One or more items in your cart went out of stock. Please review your cart and try again.",
      });
    }
    console.error("placeOrder error:", err);
    res.status(500).json({ message: "Failed to place order" });
  }
};

const getMyOrders = async (req, res) => {
  try {
    const userId = req.user.id;
    const orders = await orderModel.getOrdersByUser(userId);
    res.json({ orders });
  } catch (err) {
    console.error("getMyOrders error:", err);
    res.status(500).json({ message: "Failed to fetch orders" });
  }
};

const getOrderById = async (req, res) => {
  try {
    const userId = req.user.id;
    const order = await orderModel.getOrderById(req.params.id, userId);
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }
    res.json({ order });
  } catch (err) {
    console.error("getOrderById error:", err);
    res.status(500).json({ message: "Failed to fetch order" });
  }
};

module.exports = { placeOrder, getMyOrders, getOrderById };