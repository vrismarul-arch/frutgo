const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { OAuth2Client } = require("google-auth-library");

const userModel = require("../models/userModel");

// =====================================================
// GOOGLE CLIENT
// =====================================================
const googleClient = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID
);

// =====================================================
// CREATE JWT TOKEN
// =====================================================
const signToken = (user) => {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
    },
    process.env.JWT_USER_SECRET,
    {
      expiresIn: "7d",
    }
  );
};

// =====================================================
// SANITIZE USER
// =====================================================
const sanitizeUser = (user) => {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone || null,
    avatar: user.avatar || null,
    provider: user.provider || "local",
  };
};

// =====================================================
// SIGNUP
// =====================================================
const signup = async (req, res) => {
  const {
    name,
    email,
    phone,
    password,
  } = req.body;

  // Name validation
  if (!name || !name.trim()) {
    return res.status(400).json({
      message: "Name is required",
    });
  }

  // Email validation
  if (!email || !email.trim()) {
    return res.status(400).json({
      message: "Email is required",
    });
  }

  // Phone validation
  if (!phone || !phone.trim()) {
    return res.status(400).json({
      message: "Phone number is required",
    });
  }

  const cleanPhone = phone.trim();

  // Indian 10-digit phone validation
  const phoneRegex = /^[6-9]\d{9}$/;

  if (!phoneRegex.test(cleanPhone)) {
    return res.status(400).json({
      message: "Enter a valid 10-digit phone number",
    });
  }

  // Password validation
  if (!password || password.length < 6) {
    return res.status(400).json({
      message: "Password must be at least 6 characters",
    });
  }

  try {
    const cleanEmail = email.trim().toLowerCase();

    // Check existing email
    const existing = await userModel.findByEmail(
      cleanEmail
    );

    if (existing) {
      return res.status(409).json({
        message:
          "An account with this email already exists",
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(
      password,
      10
    );

    // Create user
    const user = await userModel.createLocalUser({
      name: name.trim(),
      email: cleanEmail,
      phone: cleanPhone,
      hashedPassword,
    });

    // Generate JWT
    const token = signToken(user);

    return res.status(201).json({
      message: "Account created successfully",
      token,
      user: sanitizeUser(user),
    });
  } catch (err) {
    console.error("signup error:", err);

    return res.status(500).json({
      message: "Failed to sign up",
    });
  }
};

// =====================================================
// LOGIN
// =====================================================
const login = async (req, res) => {
  const {
    email,
    password,
  } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      message:
        "Email and password are required",
    });
  }

  try {
    const cleanEmail =
      email.trim().toLowerCase();

    // Find user
    const user =
      await userModel.findByEmail(
        cleanEmail
      );

    if (!user || !user.password) {
      return res.status(401).json({
        message:
          "Invalid email or password",
      });
    }

    // Compare password
    const match =
      await bcrypt.compare(
        password,
        user.password
      );

    if (!match) {
      return res.status(401).json({
        message:
          "Invalid email or password",
      });
    }

    // Generate token
    const token = signToken(user);

    return res.json({
      message: "Login successful",
      token,
      user: sanitizeUser(user),
    });
  } catch (err) {
    console.error("login error:", err);

    return res.status(500).json({
      message: "Failed to log in",
    });
  }
};

// =====================================================
// GOOGLE LOGIN
// =====================================================
const googleLogin = async (req, res) => {
  const { credential } = req.body;

  if (!credential) {
    return res.status(400).json({
      message:
        "Google credential is required",
    });
  }

  try {
    // Verify Google credential
    const ticket =
      await googleClient.verifyIdToken({
        idToken: credential,
        audience:
          process.env.GOOGLE_CLIENT_ID,
      });

    const payload =
      ticket.getPayload();

    if (!payload) {
      return res.status(401).json({
        message:
          "Invalid Google credential",
      });
    }

    const {
      sub: googleId,
      email,
      name,
      picture,
    } = payload;

    if (!email) {
      return res.status(401).json({
        message:
          "Google account email not available",
      });
    }

    // -----------------------------------------------
    // FIND USER BY GOOGLE ID
    // -----------------------------------------------
    let user =
      await userModel.findByGoogleId(
        googleId
      );

    // -----------------------------------------------
    // USER NOT FOUND BY GOOGLE ID
    // -----------------------------------------------
    if (!user) {
      const existingByEmail =
        await userModel.findByEmail(
          email.toLowerCase()
        );

      // ---------------------------------------------
      // EXISTING EMAIL ACCOUNT
      // LINK GOOGLE ACCOUNT
      // ---------------------------------------------
      if (existingByEmail) {
        user =
          await userModel.linkGoogleId(
            existingByEmail.id,
            googleId,
            picture
          );
      }

      // ---------------------------------------------
      // CREATE NEW GOOGLE USER
      // ---------------------------------------------
      else {
        user =
          await userModel.createGoogleUser({
            name:
              name || "Google User",
            email:
              email.toLowerCase(),
            googleId,
            avatar: picture,
          });
      }
    }

    // -----------------------------------------------
    // CREATE TOKEN
    // -----------------------------------------------
    const token = signToken(user);

    return res.json({
      message: "Google login successful",
      token,
      user: sanitizeUser(user),
    });
  } catch (err) {
    console.error(
      "googleLogin error:",
      err
    );

    return res.status(401).json({
      message:
        "Invalid Google credential",
    });
  }
};

// =====================================================
// GET CURRENT USER
// GET /api/user/me
// =====================================================
const getMe = async (req, res) => {
  try {
    const user =
      await userModel.findById(
        req.user.id
      );

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    return res.json({
      user: sanitizeUser(user),
    });
  } catch (err) {
    console.error(
      "getMe error:",
      err
    );

    return res.status(500).json({
      message:
        "Failed to fetch profile",
    });
  }
};

// =====================================================
// UPDATE PHONE
// =====================================================
// Useful for Google users who don't have
// a phone number yet.
//
// PUT /api/user/phone
// Body:
// {
//   "phone": "9876543210"
// }
// =====================================================
const updatePhone = async (req, res) => {
  const { phone } = req.body;

  if (!phone || !phone.trim()) {
    return res.status(400).json({
      message:
        "Phone number is required",
    });
  }

  const cleanPhone = phone.trim();

  const phoneRegex = /^[6-9]\d{9}$/;

  if (!phoneRegex.test(cleanPhone)) {
    return res.status(400).json({
      message:
        "Enter a valid 10-digit phone number",
    });
  }

  try {
    const user =
      await userModel.updatePhone(
        req.user.id,
        cleanPhone
      );

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    return res.json({
      message:
        "Phone number updated successfully",
      user: sanitizeUser(user),
    });
  } catch (err) {
    console.error(
      "updatePhone error:",
      err
    );

    return res.status(500).json({
      message:
        "Failed to update phone number",
    });
  }
};

// =====================================================
// EXPORT CONTROLLERS
// =====================================================
module.exports = {
  signup,
  login,
  googleLogin,
  getMe,
  updatePhone,
};