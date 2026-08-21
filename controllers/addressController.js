const addressModel = require("../models/addressModel");

// =====================================================
// VALIDATION
// =====================================================

const validateAddress = ({
  fullName,
  phone,
  addressLine1,
  city,
  state,
  pincode,
}) => {
  if (
    !fullName ||
    !fullName.trim()
  ) {
    return "Full name is required";
  }

  if (
    !phone ||
    !phone.trim()
  ) {
    return "Phone number is required";
  }

  if (
    !/^[6-9]\d{9}$/.test(
      phone.trim()
    )
  ) {
    return "Enter a valid 10-digit phone number";
  }

  if (
    !addressLine1 ||
    !addressLine1.trim()
  ) {
    return "Address is required";
  }

  if (
    !city ||
    !city.trim()
  ) {
    return "City is required";
  }

  if (
    !state ||
    !state.trim()
  ) {
    return "State is required";
  }

  if (
    !pincode ||
    !pincode.trim()
  ) {
    return "Pincode is required";
  }

  if (
    !/^\d{6}$/.test(
      pincode.trim()
    )
  ) {
    return "Enter a valid 6-digit pincode";
  }

  return null;
};

// =====================================================
// GET ADDRESSES
// =====================================================

const getAddresses =
  async (req, res) => {
    try {
      const addresses =
        await addressModel.findByUserId(
          req.user.id
        );

      res.json({
        addresses,
      });
    } catch (err) {
      console.error(
        "getAddresses error:",
        err
      );

      res.status(500).json({
        message:
          "Failed to fetch addresses",
      });
    }
  };

// =====================================================
// GET SINGLE ADDRESS
// =====================================================

const getAddress =
  async (req, res) => {
    try {
      const address =
        await addressModel.findById(
          req.params.id,
          req.user.id
        );

      if (!address) {
        return res.status(404).json({
          message:
            "Address not found",
        });
      }

      res.json({
        address,
      });
    } catch (err) {
      console.error(
        "getAddress error:",
        err
      );

      res.status(500).json({
        message:
          "Failed to fetch address",
      });
    }
  };

// =====================================================
// CREATE ADDRESS
// =====================================================

const createAddress =
  async (req, res) => {
    const {
      addressLabel,
      fullName,
      phone,
      addressLine1,
      addressLine2,
      city,
      state,
      pincode,
      latitude,
      longitude,
      isDefault,
    } = req.body;

    const validationError =
      validateAddress({
        fullName,
        phone,
        addressLine1,
        city,
        state,
        pincode,
      });

    if (validationError) {
      return res.status(400).json({
        message:
          validationError,
      });
    }

    try {
      const existing =
        await addressModel.findByUserId(
          req.user.id
        );

      // First address automatically becomes default
      const shouldBeDefault =
        existing.length === 0 ||
        Boolean(isDefault);

      const address =
        await addressModel.create({
          userId: req.user.id,

          addressLabel:
            addressLabel ||
            "Home",

          fullName:
            fullName.trim(),

          phone:
            phone.trim(),

          addressLine1:
            addressLine1.trim(),

          addressLine2:
            addressLine2
              ? addressLine2.trim()
              : null,

          city:
            city.trim(),

          state:
            state.trim(),

          pincode:
            pincode.trim(),

          latitude:
            latitude ??
            null,

          longitude:
            longitude ??
            null,

          isDefault:
            shouldBeDefault,
        });

      res.status(201).json({
        message:
          "Address added successfully",
        address,
      });
    } catch (err) {
      console.error(
        "createAddress error:",
        err
      );

      res.status(500).json({
        message:
          "Failed to add address",
      });
    }
  };

// =====================================================
// UPDATE ADDRESS
// =====================================================

const updateAddress =
  async (req, res) => {
    const {
      addressLabel,
      fullName,
      phone,
      addressLine1,
      addressLine2,
      city,
      state,
      pincode,
      latitude,
      longitude,
      isDefault,
    } = req.body;

    const validationError =
      validateAddress({
        fullName,
        phone,
        addressLine1,
        city,
        state,
        pincode,
      });

    if (validationError) {
      return res.status(400).json({
        message:
          validationError,
      });
    }

    try {
      const existing =
        await addressModel.findById(
          req.params.id,
          req.user.id
        );

      if (!existing) {
        return res.status(404).json({
          message:
            "Address not found",
        });
      }

      const address =
        await addressModel.update(
          req.params.id,
          req.user.id,
          {
            addressLabel:
              addressLabel ||
              "Home",

            fullName:
              fullName.trim(),

            phone:
              phone.trim(),

            addressLine1:
              addressLine1.trim(),

            addressLine2:
              addressLine2
                ? addressLine2.trim()
                : null,

            city:
              city.trim(),

            state:
              state.trim(),

            pincode:
              pincode.trim(),

            latitude:
              latitude ??
              null,

            longitude:
              longitude ??
              null,

            isDefault:
              Boolean(
                isDefault
              ),
          }
        );

      res.json({
        message:
          "Address updated successfully",
        address,
      });
    } catch (err) {
      console.error(
        "updateAddress error:",
        err
      );

      res.status(500).json({
        message:
          "Failed to update address",
      });
    }
  };

// =====================================================
// DELETE ADDRESS
// =====================================================

const deleteAddress =
  async (req, res) => {
    try {
      const deleted =
        await addressModel.remove(
          req.params.id,
          req.user.id
        );

      if (!deleted) {
        return res.status(404).json({
          message:
            "Address not found",
        });
      }

      res.json({
        message:
          "Address deleted successfully",
      });
    } catch (err) {
      console.error(
        "deleteAddress error:",
        err
      );

      res.status(500).json({
        message:
          "Failed to delete address",
      });
    }
  };

// =====================================================
// SET DEFAULT
// =====================================================

const setDefaultAddress =
  async (req, res) => {
    try {
      const address =
        await addressModel.setDefault(
          req.params.id,
          req.user.id
        );

      if (!address) {
        return res.status(404).json({
          message:
            "Address not found",
        });
      }

      res.json({
        message:
          "Default address updated",
        address,
      });
    } catch (err) {
      console.error(
        "setDefaultAddress error:",
        err
      );

      res.status(500).json({
        message:
          "Failed to set default address",
      });
    }
  };

module.exports = {
  getAddresses,
  getAddress,
  createAddress,
  updateAddress,
  deleteAddress,
  setDefaultAddress,
};