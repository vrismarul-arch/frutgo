const express = require("express");
const router = express.Router();

const { getOrders, getOrderById, updateStatus } = require("../controllers/adminOrderController");
const requireAdminAuth = require("../middleware/authMiddleware");

router.use(requireAdminAuth);

router.get("/", getOrders);
router.get("/:id", getOrderById);
router.patch("/:id/status", updateStatus);

module.exports = router;