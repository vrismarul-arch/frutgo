const ServiceModel = require("../models/serviceModel");
const { validateServicePayload } = require("../middleware/validators");

const serviceController = {
  async getAll(req, res, next) {
    try {
      const services = await ServiceModel.findAll();
      res.json({ data: services });
    } catch (err) {
      next(err);
    }
  },

  async getById(req, res, next) {
    try {
      const service = await ServiceModel.findById(req.params.id);
      if (!service) return res.status(404).json({ message: "Service not found" });
      res.json({ data: service });
    } catch (err) {
      next(err);
    }
  },

  async create(req, res, next) {
    try {
      validateServicePayload(req.body);

      const service = await ServiceModel.create({
        serviceName: req.body.serviceName.trim(),
        category: req.body.category,
        status: req.body.status || "Active",
        plans: (req.body.plans || []).map((p) => ({
          planName: String(p.planName).trim(),
          price: Number(p.price),
          includedDetails: String(p.includedDetails).trim(),
        })),
      });

      res.status(201).json({ data: service });
    } catch (err) {
      next(err);
    }
  },

  async update(req, res, next) {
    try {
      const { id } = req.params;
      const existingService = await ServiceModel.findById(id);
      if (!existingService) return res.status(404).json({ message: "Service not found" });

      validateServicePayload(req.body);

      const updated = await ServiceModel.update(id, {
        serviceName: req.body.serviceName?.trim(),
        category: req.body.category,
        status: req.body.status,
        plans: (req.body.plans || []).map((p) => ({
          planName: String(p.planName).trim(),
          price: Number(p.price),
          includedDetails: String(p.includedDetails).trim(),
        })),
      });

      res.json({ data: updated });
    } catch (err) {
      next(err);
    }
  },

  async remove(req, res, next) {
    try {
      const deleted = await ServiceModel.remove(req.params.id);
      if (!deleted) return res.status(404).json({ message: "Service not found" });
      res.json({ message: "Service deleted" });
    } catch (err) {
      next(err);
    }
  },
};

module.exports = serviceController;