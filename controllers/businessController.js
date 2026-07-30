const BusinessModel = require("../models/businessModel");
const { validateBusinessPayload, throwValidation } = require("../middleware/validators");

const businessController = {
  async getAll(req, res, next) {
    try {
      const businesses = await BusinessModel.findAll();
      res.json({ data: businesses });
    } catch (err) {
      next(err);
    }
  },

  async getById(req, res, next) {
    try {
      const business = await BusinessModel.findById(req.params.id);
      if (!business) return res.status(404).json({ message: "Business not found" });
      res.json({ data: business });
    } catch (err) {
      next(err);
    }
  },

  async create(req, res, next) {
    try {
      validateBusinessPayload(req.body);

      const existing = await BusinessModel.findByName(req.body.name);
      if (existing) throwValidation({ name: "A business with this name already exists" });

      const business = await BusinessModel.create({ name: req.body.name.trim() });
      res.status(201).json({ data: business });
    } catch (err) {
      next(err);
    }
  },

  async update(req, res, next) {
    try {
      const { id } = req.params;
      const existingBusiness = await BusinessModel.findById(id);
      if (!existingBusiness) return res.status(404).json({ message: "Business not found" });

      validateBusinessPayload(req.body);

      const nameTaken = await BusinessModel.findByName(req.body.name, id);
      if (nameTaken) throwValidation({ name: "A business with this name already exists" });

      const updated = await BusinessModel.update(id, { name: req.body.name.trim() });
      res.json({ data: updated });
    } catch (err) {
      next(err);
    }
  },

  async remove(req, res, next) {
    try {
      const deleted = await BusinessModel.remove(req.params.id);
      if (!deleted) return res.status(404).json({ message: "Business not found" });
      res.json({ message: "Business deleted" });
    } catch (err) {
      next(err);
    }
  },
};

module.exports = businessController;
