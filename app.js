const express = require("express");
const cors = require("cors");

const authRoutes = require("./routes/authRoutes");
const userAuthRoutes = require("./routes/userAuthRoutes");
const productRoutes = require("./routes/productRoutes");
const cartRoutes = require("./routes/cartRoutes");
const orderRoutes = require("./routes/orderRoutes");
const adminOrderRoutes = require("./routes/adminOrderRoutes");
const addressRoutes = require("./routes/addressRoutes");

const {
  notFound,
  errorHandler,
} = require("./middleware/errorHandler");

const app = express();

// =====================================================
// CORS
// =====================================================

const allowedOrigins = [
  "http://localhost:5173",
  "https://frutgodelivery.netlify.app",
  "https://frutgo.shop",
];

const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests without Origin
    // Postman, curl, server-to-server etc.
    if (!origin) {
      return callback(null, true);
    }

    // Allow exact production/development origins
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    // Allow Flutter Web localhost
    if (/^http:\/\/localhost:\d+$/.test(origin)) {
      return callback(null, true);
    }

    // Allow Flutter Web using 127.0.0.1
    if (/^http:\/\/127\.0\.0\.1:\d+$/.test(origin)) {
      return callback(null, true);
    }

    console.log(`CORS blocked origin: ${origin}`);

    return callback(
      new Error(`Origin ${origin} not allowed by CORS`)
    );
  },

  credentials: true,

  methods: [
    "GET",
    "POST",
    "PUT",
    "PATCH",
    "DELETE",
    "OPTIONS",
  ],

  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "Accept",
  ],
};

app.use(cors(corsOptions));

// =====================================================
// BODY PARSER
// =====================================================

app.use(express.json());

app.use(
  express.urlencoded({
    extended: true,
  })
);

// =====================================================
// HEALTH CHECK
// =====================================================

app.get("/api/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    message: "Frutgo API is running",
  });
});

// =====================================================
// ADMIN ROUTES
// =====================================================

// Admin authentication
app.use("/api/admin", authRoutes);

// Admin product management
app.use("/api/admin/products", productRoutes);

// Admin order management
app.use("/api/admin/orders", adminOrderRoutes);

// =====================================================
// CUSTOMER AUTH
// =====================================================

app.use("/api/users/auth", userAuthRoutes);

// =====================================================
// CUSTOMER CART
// =====================================================

app.use("/api/cart", cartRoutes);

// =====================================================
// CUSTOMER ADDRESSES
// =====================================================

app.use("/api/addresses", addressRoutes);

// =====================================================
// CUSTOMER ORDERS
// =====================================================

app.use("/api/orders", orderRoutes);

// =====================================================
// 404
// =====================================================

app.use(notFound);

// =====================================================
// ERROR HANDLER
// =====================================================

app.use(errorHandler);

module.exports = app;