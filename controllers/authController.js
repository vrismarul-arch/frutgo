const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
require("dotenv").config();

const adminModel = require("../models/adminModel");

// =====================================================
// CREATE JWT TOKEN
// =====================================================
const signToken = (admin) => {
  return jwt.sign(
    {
      id: admin.id,
      email: admin.email,
    },
    process.env.JWT_USER_SECRET,
    {
      expiresIn: "7d",
    }
  );
};

// =====================================================
// SANITIZE ADMIN
// =====================================================
const sanitizeAdmin = (admin) => {
  return {
    id: admin.id,
    name: admin.name,
    email: admin.email,
    phone: admin.phone || null,
  };
};

// =====================================================
// ADMIN LOGIN
// =====================================================
const login = async (req, res) => {
  const {
    email,
    password,
  } = req.body;

  // Check email and password
  if (!email || !password) {
    return res.status(400).json({
      message:
        "Email and password are required",
    });
  }

  try {
    const cleanEmail =
      email.trim().toLowerCase();

    // Find admin
    const admin =
      await adminModel.findByEmail(
        cleanEmail
      );

    if (!admin) {
      return res.status(401).json({
        message:
          "Invalid email or password",
      });
    }

    // Check password
    const match =
      await bcrypt.compare(
        password,
        admin.password
      );

    if (!match) {
      return res.status(401).json({
        message:
          "Invalid email or password",
      });
    }

    // Create token
    const token = signToken(admin);

    // Response
    return res.json({
      message: "Login successful",
      token,
      admin: sanitizeAdmin(admin),
    });
  } catch (err) {
    console.error(
      "admin login error:",
      err
    );

    return res.status(500).json({
      message: "Failed to log in",
    });
  }
};

// =====================================================
// EXPORT
// =====================================================
module.exports = {
  login,
};