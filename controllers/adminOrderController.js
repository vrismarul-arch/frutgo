const orderModel = require("../models/orderModel");

const ALLOWED_STATUSES = ["pending", "confirmed", "out_for_delivery", "delivered", "cancelled"];

const getOrders = async (req, res) => {
  try {
    const { status = "", search = "" } = req.query;
    const orders = await orderModel.getAllOrders({ status, search });
    res.json({ orders });
  } catch (err) {
    console.error("getOrders (admin) error:", err);
    res.status(500).json({ message: "Failed to fetch orders" });
  }
};

const getOrderById = async (req, res) => {
  try {
    const order = await orderModel.getAnyOrderById(req.params.id);
    if (!order) return res.status(404).json({ message: "Order not found" });
    res.json({ order });
  } catch (err) {
    console.error("getOrderById (admin) error:", err);
    res.status(500).json({ message: "Failed to fetch order" });
  }
};

const updateStatus = async (req, res) => {
  const { status } = req.body;
  if (!status || !ALLOWED_STATUSES.includes(status)) {
    return res.status(400).json({ message: `Status must be one of: ${ALLOWED_STATUSES.join(", ")}` });
  }
  try {
    const order = await orderModel.updateOrderStatus(req.params.id, status);
    if (!order) return res.status(404).json({ message: "Order not found" });
    res.json({ order, message: "Order status updated" });
  } catch (err) {
    console.error("updateStatus (admin) error:", err);
    res.status(500).json({ message: "Failed to update order status" });
  }
};

module.exports = { getOrders, getOrderById, updateStatus };