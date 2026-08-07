const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { OAuth2Client } = require("google-auth-library");

const userModel = require("../models/userModel");

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const signToken = (user) =>
  jwt.sign({ id: user.id, email: user.email }, process.env.JWT_USER_SECRET, {
    expiresIn: "7d",
  });

const sanitizeUser = (user) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  avatar: user.avatar,
  provider: user.provider,
});

const signup = async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !name.trim()) return res.status(400).json({ message: "Name is required" });
  if (!email || !email.trim()) return res.status(400).json({ message: "Email is required" });
  if (!password || password.length < 6)
    return res.status(400).json({ message: "Password must be at least 6 characters" });

  try {
    const existing = await userModel.findByEmail(email.trim().toLowerCase());
    if (existing) {
      return res.status(409).json({ message: "An account with this email already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await userModel.createLocalUser({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      hashedPassword,
    });

    const token = signToken(user);
    res.status(201).json({ token, user: sanitizeUser(user) });
  } catch (err) {
    console.error("signup error:", err);
    res.status(500).json({ message: "Failed to sign up" });
  }
};

const login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required" });
  }

  try {
    const user = await userModel.findByEmail(email.trim().toLowerCase());
    if (!user || !user.password) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const token = signToken(user);
    res.json({ token, user: sanitizeUser(user) });
  } catch (err) {
    console.error("login error:", err);
    res.status(500).json({ message: "Failed to log in" });
  }
};

const googleLogin = async (req, res) => {
  const { credential } = req.body;

  if (!credential) {
    return res.status(400).json({ message: "Google credential is required" });
  }

  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    const { sub: googleId, email, name, picture } = payload;

    let user = await userModel.findByGoogleId(googleId);

    if (!user) {
      const existingByEmail = await userModel.findByEmail(email.toLowerCase());
      if (existingByEmail) {
        user = await userModel.linkGoogleId(existingByEmail.id, googleId, picture);
      } else {
        user = await userModel.createGoogleUser({
          name,
          email: email.toLowerCase(),
          googleId,
          avatar: picture,
        });
      }
    }

    const token = signToken(user);
    res.json({ token, user: sanitizeUser(user) });
  } catch (err) {
    console.error("googleLogin error:", err);
    res.status(401).json({ message: "Invalid Google credential" });
  }
};

const getMe = async (req, res) => {
  try {
    const user = await userModel.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json({ user: sanitizeUser(user) });
  } catch (err) {
    console.error("getMe error:", err);
    res.status(500).json({ message: "Failed to fetch profile" });
  }
};

module.exports = { signup, login, googleLogin, getMe };