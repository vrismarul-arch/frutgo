const jwt = require("jsonwebtoken");
require("dotenv").config();

// Protects customer routes (cart, orders, etc). Expects: Authorization: Bearer <token>
// Must use the exact same secret userAuthController.js signs tokens with.
const requireUserAuth = (req, res, next) => {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ message: "No token provided" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_USER_SECRET);
    req.user = decoded; // { id: <userId>, email: <email> } — set by signToken in userAuthController.js
    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};

module.exports = requireUserAuth;