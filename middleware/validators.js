const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MOBILE_RE = /^[0-9]{10}$/;

const STAFF_ROLES = ["Admin", "Manager", "Editor", "Viewer"];
const CLIENT_ROLES = ["Client Admin", "Client User"];
const BUSINESS_ACCOUNT_TYPES = ["Individual", "Business"];
const STATUSES = ["Active", "Inactive"];

function throwValidation(errors) {
  const err = new Error("Validation failed");
  err.errors = errors;
  err.status = 422;
  throw err;
}

function validateStaffPayload(body, { isUpdate = false } = {}) {
  const errors = {};

  if (!body.role || !STAFF_ROLES.includes(body.role)) {
    errors.role = "Please select a valid role";
  }
  if (!body.name || !String(body.name).trim()) {
    errors.name = "Please enter the name";
  }
  if (!body.email || !String(body.email).trim()) {
    errors.email = "Please enter the email";
  } else if (!EMAIL_RE.test(body.email)) {
    errors.email = "Enter a valid email";
  }
  if (!body.mobileNumber || !String(body.mobileNumber).trim()) {
    errors.mobileNumber = "Please enter the mobile number";
  } else if (!MOBILE_RE.test(body.mobileNumber)) {
    errors.mobileNumber = "Enter a valid 10-digit mobile number";
  }
  if (!isUpdate || body.password) {
    if (!body.password) {
      errors.password = "Please enter a password";
    } else if (String(body.password).length < 6) {
      errors.password = "Password must be at least 6 characters";
    }
  }
  if (body.status && !STATUSES.includes(body.status)) {
    errors.status = "Please select a valid status";
  }

  if (Object.keys(errors).length) throwValidation(errors);
}

function validateClientPayload(body, { isUpdate = false } = {}) {
  const errors = {};

  if (!body.role || !CLIENT_ROLES.includes(body.role)) {
    errors.role = "Please select a valid role";
  }
  if (!body.businessAccount || !BUSINESS_ACCOUNT_TYPES.includes(body.businessAccount)) {
    errors.businessAccount = "Please select an account type";
  }
  if (body.businessAccount === "Business" && !body.business) {
    errors.business = "Please select a business";
  }
  if (!body.name || !String(body.name).trim()) {
    errors.name = "Please enter the name";
  }
  if (!body.email || !String(body.email).trim()) {
    errors.email = "Please enter the email";
  } else if (!EMAIL_RE.test(body.email)) {
    errors.email = "Enter a valid email";
  }
  if (!body.mobileNumber || !String(body.mobileNumber).trim()) {
    errors.mobileNumber = "Please enter the mobile number";
  } else if (!MOBILE_RE.test(body.mobileNumber)) {
    errors.mobileNumber = "Enter a valid 10-digit mobile number";
  }
  if (!isUpdate || body.password) {
    if (!body.password) {
      errors.password = "Please enter a password";
    } else if (String(body.password).length < 6) {
      errors.password = "Password must be at least 6 characters";
    }
  }
  if (body.status && !STATUSES.includes(body.status)) {
    errors.status = "Please select a valid status";
  }

  if (Object.keys(errors).length) throwValidation(errors);
}

function validateBusinessPayload(body) {
  const errors = {};
  if (!body.name || !String(body.name).trim()) {
    errors.name = "Please enter the business name";
  }
  if (Object.keys(errors).length) throwValidation(errors);
}

const LEAD_TYPES = ["Wedding", "Engagement", "Pre-Wedding", "Corporate Event", "Other"];
const ACCOUNT_STATUSES = [
  "Target Leads",
  "Lead",
  "Enquiry",
  "Quotations Sent",
  "Converted",
  "Closed Accounts",
];
const SOURCE_TYPES = ["Referral", "Social Media", "Website", "Walk-in", "Advertisement", "Vrism"];
const PINCODE_RE = /^[0-9]{6}$/;

function validateLeadPayload(body) {
  const errors = {};

  if (!body.primaryContactName || !String(body.primaryContactName).trim()) {
    errors.primaryContactName = "Please enter the contact name";
  }
  if (!body.email || !String(body.email).trim()) {
    errors.email = "Please enter the email";
  } else if (!EMAIL_RE.test(body.email)) {
    errors.email = "Enter a valid email";
  }
  if (!body.mobileNumber || !String(body.mobileNumber).trim()) {
    errors.mobileNumber = "Please enter the mobile number";
  } else if (!MOBILE_RE.test(body.mobileNumber)) {
    errors.mobileNumber = "Enter a valid 10-digit mobile number";
  }
  if (!body.typeOfLeads || !LEAD_TYPES.includes(body.typeOfLeads)) {
    errors.typeOfLeads = "Please select the lead type";
  }
  if (!body.addressLine1 || !String(body.addressLine1).trim()) {
    errors.addressLine1 = "Please enter address line 1";
  }
  if (!body.city || !String(body.city).trim()) {
    errors.city = "Please enter city";
  }
  if (!body.state || !String(body.state).trim()) {
    errors.state = "Please enter state";
  }
  if (!body.pincode || !String(body.pincode).trim()) {
    errors.pincode = "Please enter pincode";
  } else if (!PINCODE_RE.test(body.pincode)) {
    errors.pincode = "Enter a valid 6-digit pincode";
  }
  if (!body.country || !String(body.country).trim()) {
    errors.country = "Please enter country";
  }
  if (!body.accountStatus || !ACCOUNT_STATUSES.includes(body.accountStatus)) {
    errors.accountStatus = "Please select account status";
  }
  if (!body.sourceType || !SOURCE_TYPES.includes(body.sourceType)) {
    errors.sourceType = "Please select source type";
  }
  if (body.sourceType === "Referral" && !String(body.referralPersonName || "").trim()) {
    errors.referralPersonName = "Please enter the referral person's name";
  }

  if (Object.keys(errors).length) throwValidation(errors);
}

const CATEGORIES = ["Basic Service", "Add-on Service"];

function validatePlan(plan, index, errors) {
  if (!plan || typeof plan !== "object") {
    errors[`plans.${index}`] = "Invalid plan entry";
    return;
  }
  if (!plan.planName || !String(plan.planName).trim()) {
    errors[`plans.${index}.planName`] = "Please enter the plan name";
  }
  if (plan.price === undefined || plan.price === null || plan.price === "") {
    errors[`plans.${index}.price`] = "Please enter the price";
  } else if (Number.isNaN(Number(plan.price)) || Number(plan.price) < 0) {
    errors[`plans.${index}.price`] = "Enter a valid price";
  }
  if (!plan.includedDetails || !String(plan.includedDetails).trim()) {
    errors[`plans.${index}.includedDetails`] = "Please describe what's included";
  }
}

function validateServicePayload(body) {
  const errors = {};

  if (!body.serviceName || !String(body.serviceName).trim()) {
    errors.serviceName = "Please enter the service name";
  }
  if (!body.category || !CATEGORIES.includes(body.category)) {
    errors.category = "Please select a category";
  }
  if (body.status && !STATUSES.includes(body.status)) {
    errors.status = "Please select a valid status";
  }
  if (!Array.isArray(body.plans) || body.plans.length === 0) {
    errors.plans = "Please add at least one plan";
  } else {
    body.plans.forEach((plan, idx) => validatePlan(plan, idx, errors));
  }

  if (Object.keys(errors).length) throwValidation(errors);
}

module.exports = {
  validateStaffPayload,
  validateClientPayload,
  validateBusinessPayload,
  validateLeadPayload,
  validateServicePayload,
  throwValidation,
};