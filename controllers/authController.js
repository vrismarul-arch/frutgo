const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
require("dotenv").config();

const adminModel = require("../models/adminModel");

const signToken = (admin) =>
  jwt.sign({ id: admin.id, email: admin.email }, process.env.JWT_USER_SECRET, {
    expiresIn: "7d",
  });

const sanitizeAdmin = (admin) => ({
  id: admin.id,
  name: admin.name,
  email: admin.email,
});

const login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required" });
  }

  try {
    const admin = await adminModel.findByEmail(email.trim().toLowerCase());
    if (!admin) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const match = await bcrypt.compare(password, admin.password);
    if (!match) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const token = signToken(admin);
    res.json({ token, admin: sanitizeAdmin(admin) });
  } catch (err) {
    console.error("admin login error:", err);
    res.status(500).json({ message: "Failed to log in" });
  }
};

module.exports = { login };