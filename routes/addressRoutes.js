const express = require("express");

const router =
  express.Router();

const {
  getAddresses,
  getAddress,
  createAddress,
  updateAddress,
  deleteAddress,
  setDefaultAddress,
} = require("../controllers/addressController");

const requireUserAuth =
  require("../middleware/requireUserAuth");

// =====================================================
// GET ALL
// GET /api/addresses
// =====================================================

router.get(
  "/",
  requireUserAuth,
  getAddresses
);

// =====================================================
// GET ONE
// GET /api/addresses/:id
// =====================================================

router.get(
  "/:id",
  requireUserAuth,
  getAddress
);

// =====================================================
// CREATE
// POST /api/addresses
// =====================================================

router.post(
  "/",
  requireUserAuth,
  createAddress
);

// =====================================================
// UPDATE
// PUT /api/addresses/:id
// =====================================================

router.put(
  "/:id",
  requireUserAuth,
  updateAddress
);

// =====================================================
// DELETE
// DELETE /api/addresses/:id
// =====================================================

router.delete(
  "/:id",
  requireUserAuth,
  deleteAddress
);

// =====================================================
// SET DEFAULT
// PATCH /api/addresses/:id/default
// =====================================================

router.patch(
  "/:id/default",
  requireUserAuth,
  setDefaultAddress
);

module.exports = router;