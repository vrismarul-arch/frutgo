const express = require("express");
const router = express.Router();

const { placeOrder, getMyOrders, getOrderById } = require("../controllers/orderController");
const requireUserAuth = require("../middleware/userAuthMiddleware");

// Every order route requires a logged-in customer
router.use(requireUserAuth);

router.post("/", placeOrder);
router.get("/", getMyOrders);
router.get("/:id", getOrderById);

module.exports = router;