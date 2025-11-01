const pool = require("../config/db");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const slugify = require("slugify");

const saltRounds = 10;
const allowedRoles = ['admin', 'superadmin'];

// Get all admins who are not deleted
exports.getAllAdmins = (req, res) => {
  pool.query("SELECT * FROM admin WHERE isDeleted = 0", (err, result) => {
    if (err) return res.status(500).json({ error: "Database error", details: err.message });
    res.json(result);
  });
};

// Create a new admin
exports.createAdmin = async (req, res) => {
  try {
    const { fname, lname, email, password, role } = req.body;

    // Basic validation
    if (!fname || !lname || !email || !password || !role) {
      return res.status(400).json({ error: "All fields are required" });
    }

    if (!allowedRoles.includes(role)) {
      return res.status(400).json({ error: "Invalid role. Allowed values are 'admin' or 'superadmin'." });
    }

    // Check if email already exists
    const checkQuery = "SELECT id FROM admin WHERE email = ? AND isDeleted = 0";
    const [existingAdmins] = await pool.promise().query(checkQuery, [email]);
    if (existingAdmins.length > 0) {
      return res.status(409).json({ error: "Admin with this email already exists" });
    }

    const slug = slugify(`${fname} ${lname}`, { lower: true });
    const secureKey = crypto.randomBytes(32).toString("hex");
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    const insertQuery = `
      INSERT INTO admin 
      (slug, fname, lname, email, password, role, secureKey, isDeleted, createdOn, modifiedOn) 
      VALUES (?, ?, ?, ?, ?, ?, ?, 0, NOW(), NOW())
    `;
    const values = [slug, fname, lname, email, hashedPassword, role, secureKey];

    const [result] = await pool.promise().query(insertQuery, values);

    res.status(201).json({
      success: true,
      message: "Admin created successfully",
      adminId: result.insertId
    });

  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ 
      error: "Internal server error", 
      details: process.env.NODE_ENV === 'development' ? error.message : undefined 
    });
  }
};

// Get admin by ID
exports.getAdminById = (req, res) => {
  const adminId = req.params.id;

  const query = "SELECT * FROM admin WHERE id = ? AND isDeleted = 0";
  pool.query(query, [adminId], (err, results) => {
    if (err) return res.status(500).json({ error: "Database error", details: err.message });

    if (results.length === 0) {
      return res.status(404).json({ error: "Admin not found" });
    }

    res.json(results[0]);
  });
};

// Update admin by ID
exports.updateAdmin = async (req, res) => {
  const adminId = req.params.id;
  const { fname, lname, email, password, role } = req.body;

  if (!allowedRoles.includes(role)) {
    return res.status(400).json({ error: "Invalid role. Allowed values are 'admin' or 'superadmin'." });
  }

  try {
    let updateQuery = `
      UPDATE admin 
      SET fname = ?, lname = ?, email = ?, role = ?, slug = ?, modifiedOn = NOW()
    `;
    const slug = slugify(`${fname} ${lname}`, { lower: true });
    const values = [fname, lname, email, role, slug];

    if (password) {
      const hashedPassword = await bcrypt.hash(password, saltRounds);
      updateQuery += `, password = ?`;
      values.push(hashedPassword);
    }

    updateQuery += ` WHERE id = ? AND isDeleted = 0`;
    values.push(adminId);

    pool.query(updateQuery, values, (err, result) => {
      if (err) return res.status(500).json({ error: "Failed to update admin", details: err.message });

      if (result.affectedRows === 0) {
        return res.status(404).json({ error: "Admin not found or already deleted" });
      }

      res.json({ success: true, message: "Admin updated successfully" });
    });
  } catch (error) {
    res.status(500).json({ error: "Internal server error", details: error.message });
  }
};

// Soft delete admin
exports.deleteAdmin = (req, res) => {
  const adminId = req.params.id;

  const query = "UPDATE admin SET isDeleted = 1, modifiedOn = NOW() WHERE id = ?";
  pool.query(query, [adminId], (err, result) => {
    if (err) return res.status(500).json({ error: "Failed to delete admin", details: err.message });

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Admin not found or already deleted" });
    }

    res.json({ success: true, message: "Admin deleted successfully (soft delete)" });
  });
};
