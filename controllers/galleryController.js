const db = require("../config/db");
const util = require("util");
const query = util.promisify(db.query).bind(db);

/* -----------------------------
   CREATE GALLERY (multiple images)
   POST /api/galleries
   Body: title, description, date; Files: images[]
------------------------------ */
exports.createGallery = async (req, res) => {
  const conn = db; // same pool/connection you already use
  const { title, description = "", date } = req.body;
  const files = req.files || [];

  try {
    if (!title || !date) {
      return res.status(400).json({ message: "Missing title or date." });
    }
    if (!files.length) {
      return res.status(400).json({ message: "Please upload at least one image." });
    }

    // 1) create parent
    const insertGallerySql = `
      INSERT INTO galleries (title, description, eventDate) VALUES (?, ?, ?)
    `;
    const result = await query(insertGallerySql, [title.trim(), description, date]);
    const galleryId = result.insertId;

    // 2) insert all images
    const insertImgSql = `
      INSERT INTO gallery_images (gallery_id, image, imageName, imageType, sort_order)
      VALUES (?, ?, ?, ?, ?)
    `;
    let order = 0;
    for (const file of files) {
      await query(insertImgSql, [
        galleryId,
        file.buffer,
        file.originalname,
        file.mimetype,
        order++,
      ]);
    }

    return res.json({ success: true, id: galleryId, message: "Gallery created." });
  } catch (err) {
    console.error("createGallery error:", err);
    return res.status(500).json({ message: "Server error." });
  }
};

/* -----------------------------
   UPDATE GALLERY META
   PUT /api/galleries/:id
   Body: title?, description?, date?
------------------------------ */
exports.updateGalleryMeta = async (req, res) => {
  const { id } = req.params;
  const { title, description, date } = req.body;
  try {
    const sql = `
      UPDATE galleries
      SET title = COALESCE(?, title),
          description = COALESCE(?, description),
          eventDate = COALESCE(?, eventDate),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;
    await query(sql, [title, description, date, id]);
    return res.json({ success: true, message: "Gallery updated." });
  } catch (err) {
    console.error("updateGalleryMeta error:", err);
    return res.status(500).json({ message: "Server error." });
  }
};

/* -----------------------------
   ADD IMAGES TO EXISTING GALLERY
   POST /api/galleries/:id/images
   Files: images[]
------------------------------ */
exports.addImages = async (req, res) => {
  const { id } = req.params;
  const files = req.files || [];
  try {
    if (!files.length) {
      return res.status(400).json({ message: "No images uploaded." });
    }

    // Get current max sort_order
    const [row] = await query(
      "SELECT COALESCE(MAX(sort_order), -1) AS maxOrder FROM gallery_images WHERE gallery_id = ?",
      [id]
    );
    let order = (row?.maxOrder ?? -1) + 1;

    const sql = `
      INSERT INTO gallery_images (gallery_id, image, imageName, imageType, sort_order)
      VALUES (?, ?, ?, ?, ?)
    `;
    for (const file of files) {
      await query(sql, [id, file.buffer, file.originalname, file.mimetype, order++]);
    }

    return res.json({ success: true, message: "Images added." });
  } catch (err) {
    console.error("addImages error:", err);
    return res.status(500).json({ message: "Server error." });
  }
};

/* -----------------------------
   REMOVE ONE IMAGE
   DELETE /api/galleries/image/:imageId
------------------------------ */
exports.deleteImage = async (req, res) => {
  const { imageId } = req.params;
  try {
    await query("DELETE FROM gallery_images WHERE id = ?", [imageId]);
    return res.json({ success: true, message: "Image deleted." });
  } catch (err) {
    console.error("deleteImage error:", err);
    return res.status(500).json({ message: "Server error." });
  }
};

/* -----------------------------
   DELETE ENTIRE GALLERY (cascades images)
   DELETE /api/galleries/:id
------------------------------ */
exports.deleteGallery = async (req, res) => {
  const { id } = req.params;
  try {
    await query("DELETE FROM galleries WHERE id = ?", [id]); // images deleted via FK CASCADE
    return res.json({ success: true, message: "Gallery deleted." });
  } catch (err) {
    console.error("deleteGallery error:", err);
    return res.status(500).json({ message: "Server error." });
  }
};

/* -----------------------------
   GET IMAGE BINARY BY IMAGE ID
   GET /api/galleries/image/:imageId
------------------------------ */
exports.getImageById = async (req, res) => {
  const { imageId } = req.params;
  try {
    const rows = await query(
      "SELECT image, imageType, imageName FROM gallery_images WHERE id = ? LIMIT 1",
      [imageId]
    );
    if (!rows.length) return res.status(404).json({ message: "Not found." });
    const row = rows[0];
    res.setHeader("Content-Type", row.imageType || "application/octet-stream");
    res.setHeader("Content-Disposition", `inline; filename="${row.imageName}"`);
    return res.send(row.image);
  } catch (err) {
    console.error("getImageById error:", err);
    return res.status(500).json({ message: "Server error." });
  }
};

/* -----------------------------
   GET GALLERY BY ID (meta + image list, no blobs)
   GET /api/galleries/:id
------------------------------ */
exports.getGalleryById = async (req, res) => {
  const { id } = req.params;
  try {
    const [meta] = await query(
      "SELECT id, title, description, eventDate, created_at, updated_at FROM galleries WHERE id = ? LIMIT 1",
      [id]
    );
    if (!meta) return res.status(404).json({ message: "Not found." });

    const images = await query(
      "SELECT id, imageName, imageType, sort_order, created_at FROM gallery_images WHERE gallery_id = ? ORDER BY sort_order ASC, id ASC",
      [id]
    );

    return res.json({ ...meta, images });
  } catch (err) {
    console.error("getGalleryById error:", err);
    return res.status(500).json({ message: "Server error." });
  }
};

/* -----------------------------
   LIST (paginated) – meta only
   GET /api/galleries?limit=&offset=
------------------------------ */
exports.getAllGalleries = async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 10, 100);
    const offset = parseInt(req.query.offset, 10) || 0;

    const rows = await query(
      `SELECT id, title, description, eventDate, created_at
       FROM galleries
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`,
      [limit, offset]
    );

    return res.json(rows);
  } catch (err) {
    console.error("getAllGalleries error:", err);
    return res.status(500).json({ message: "Server error." });
  }
};
