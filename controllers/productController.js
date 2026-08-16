const productModel = require("../models/productModel");
const { uploadProductImage, deleteProductImage } = require("../utils/uploadToSupabase");

// All unit types supported by the storefront
const VALID_UNITS = ["weight", "pc", "ml", "daily", "weekly", "monthly"];

// Normalize unit - handles undefined/null and ensures valid unit
const normalizeUnit = (unit) => {
  if (!unit) return "weight";
  return VALID_UNITS.includes(unit) ? unit : "weight";
};

const validateProductBody = (body, hasFile) => {
  const errors = {};

  if (!body.name || !body.name.trim()) errors.name = "Product name is required";
  if (!body.category || !body.category.trim()) errors.category = "Category is required";
  if (!hasFile && (!body.image || !body.image.trim())) {
    errors.image = "Image is required";
  }

  if (body.stock === undefined || body.stock === null || Number(body.stock) < 0) {
    errors.stock = "Enter a valid stock quantity";
  }

  if (!body.status || !["active", "inactive"].includes(body.status)) {
    errors.status = "Status must be 'active' or 'inactive'";
  }

  if (
    body.discount_percent !== undefined &&
    body.discount_percent !== "" &&
    (Number.isNaN(Number(body.discount_percent)) ||
      Number(body.discount_percent) < 0 ||
      Number(body.discount_percent) > 100)
  ) {
    errors.discount_percent = "Discount must be between 0 and 100";
  }

  let variants = body.variants;
  if (typeof variants === "string") {
    try {
      variants = JSON.parse(variants);
    } catch {
      variants = null;
    }
  }

  if (!Array.isArray(variants) || variants.length === 0) {
    errors.variants = "At least one product option is required";
  } else {
    const invalidVariant = variants.some((v) => {
      const hasValidLabel = v.label && String(v.label).trim();
      const hasValidPrice = v.price !== undefined && v.price !== null && Number(v.price) >= 0;
      return !hasValidLabel || !hasValidPrice;
    });
    
    if (invalidVariant) {
      errors.variants = "Every option needs a valid label and price";
    }
  }

  return { errors, parsedVariants: variants };
};

// GET /api/admin/products?search=apple
const getProducts = async (req, res) => {
  try {
    const search = req.query.search || "";
    const products = await productModel.findAll(search);
    res.json({ products });
  } catch (err) {
    console.error("getProducts error:", err);
    res.status(500).json({ message: "Failed to fetch products" });
  }
};

// GET /api/admin/products/special-offers
const getSpecialOffers = async (req, res) => {
  try {
    const products = await productModel.findSpecialOffers();
    res.json({ products });
  } catch (err) {
    console.error("getSpecialOffers error:", err);
    res.status(500).json({ message: "Failed to fetch special offers" });
  }
};

// GET /api/admin/products/:id
const getProductById = async (req, res) => {
  try {
    const product = await productModel.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }
    res.json({ product });
  } catch (err) {
    console.error("getProductById error:", err);
    res.status(500).json({ message: "Failed to fetch product" });
  }
};

// POST /api/admin/products
const createProduct = async (req, res) => {
  const { errors, parsedVariants } = validateProductBody(req.body, !!req.file);
  if (Object.keys(errors).length > 0) {
    return res.status(400).json({ errors });
  }

  let uploadedUrl = null;

  try {
    const { name, category, stock, status, is_special_offer, discount_percent } = req.body;

    let imageUrl = req.body.image ? req.body.image.trim() : null;
    if (req.file) {
      imageUrl = await uploadProductImage(req.file);
      uploadedUrl = imageUrl;
    }

    // Ensure variants have proper units and labels
    const normalizedVariants = parsedVariants.map((v) => {
      const unit = normalizeUnit(v.unit);
      return {
        unit: unit,
        label: String(v.label).trim(),
        price: Number(v.price),
      };
    });

    const product = await productModel.create({
      name: name.trim(),
      category,
      image: imageUrl,
      stock: Number(stock),
      status,
      is_special_offer: is_special_offer === "true" || is_special_offer === true,
      discount_percent: discount_percent ? Number(discount_percent) : 0,
      variants: normalizedVariants,
    });
    res.status(201).json({ product, message: "Product created" });
  } catch (err) {
    console.error("createProduct error:", err);
    if (uploadedUrl) await deleteProductImage(uploadedUrl);
    res.status(500).json({ message: "Failed to create product" });
  }
};

// PUT /api/admin/products/:id
const updateProduct = async (req, res) => {
  const { errors, parsedVariants } = validateProductBody(req.body, !!req.file);
  if (Object.keys(errors).length > 0) {
    return res.status(400).json({ errors });
  }

  let uploadedUrl = null;

  try {
    const existing = await productModel.findById(req.params.id);
    if (!existing) {
      return res.status(404).json({ message: "Product not found" });
    }

    const { name, category, stock, status, is_special_offer, discount_percent } = req.body;

    let imageUrl = req.body.image ? req.body.image.trim() : existing.image;
    if (req.file) {
      imageUrl = await uploadProductImage(req.file);
      uploadedUrl = imageUrl;
    }

    // Ensure variants have proper units and labels
    const normalizedVariants = parsedVariants.map((v) => {
      const unit = normalizeUnit(v.unit);
      return {
        unit: unit,
        label: String(v.label).trim(),
        price: Number(v.price),
      };
    });

    const product = await productModel.update(req.params.id, {
      name: name.trim(),
      category,
      image: imageUrl,
      stock: Number(stock),
      status,
      is_special_offer: is_special_offer === "true" || is_special_offer === true,
      discount_percent: discount_percent ? Number(discount_percent) : 0,
      variants: normalizedVariants,
    });

    if (req.file && existing.image) {
      await deleteProductImage(existing.image);
    }

    res.json({ product, message: "Product updated" });
  } catch (err) {
    console.error("updateProduct error:", err);
    if (uploadedUrl) await deleteProductImage(uploadedUrl);
    res.status(500).json({ message: "Failed to update product" });
  }
};

// DELETE /api/admin/products/:id
const deleteProduct = async (req, res) => {
  try {
    const existing = await productModel.findById(req.params.id);
    if (!existing) {
      return res.status(404).json({ message: "Product not found" });
    }

    const deleted = await productModel.remove(req.params.id);
    if (!deleted) {
      return res.status(404).json({ message: "Product not found" });
    }

    if (existing.image) {
      await deleteProductImage(existing.image);
    }

    res.json({ message: "Product deleted" });
  } catch (err) {
    console.error("deleteProduct error:", err);
    res.status(500).json({ message: "Failed to delete product" });
  }
};

module.exports = {
  getProducts,
  getSpecialOffers,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
};