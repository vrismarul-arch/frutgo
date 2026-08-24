// ============================================================
// controllers/deviceTokenController.js
// ============================================================

const deviceTokenModel = require("../models/deviceTokenModel");

// ============================================================
// REGISTER / UPDATE TOKEN
// Called by the app right after login and on every app start.
// ============================================================

const registerToken = async (req, res) => {
  try {
    const userId = req.user.id;
    const { token, platform } = req.body;

    if (!token || !String(token).trim()) {
      return res.status(400).json({ message: "FCM token is required" });
    }

    const validPlatforms = ["android", "ios", "web"];
    const safePlatform = validPlatforms.includes(platform)
      ? platform
      : "android";

    await deviceTokenModel.saveToken(userId, String(token).trim(), safePlatform);

    return res.json({ success: true, message: "Device token saved" });
  } catch (error) {
    console.error("registerToken error:", error);
    return res.status(500).json({ message: "Failed to save device token" });
  }
};

// ============================================================
// REMOVE TOKEN (call this on logout so the old device
// stops receiving notifications meant for this account)
// ============================================================

const removeToken = async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ message: "FCM token is required" });
    }

    await deviceTokenModel.removeToken(token);

    return res.json({ success: true, message: "Device token removed" });
  } catch (error) {
    console.error("removeToken error:", error);
    return res.status(500).json({ message: "Failed to remove device token" });
  }
};

module.exports = {
  registerToken,
  removeToken,
};