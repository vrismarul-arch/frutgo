const pool = require("../config/db");

// =====================================================
// GET ALL ADDRESSES
// =====================================================

const findByUserId = async (userId) => {
  const [rows] = await pool.query(
    `
    SELECT
      id,
      user_id,
      address_label,
      full_name,
      phone,
      address_line1,
      address_line2,
      city,
      state,
      pincode,
      latitude,
      longitude,
      is_default,
      created_at,
      updated_at
    FROM addresses
    WHERE user_id = ?
    ORDER BY
      is_default DESC,
      created_at DESC
    `,
    [userId]
  );

  return rows;
};

// =====================================================
// GET SINGLE ADDRESS
// =====================================================

const findById = async (
  addressId,
  userId
) => {
  const [rows] = await pool.query(
    `
    SELECT
      id,
      user_id,
      address_label,
      full_name,
      phone,
      address_line1,
      address_line2,
      city,
      state,
      pincode,
      latitude,
      longitude,
      is_default,
      created_at,
      updated_at
    FROM addresses
    WHERE id = ?
      AND user_id = ?
    LIMIT 1
    `,
    [
      addressId,
      userId,
    ]
  );

  return rows.length
    ? rows[0]
    : null;
};

// =====================================================
// CLEAR DEFAULT ADDRESS
// =====================================================

const clearDefault = async (
  userId
) => {
  await pool.query(
    `
    UPDATE addresses
    SET is_default = FALSE
    WHERE user_id = ?
    `,
    [userId]
  );
};

// =====================================================
// CREATE ADDRESS
// =====================================================

const create = async ({
  userId,
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
}) => {
  if (isDefault) {
    await clearDefault(
      userId
    );
  }

  const [result] =
    await pool.query(
      `
      INSERT INTO addresses (
        user_id,
        address_label,
        full_name,
        phone,
        address_line1,
        address_line2,
        city,
        state,
        pincode,
        latitude,
        longitude,
        is_default
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        userId,
        addressLabel ||
          "Home",
        fullName,
        phone,
        addressLine1,
        addressLine2 ||
          null,
        city,
        state,
        pincode,
        latitude ??
          null,
        longitude ??
          null,
        isDefault
          ? 1
          : 0,
      ]
    );

  return findById(
    result.insertId,
    userId
  );
};

// =====================================================
// UPDATE ADDRESS
// =====================================================

const update = async (
  addressId,
  userId,
  {
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
  }
) => {
  if (isDefault) {
    await clearDefault(
      userId
    );
  }

  await pool.query(
    `
    UPDATE addresses
    SET
      address_label = ?,
      full_name = ?,
      phone = ?,
      address_line1 = ?,
      address_line2 = ?,
      city = ?,
      state = ?,
      pincode = ?,
      latitude = ?,
      longitude = ?,
      is_default = ?
    WHERE id = ?
      AND user_id = ?
    `,
    [
      addressLabel ||
        "Home",
      fullName,
      phone,
      addressLine1,
      addressLine2 ||
        null,
      city,
      state,
      pincode,
      latitude ??
        null,
      longitude ??
        null,
      isDefault
        ? 1
        : 0,
      addressId,
      userId,
    ]
  );

  return findById(
    addressId,
    userId
  );
};

// =====================================================
// DELETE ADDRESS
// =====================================================

const remove = async (
  addressId,
  userId
) => {
  const existing =
    await findById(
      addressId,
      userId
    );

  if (!existing) {
    return null;
  }

  await pool.query(
    `
    DELETE FROM addresses
    WHERE id = ?
      AND user_id = ?
    `,
    [
      addressId,
      userId,
    ]
  );

  // If default address was deleted,
  // automatically make another address default.
  if (existing.is_default) {
    const [rows] =
      await pool.query(
        `
        SELECT id
        FROM addresses
        WHERE user_id = ?
        ORDER BY created_at DESC
        LIMIT 1
        `,
        [userId]
      );

    if (rows.length) {
      await pool.query(
        `
        UPDATE addresses
        SET is_default = TRUE
        WHERE id = ?
          AND user_id = ?
        `,
        [
          rows[0].id,
          userId,
        ]
      );
    }
  }

  return true;
};

// =====================================================
// SET DEFAULT ADDRESS
// =====================================================

const setDefault = async (
  addressId,
  userId
) => {
  const address =
    await findById(
      addressId,
      userId
    );

  if (!address) {
    return null;
  }

  await clearDefault(
    userId
  );

  await pool.query(
    `
    UPDATE addresses
    SET is_default = TRUE
    WHERE id = ?
      AND user_id = ?
    `,
    [
      addressId,
      userId,
    ]
  );

  return findById(
    addressId,
    userId
  );
};

module.exports = {
  findByUserId,
  findById,
  create,
  update,
  remove,
  setDefault,
};