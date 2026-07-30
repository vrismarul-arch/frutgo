const jwt = require("jsonwebtoken");
const env = require("../config/env");

// Verifies the Bearer token and attaches { id, email, role, accountType } to req.user.
// Apply this to any route that should require a logged-in staff/client.
function authenticate(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ message: "Missing or invalid authorization token" });
  }

  try {
    const payload = jwt.verify(token, env.JWT_SECRET);
    req.user = payload;
    next();
  } catch (err) {
    return res.status(401).json({ message: "Session expired, please log in again" });
  }
}

module.exports = authenticate;