// controllers/galleryController.js
const db = require("../config/db"); // Your existing DB connection
const util = require("util");

const query = util.promisify(db.query).bind(db); // promisify MySQL queries

// -------------------------------
// CREATE: Insert one row per image (BLOB storage)
// -------------------------------
exports.createGallery = async (req, res) => {
  try {
    const { title, description = "", date } = req.body;
    const files = req.files || [];

    if (!title || !date) {
      return res.status(400).json({ message: "Missing title or date." });
    }
    if (!files.length) {
      return res.status(400).json({ message: "Please upload at least one image." });
    }

    const insertSql = `
      INSERT INTO \`Gallery\`
      (title, description, eventDate, image, imageName, imageType)
      VALUES (?, ?, ?, ?, ?, ?)
    `;

    for (const file of files) {
      // file.buffer contains the binary data (since we use multer.memoryStorage)
      await query(insertSql, [
        title,
        description,
        date,
        file.buffer, // ✅ Directly use memory buffer
        file.originalname,
        file.mimetype,
      ]);
    }

    return res.json({ success: true, message: "Gallery created successfully." });
  } catch (err) {
    console.error("createGallery error:", err);
    return res.status(500).json({ message: "Server error." });
  }
};

// -------------------------------
// UPDATE: Update metadata or replace image
// -------------------------------
exports.updateGallery = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, date } = req.body;
    const files = req.files || [];

    if (!id) {
      return res.status(400).json({ message: "Missing gallery id." });
    }

    // If new image uploaded → replace image
    if (files.length > 0) {
      const file = files[0];
      const sql = `
        UPDATE \`Gallery\`
        SET title = ?, description = ?, eventDate = ?, image = ?, imageName = ?, imageType = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `;
      await query(sql, [
        title,
        description,
        date,
        file.buffer, // ✅ Use buffer instead of reading file
        file.originalname,
        file.mimetype,
        id,
      ]);

      return res.json({
        success: true,
        message: "Gallery updated successfully (image replaced).",
      });
    }

    // Otherwise, update only metadata
    const sqlMeta = `
      UPDATE \`Gallery\`
      SET title = ?, description = ?, eventDate = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;
    await query(sqlMeta, [title, description, date, id]);

    return res.json({
      success: true,
      message: "Gallery metadata updated successfully.",
    });
  } catch (err) {
    console.error("updateGallery error:", err);
    return res.status(500).json({ message: "Server error." });
  }
};

// -------------------------------
// DELETE: Remove one gallery row by ID
// -------------------------------
exports.deleteGallery = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) return res.status(400).json({ message: "Missing id." });

    await query("DELETE FROM `Gallery` WHERE id = ?", [id]);
    return res.json({ success: true, message: "Gallery row deleted." });
  } catch (err) {
    console.error("deleteGallery error:", err);
    return res.status(500).json({ message: "Server error." });
  }
};

// -------------------------------
// GET IMAGE BY ID: return raw image data
// -------------------------------
exports.getImageById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) return res.status(400).json({ message: "Missing id." });

    const rows = await query(
      "SELECT image, imageType, imageName FROM `Gallery` WHERE id = ? LIMIT 1",
      [id]
    );

    if (!rows || rows.length === 0)
      return res.status(404).json({ message: "Not found." });

    const row = rows[0];
    res.setHeader("Content-Type", row.imageType || "application/octet-stream");
    // Optional: Show inline in browser instead of forcing download
    res.setHeader("Content-Disposition", `inline; filename="${row.imageName}"`);
    return res.send(row.image);
  } catch (err) {
    console.error("getImageById error:", err);
    return res.status(500).json({ message: "Server error." });
  }
};

// -------------------------------
// GET BY DETAIL: filter by title or date (no image blob)
// -------------------------------
exports.getByDetail = async (req, res) => {
  try {
    const { title, date } = req.query;
    let sql = `
      SELECT id, title, description, eventDate, imageName, created_at
      FROM \`Gallery\`
      WHERE 1=1
    `;
    const params = [];

    if (title) {
      sql += " AND title LIKE ?";
      params.push(`%${title}%`);
    }
    if (date) {
      sql += " AND eventDate = ?";
      params.push(date);
    }

    const rows = await query(sql, params);
    return res.json(rows);
  } catch (err) {
    console.error("getByDetail error:", err);
    return res.status(500).json({ message: "Server error." });
  }
};

// -------------------------------
// GET ALL: Paginated list (no image blob)
// -------------------------------
exports.getAllGalleries = async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 10, 100);
    const offset = parseInt(req.query.offset, 10) || 0;

    const rows = await query(
      `
      SELECT id, title, description, eventDate, imageName, created_at
      FROM \`Gallery\`
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
      `,
      [limit, offset]
    );

    return res.json(rows);
  } catch (err) {
    console.error("getAllGalleries error:", err);
    return res.status(500).json({ message: "Server error." });
  }
};


// ✅ NEW: GET GALLERY BY ID (for edit prefill)
exports.getGalleryById = async (req, res) => {
  try {
    const { id } = req.params;

    const [meta] = await query(
      "SELECT title, description, eventDate FROM `Gallery` WHERE id=? LIMIT 1",
      [id]
    );
    if (!meta) return res.status(404).json({ message: "Not found" });

    const images = await query(
      "SELECT id, imageName, imageType FROM `Gallery` WHERE title=? AND eventDate=?",
      [meta.title, meta.eventDate]
    );

    return res.json({
      id,
      title: meta.title,
      description: meta.description,
      eventDate: meta.eventDate,
      images,
    });
  } catch (err) {
    console.error("getGalleryById error:", err);
    return res.status(500).json({ message: "Server error." });
  }
};