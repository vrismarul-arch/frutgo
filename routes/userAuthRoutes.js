const express = require("express");
const router = express.Router();

const { signup, login, googleLogin, getMe } = require("../controllers/userAuthController");
const requireUserAuth = require("../middleware/requireUserAuth");

router.post("/signup", signup);
router.post("/login", login);
router.post("/google", googleLogin);
router.get("/me", requireUserAuth, getMe);

module.exports = router;