const cartModel = require("../models/cartModel");

const validateAddBody = (body) => {
  const errors = {};

  if (!body.productId || Number.isNaN(Number(body.productId))) {
    errors.productId = "productId is required";
  }
  if (!body.variantId || Number.isNaN(Number(body.variantId))) {
    errors.variantId = "variantId is required";
  }
  if (body.qty !== undefined && (Number.isNaN(Number(body.qty)) || Number(body.qty) < 1)) {
    errors.qty = "qty must be at least 1";
  }

  return errors;
};

// GET /api/cart
const getCart = async (req, res) => {
  try {
    const userId = req.user.id;
    const cart = await cartModel.getCartByUser(userId);
    res.json(cart);
  } catch (err) {
    console.error("getCart error:", err);
    res.status(500).json({ message: "Failed to fetch cart" });
  }
};

// POST /api/cart  body: { productId, variantId, qty }
const addToCart = async (req, res) => {
  const errors = validateAddBody(req.body);
  if (Object.keys(errors).length > 0) {
    return res.status(400).json({ errors });
  }

  try {
    const userId = req.user.id;
    const { productId, variantId, qty } = req.body;

    const cart = await cartModel.addItem(userId, {
      productId: Number(productId),
      variantId: Number(variantId),
      qty: qty ? Number(qty) : 1,
    });

    res.status(201).json({ ...cart, message: "Added to cart" });
  } catch (err) {
    // A stale/invalid variantId (e.g. deleted product) trips the FK constraint
    if (err.code === "ER_NO_REFERENCED_ROW_2" || err.code === "ER_NO_REFERENCED_ROW") {
      return res.status(400).json({ message: "This product or variant no longer exists" });
    }
    console.error("addToCart error:", err);
    res.status(500).json({ message: "Failed to add to cart" });
  }
};

// PUT /api/cart/:itemId  body: { qty }
const updateCartItem = async (req, res) => {
  const { qty } = req.body;

  if (qty === undefined || Number.isNaN(Number(qty))) {
    return res.status(400).json({ message: "qty is required" });
  }

  try {
    const userId = req.user.id;
    const cart = await cartModel.updateItemQty(userId, req.params.itemId, Number(qty));
    res.json(cart);
  } catch (err) {
    console.error("updateCartItem error:", err);
    res.status(500).json({ message: "Failed to update item" });
  }
};

// DELETE /api/cart/:itemId
const removeCartItem = async (req, res) => {
  try {
    const userId = req.user.id;
    const cart = await cartModel.removeItem(userId, req.params.itemId);
    res.json(cart);
  } catch (err) {
    console.error("removeCartItem error:", err);
    res.status(500).json({ message: "Failed to remove item" });
  }
};

// DELETE /api/cart  (clears the whole cart, e.g. after checkout)
const clearCart = async (req, res) => {
  try {
    const userId = req.user.id;
    const cart = await cartModel.clearCart(userId);
    res.json(cart);
  } catch (err) {
    console.error("clearCart error:", err);
    res.status(500).json({ message: "Failed to clear cart" });
  }
};

module.exports = { getCart, addToCart, updateCartItem, removeCartItem, clearCart };