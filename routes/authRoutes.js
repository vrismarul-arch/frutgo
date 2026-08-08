const express = require("express");
const router = express.Router();

const { login } = require("../controllers/authController");
const requireAdminAuth = require("../middleware/authMiddleware");

router.post("/login", login);

router.get("/me", requireAdminAuth, (req, res) => {
  res.json({ admin: req.admin });
});

module.exports = router;