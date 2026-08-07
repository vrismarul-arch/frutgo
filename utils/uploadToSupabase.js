const supabaseAdmin = require("../config/supabaseClient");
const path = require("path");
const crypto = require("crypto");

const BUCKET = "fresh";

const uploadProductImage = async (file) => {
  const ext = path.extname(file.originalname) || ".jpg";
  const fileName = `products/${Date.now()}-${crypto.randomBytes(6).toString("hex")}${ext}`;

  const { error } = await supabaseAdmin.storage
    .from(BUCKET)
    .upload(fileName, file.buffer, {
      contentType: file.mimetype,
      upsert: false,
    });

  if (error) throw error;

  const { data } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(fileName);
  return data.publicUrl;
};

const deleteProductImage = async (publicUrl) => {
  try {
    const marker = `/object/public/${BUCKET}/`;
    const idx = publicUrl.indexOf(marker);
    if (idx === -1) return;
    const filePath = publicUrl.slice(idx + marker.length);
    await supabaseAdmin.storage.from(BUCKET).remove([filePath]);
  } catch (err) {
    console.error("deleteProductImage error:", err);
  }
};

module.exports = { uploadProductImage, deleteProductImage };