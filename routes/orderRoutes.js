const express = require("express");

const router = express.Router();

const {
  placeOrder,
  getMyOrders,
  getOrderById,
  addOrderReview,
} = require("../controllers/orderController");

const requireUserAuth = require("../middleware/userAuthMiddleware");

// ============================================================
// ALL ORDER ROUTES REQUIRE CUSTOMER LOGIN
// ============================================================

router.use(requireUserAuth);

// ============================================================
// PLACE ORDER
// POST /api/orders
// ============================================================

router.post("/", placeOrder);

// ============================================================
// GET MY ORDERS
// GET /api/orders
// ============================================================

router.get("/", getMyOrders);

// ============================================================
// GET SINGLE ORDER
// GET /api/orders/:id
// ============================================================

router.get("/:id", getOrderById);

// ============================================================
// ADD / UPDATE REVIEW
// POST /api/orders/:id/review
// ============================================================

router.post(
  "/:id/review",
  addOrderReview
);

module.exports = router;