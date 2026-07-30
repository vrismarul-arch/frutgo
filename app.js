const express = require("express");
const cors = require("cors");

const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const clientRoutes = require("./routes/clientRoutes");
const businessRoutes = require("./routes/businessRoutes");
const leadRoutes = require("./routes/leadRoutes");
const serviceRoutes = require("./routes/serviceRoutes");
const authenticate = require("./middleware/authenticate");
const { notFound, errorHandler } = require("./middleware/errorHandler");

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/api/health", (req, res) => res.json({ status: "ok" }));

// Public
app.use("/api/auth", authRoutes);

// Protected — requires a valid Bearer token from /api/auth/login
app.use("/api/users", authenticate, userRoutes);
app.use("/api/clients", authenticate, clientRoutes);
app.use("/api/businesses", authenticate, businessRoutes);
app.use("/api/leads", authenticate, leadRoutes);
app.use("/api/services", authenticate, serviceRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;