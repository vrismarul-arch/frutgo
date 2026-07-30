const bcrypt = require("bcryptjs");
const ClientModel = require("../models/clientModel");
const BusinessModel = require("../models/businessModel");
const { validateClientPayload, throwValidation } = require("../middleware/validators");

const SALT_ROUNDS = 10;

const clientController = {
  async getAll(req, res, next) {
    try {
      const clients = await ClientModel.findAll();
      res.json({ data: clients });
    } catch (err) {
      next(err);
    }
  },

  async getById(req, res, next) {
    try {
      const client = await ClientModel.findById(req.params.id);
      if (!client) return res.status(404).json({ message: "Client not found" });
      res.json({ data: client });
    } catch (err) {
      next(err);
    }
  },

  async create(req, res, next) {
    try {
      validateClientPayload(req.body, { isUpdate: false });

      const existingEmail = await ClientModel.findByEmail(req.body.email);
      if (existingEmail) throwValidation({ email: "A client with this email already exists" });

      if (req.body.businessAccount === "Business") {
        const business = await BusinessModel.findByName(req.body.business);
        if (!business) throwValidation({ business: "Selected business does not exist" });
      }

      const hashedPassword = await bcrypt.hash(req.body.password, SALT_ROUNDS);

      const client = await ClientModel.create({
        name: req.body.name.trim(),
        email: req.body.email.trim().toLowerCase(),
        mobileNumber: req.body.mobileNumber.trim(),
        role: req.body.role,
        businessAccount: req.body.businessAccount,
        business: req.body.business || null,
        password: hashedPassword,
        status: req.body.status || "Active",
      });

      res.status(201).json({ data: client });
    } catch (err) {
      next(err);
    }
  },

  async update(req, res, next) {
    try {
      const { id } = req.params;
      const existingClient = await ClientModel.findById(id);
      if (!existingClient) return res.status(404).json({ message: "Client not found" });

      validateClientPayload(req.body, { isUpdate: true });

      if (req.body.email) {
        const emailTaken = await ClientModel.findByEmail(req.body.email, id);
        if (emailTaken) throwValidation({ email: "A client with this email already exists" });
      }

      if (req.body.businessAccount === "Business" && req.body.business) {
        const business = await BusinessModel.findByName(req.body.business);
        if (!business) throwValidation({ business: "Selected business does not exist" });
      }

      const fields = {
        name: req.body.name?.trim(),
        email: req.body.email?.trim().toLowerCase(),
        mobileNumber: req.body.mobileNumber?.trim(),
        role: req.body.role,
        businessAccount: req.body.businessAccount,
        business: req.body.businessAccount === "Individual" ? null : req.body.business,
        status: req.body.status,
      };

      if (req.body.password) {
        fields.password = await bcrypt.hash(req.body.password, SALT_ROUNDS);
      }

      const updated = await ClientModel.update(id, fields);
      res.json({ data: updated });
    } catch (err) {
      next(err);
    }
  },

  async remove(req, res, next) {
    try {
      const deleted = await ClientModel.remove(req.params.id);
      if (!deleted) return res.status(404).json({ message: "Client not found" });
      res.json({ message: "Client deleted" });
    } catch (err) {
      next(err);
    }
  },
};

module.exports = clientController;
