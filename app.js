const express = require("express");
const cors = require("cors");

const authRoutes = require("./routes/authRoutes");
const userAuthRoutes = require("./routes/userAuthRoutes");
const productRoutes = require("./routes/productRoutes");
const cartRoutes = require("./routes/cartRoutes");
const orderRoutes = require("./routes/orderRoutes");
const adminOrderRoutes = require("./routes/adminOrderRoutes");
const addressRoutes =
  require("./routes/addressRoutes");
const {
  notFound,
  errorHandler,
} = require("./middleware/errorHandler");

const app = express();

// =====================================================
// CORS
// =====================================================

const allowedOrigins = [
  // Vite development
  "http://localhost:5173",

  // Production website
  "https://frutgodelivery.netlify.app",
];

const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests without Origin
    // Example: Postman, curl, server-to-server
    if (!origin) {
      return callback(null, true);
    }

    // Allow exact production/development origins
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    // Allow Flutter Web localhost
    // Example:
    // http://localhost:55731
    // http://localhost:52143
    // http://localhost:8080
    if (/^http:\/\/localhost:\d+$/.test(origin)) {
      return callback(null, true);
    }

    // Allow Flutter Web using 127.0.0.1
    // Example:
    // http://127.0.0.1:55731
    if (/^http:\/\/127\.0\.0\.1:\d+$/.test(origin)) {
      return callback(null, true);
    }

    console.log(
      `CORS blocked origin: ${origin}`
    );

    return callback(
      new Error(
        `Origin ${origin} not allowed by CORS`
      )
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

app.get(
  "/api/health",
  (req, res) => {
    res.status(200).json({
      status: "ok",
      message: "Frutgo API is running",
    });
  }
);

// =====================================================
// ADMIN ROUTES
// =====================================================

// Admin authentication
app.use(
  "/api/admin",
  authRoutes
);

// Admin product management
app.use(
  "/api/admin/products",
  productRoutes
);

// Admin order management
app.use(
  "/api/admin/orders",
  adminOrderRoutes
);

// =====================================================
// CUSTOMER AUTH
// =====================================================

app.use(
  "/api/users/auth",
  userAuthRoutes
);

// =====================================================
// CUSTOMER CART
// =====================================================

app.use(
  "/api/cart",
  cartRoutes
);

// =====================================================
// CUSTOMER ORDERS
// =====================================================
app.use(
  "/api/addresses",
  addressRoutes
);
app.use(
  "/api/orders",
  orderRoutes
);

// =====================================================
// 404
// =====================================================

app.use(notFound);

// =====================================================
// ERROR HANDLER
// =====================================================

app.use(errorHandler);

module.exports = app;