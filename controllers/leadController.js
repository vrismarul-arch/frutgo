const LeadModel = require("../models/leadModel");
const { validateLeadPayload } = require("../middleware/validators");

const leadController = {
  async getAll(req, res, next) {
    try {
      // Non-admin staff only see leads assigned to them.
      // Admins (and any account that isn't "staff", e.g. future roles) see everything.
      const isRestrictedStaff = req.user?.accountType === "staff" && req.user?.role !== "Admin";
      const filter = isRestrictedStaff ? { assignedTo: req.user.id } : {};

      const leads = await LeadModel.findAll(filter);
      res.json({ data: leads });
    } catch (err) {
      next(err);
    }
  },

  async getById(req, res, next) {
    try {
      const lead = await LeadModel.findById(req.params.id);
      if (!lead) return res.status(404).json({ message: "Lead not found" });

      // Same restriction on a direct fetch-by-id, so it can't be bypassed by guessing an id
      const isRestrictedStaff = req.user?.accountType === "staff" && req.user?.role !== "Admin";
      if (isRestrictedStaff && lead.assignedTo !== req.user.id) {
        return res.status(403).json({ message: "You don't have access to this lead" });
      }

      res.json({ data: lead });
    } catch (err) {
      next(err);
    }
  },

  async create(req, res, next) {
    try {
      validateLeadPayload(req.body);

      const lead = await LeadModel.create({
        businessName: req.body.businessName?.trim(),
        gstNumber: req.body.gstNumber?.trim(),
        primaryContactName: req.body.primaryContactName.trim(),
        email: req.body.email.trim().toLowerCase(),
        mobileNumber: req.body.mobileNumber.trim(),
        typeOfLeads: req.body.typeOfLeads,
        addressLine1: req.body.addressLine1.trim(),
        addressLine2: req.body.addressLine2?.trim(),
        city: req.body.city.trim(),
        state: req.body.state.trim(),
        pincode: req.body.pincode.trim(),
        country: req.body.country?.trim() || "India",
        accountStatus: req.body.accountStatus || "Lead",
        sourceType: req.body.sourceType,
        referralPersonName: req.body.referralPersonName?.trim(),
        basicServices: req.body.basicServices || [],
        addonServices: req.body.addonServices || [],
        addNote: req.body.addNote?.trim(),
        assignedTo: req.body.assignedTo || null,
      });

      res.status(201).json({ data: lead });
    } catch (err) {
      next(err);
    }
  },

  async update(req, res, next) {
    try {
      const { id } = req.params;
      const existingLead = await LeadModel.findById(id);
      if (!existingLead) return res.status(404).json({ message: "Lead not found" });

      const isRestrictedStaff = req.user?.accountType === "staff" && req.user?.role !== "Admin";
      if (isRestrictedStaff && existingLead.assignedTo !== req.user.id) {
        return res.status(403).json({ message: "You don't have access to this lead" });
      }

      validateLeadPayload(req.body);

      const updated = await LeadModel.update(id, {
        businessName: req.body.businessName?.trim(),
        gstNumber: req.body.gstNumber?.trim(),
        primaryContactName: req.body.primaryContactName?.trim(),
        email: req.body.email?.trim().toLowerCase(),
        mobileNumber: req.body.mobileNumber?.trim(),
        typeOfLeads: req.body.typeOfLeads,
        addressLine1: req.body.addressLine1?.trim(),
        addressLine2: req.body.addressLine2?.trim(),
        city: req.body.city?.trim(),
        state: req.body.state?.trim(),
        pincode: req.body.pincode?.trim(),
        country: req.body.country?.trim(),
        accountStatus: req.body.accountStatus,
        sourceType: req.body.sourceType,
        referralPersonName: req.body.referralPersonName?.trim(),
        basicServices: req.body.basicServices,
        addonServices: req.body.addonServices,
        addNote: req.body.addNote?.trim(),
        assignedTo: req.body.assignedTo,
      });

      res.json({ data: updated });
    } catch (err) {
      next(err);
    }
  },

  async remove(req, res, next) {
    try {
      const existingLead = await LeadModel.findById(req.params.id);
      if (!existingLead) return res.status(404).json({ message: "Lead not found" });

      const isRestrictedStaff = req.user?.accountType === "staff" && req.user?.role !== "Admin";
      if (isRestrictedStaff && existingLead.assignedTo !== req.user.id) {
        return res.status(403).json({ message: "You don't have access to this lead" });
      }

      await LeadModel.remove(req.params.id);
      res.json({ message: "Lead deleted" });
    } catch (err) {
      next(err);
    }
  },
};

module.exports = leadController;