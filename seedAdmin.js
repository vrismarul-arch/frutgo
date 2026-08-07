const bcrypt = require("bcryptjs");
const pool = require("./config/db");
require("dotenv").config();

const ADMIN_EMAIL = "admin@gmail.com";
const ADMIN_PASSWORD = "Fruit@123";

const seedAdmin = async () => {
  try {
    const [existing] = await pool.query(`SELECT id FROM admins WHERE email = ?`, [ADMIN_EMAIL]);
    const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 10);

    if (existing.length > 0) {
      await pool.query(`UPDATE admins SET password = ? WHERE email = ?`, [
        hashedPassword,
        ADMIN_EMAIL,
      ]);
      console.log(`✅ Admin ${ADMIN_EMAIL} already existed — password reset.`);
    } else {
      await pool.query(`INSERT INTO admins (email, password, name) VALUES (?, ?, ?)`, [
        ADMIN_EMAIL,
        hashedPassword,
        "Admin",
      ]);
      console.log(`✅ Admin account created: ${ADMIN_EMAIL}`);
    }
  } catch (err) {
    console.error("❌ Failed to seed admin:", err);
  } finally {
    process.exit(0);
  }
};

seedAdmin();