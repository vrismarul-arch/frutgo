const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const env = require("../config/env");
const UserModel = require("../models/userModel");
const ClientModel = require("../models/clientModel");
const { validateProfilePayload, throwValidation } = require("../middleware/validators");

const TOKEN_EXPIRY = "7d";
const SALT_ROUNDS = 10;

function signToken(payload) {
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: TOKEN_EXPIRY });
}

function modelFor(accountType) {
  return accountType === "staff" ? UserModel : ClientModel;
}

const authController = {
  async login(req, res, next) {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        const err = new Error("Validation failed");
        err.status = 422;
        err.errors = {
          ...(email ? {} : { email: "Please enter your email" }),
          ...(password ? {} : { password: "Please enter your password" }),
        };
        throw err;
      }

      const normalizedEmail = email.trim().toLowerCase();

      // Look up staff first, then clients
      let account = await UserModel.findAuthByEmail(normalizedEmail);
      let accountType = "staff";

      if (!account) {
        account = await ClientModel.findAuthByEmail(normalizedEmail);
        accountType = "client";
      }

      if (!account) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      if (account.status === "Inactive") {
        return res.status(403).json({ message: "This account has been deactivated" });
      }

      const passwordMatches = await bcrypt.compare(password, account.password);
      if (!passwordMatches) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      const token = signToken({
        id: account.id,
        email: account.email,
        role: account.role,
        accountType,
      });

      const { password: _omit, ...safeAccount } = account;

      res.json({
        token,
        user: safeAccount,
        accountType,
      });
    } catch (err) {
      next(err);
    }
  },

  async me(req, res, next) {
    try {
      const { id, accountType } = req.user;
      const account = await modelFor(accountType).findById(id);

      if (!account) return res.status(404).json({ message: "Account not found" });

      res.json({ data: account, accountType });
    } catch (err) {
      next(err);
    }
  },

  async updateMe(req, res, next) {
    try {
      const { id, accountType } = req.user;
      const Model = modelFor(accountType);

      validateProfilePayload(req.body, { requireCurrentPassword: true });

      // Email uniqueness check, excluding self
      const emailTaken = await Model.findByEmail(req.body.email.trim().toLowerCase(), id);
      if (emailTaken) throwValidation({ email: "This email is already in use" });

      const fields = {
        name: req.body.name.trim(),
        email: req.body.email.trim().toLowerCase(),
        mobileNumber: req.body.mobileNumber.trim(),
      };

      // Changing the password requires re-entering the current one first
      if (req.body.newPassword) {
        const currentAccount = await Model.findAuthById(id);
        const passwordMatches = currentAccount
          ? await bcrypt.compare(req.body.currentPassword, currentAccount.password)
          : false;

        if (!passwordMatches) {
          throwValidation({ currentPassword: "Current password is incorrect" });
        }

        fields.password = await bcrypt.hash(req.body.newPassword, SALT_ROUNDS);
      }

      const updated = await Model.update(id, fields);
      res.json({ data: updated, accountType });
    } catch (err) {
      next(err);
    }
  },
};

module.exports = authController;