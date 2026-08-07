const express = require("express");
const cors = require("cors");

const authRoutes = require("./routes/authRoutes");
const userAuthRoutes = require("./routes/userAuthRoutes");
const productRoutes = require("./routes/productRoutes");
const cartRoutes = require("./routes/cartRoutes");
const orderRoutes = require("./routes/orderRoutes");
const adminOrderRoutes = require("./routes/adminOrderRoutes");
const { notFound, errorHandler } = require("./middleware/errorHandler");

const app = express();

// ===========================
// CORS
// ===========================
const allowedOrigins = [
  // "http://localhost:5173", // Vite dev server
  "https://frutgodelivery.netlify.app", // Vite dev server
  // 👈 add your production frontend URL here
];

const corsOptions = {
  origin: (origin, callback) => {
    // allow requests with no origin (curl, Postman, server-to-server)
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    return callback(new Error(`Origin ${origin} not allowed by CORS`));
  },
  credentials: true,
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/api/health", (req, res) => res.json({ status: "ok" }));

// Admin auth + admin-only product management
app.use("/api/admin", authRoutes);
app.use("/api/admin/products", productRoutes);
app.use("/api/admin/orders", adminOrderRoutes);

// Customer-facing auth (signup, login, Google login)
app.use("/api/users/auth", userAuthRoutes);

// Customer cart and orders
app.use("/api/cart", cartRoutes);
app.use("/api/orders", orderRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;