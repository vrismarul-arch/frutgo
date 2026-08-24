const express = require("express");

const router = express.Router();

const {
  registerToken,
  removeToken,
} = require("../controllers/deviceTokenController");

const requireUserAuth = require("../middleware/userAuthMiddleware");

router.use(requireUserAuth);

// POST /api/device-token   -> save/update token
router.post("/", registerToken);

// DELETE /api/device-token -> remove token (e.g. on logout)
router.delete("/", removeToken);

module.exports = router;

// ============================================================
// Register this in your main app.js / server.js:
//
//   const deviceTokenRoutes = require("./routes/deviceTokenRoutes");
//   app.use("/api/device-token", deviceTokenRoutes);
// ============================================================