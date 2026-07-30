const bcrypt = require("bcryptjs");
const UserModel = require("../models/userModel");
const { validateStaffPayload, throwValidation } = require("../middleware/validators");

const SALT_ROUNDS = 10;

const userController = {
  async getAll(req, res, next) {
    try {
      const users = await UserModel.findAll();
      res.json({ data: users });
    } catch (err) {
      next(err);
    }
  },

  async getById(req, res, next) {
    try {
      const user = await UserModel.findById(req.params.id);
      if (!user) return res.status(404).json({ message: "Staff member not found" });
      res.json({ data: user });
    } catch (err) {
      next(err);
    }
  },

  async create(req, res, next) {
    try {
      validateStaffPayload(req.body, { isUpdate: false });

      const existing = await UserModel.findByEmail(req.body.email);
      if (existing) throwValidation({ email: "A staff member with this email already exists" });

      const hashedPassword = await bcrypt.hash(req.body.password, SALT_ROUNDS);

      const user = await UserModel.create({
        name: req.body.name.trim(),
        email: req.body.email.trim().toLowerCase(),
        mobileNumber: req.body.mobileNumber.trim(),
        role: req.body.role,
        password: hashedPassword,
        status: req.body.status || "Active",
      });

      res.status(201).json({ data: user });
    } catch (err) {
      next(err);
    }
  },

  async update(req, res, next) {
    try {
      const { id } = req.params;
      const existingUser = await UserModel.findById(id);
      if (!existingUser) return res.status(404).json({ message: "Staff member not found" });

      validateStaffPayload(req.body, { isUpdate: true });

      if (req.body.email) {
        const emailTaken = await UserModel.findByEmail(req.body.email, id);
        if (emailTaken) throwValidation({ email: "A staff member with this email already exists" });
      }

      const fields = {
        name: req.body.name?.trim(),
        email: req.body.email?.trim().toLowerCase(),
        mobileNumber: req.body.mobileNumber?.trim(),
        role: req.body.role,
        status: req.body.status,
      };

      if (req.body.password) {
        fields.password = await bcrypt.hash(req.body.password, SALT_ROUNDS);
      }

      const updated = await UserModel.update(id, fields);
      res.json({ data: updated });
    } catch (err) {
      next(err);
    }
  },

  async remove(req, res, next) {
    try {
      const deleted = await UserModel.remove(req.params.id);
      if (!deleted) return res.status(404).json({ message: "Staff member not found" });
      res.json({ message: "Staff member deleted" });
    } catch (err) {
      next(err);
    }
  },
};

module.exports = userController;
