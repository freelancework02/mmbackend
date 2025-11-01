// controllers/articles.controller.js
const db = require("../config/db");

/* --------------------------------- Helpers -------------------------------- */

const asBool = (v, def = 0) => {
  if (v === undefined || v === null || v === "") return def;
  if (typeof v === "boolean") return v ? 1 : 0;
  const s = String(v).trim().toLowerCase();
  return ["1", "true", "yes", "y"].includes(s) ? 1 : 0;
};

const asNullableTrim = (v) => {
  if (v === undefined || v === null) return null;
  const s = String(v).trim();
  return s.length ? s : null;
};

const asDate = (v) => {
  if (!v) return null;
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
};

/* ------------------------------- CREATE (POST) ------------------------------ */
// POST /api/articles  (multipart/form-data)
exports.createArticle = (req, res) => {
  const {
    // core
    title,
    topic,
    writers,
    translator,
    language,
    date,
    tags,
    isPublished,

    // optional meta
    createdAt,

    // writer meta
    writerDesignation,

    // language blocks
    englishTitle,
    englishDescription,
    urduTitle,
    urduDescription,
    romanUrduTitle,
    romanUrduDescription,
    hindiTitle,
    hindiDescription,
  } = req.body;

  const imageBuffer = req.file ? req.file.buffer : null;

  if (!title || !topic || !writers || !language || !date || isPublished === undefined) {
    return res.status(400).json({
      error: "VALIDATION",
      message: "Required fields: title, topic, writers, language, date, isPublished",
    });
  }

  const now = new Date();

  // *** 23 columns → 23 placeholders ***
  const sql = `
    INSERT INTO \`New_Articles\`
    (
      \`image\`,
      \`title\`,
      \`englishDescription\`,
      \`urduDescription\`,
      \`topic\`,
      \`writers\`,
      \`translator\`,
      \`language\`,
      \`date\`,
      \`tags\`,
      \`views\`,
      \`createdOn\`,
      \`isPublished\`,
      \`modifiedOn\`,
      \`isDeleted\`,
      \`englishTitle\`,
      \`urduTitle\`,
      \`romanUrduTitle\`,
      \`romanUrduDescription\`,
      \`hindiTitle\`,
      \`hindiDescription\`,
      \`writerDesignation\`,
      \`createdAt\`
    )
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
  `;

  const params = [
    imageBuffer || null,
    title,
    asNullableTrim(englishDescription),
    asNullableTrim(urduDescription),
    topic,
    writers,
    asNullableTrim(translator),
    language,
    asDate(date),
    asNullableTrim(tags),
    0,                    // views
    now,                  // createdOn
    asBool(isPublished),  // isPublished -> 0/1
    now,                  // modifiedOn
    0,                    // isDeleted
    asNullableTrim(englishTitle),
    asNullableTrim(urduTitle),
    asNullableTrim(romanUrduTitle),
    asNullableTrim(romanUrduDescription),
    asNullableTrim(hindiTitle),
    asNullableTrim(hindiDescription),
    asNullableTrim(writerDesignation),
    createdAt ? new Date(createdAt) : null,
  ];

  db.query(sql, params, (err, result) => {
    if (err) {
      console.error("Error inserting article:", err);
      return res.status(500).json({ error: "DB", message: "Error saving article" });
    }
    res.json({ message: "Article saved successfully!", id: result.insertId });
  });
};

/* -------------------------------- LIST (GET) ------------------------------- */
// GET /api/articles
exports.getAllArticles = (req, res) => {
  const { topic, language, published } = req.query;

  const where = ["`isDeleted` = 0"];
  const args = [];

  if (topic) {
    where.push("`topic` = ?");
    args.push(topic);
  }
  if (language) {
    where.push("`language` = ?");
    args.push(language);
  }
  if (published !== undefined) {
    where.push("`isPublished` = ?");
    args.push(asBool(published));
  }

  // Keep it simple/portable across MySQL/MariaDB versions: don't rely on REGEXP_REPLACE here.
  const sql = `
    SELECT
      \`id\`,
      \`title\`,
      \`englishDescription\`,
      \`urduDescription\`,
      \`topic\`,
      \`writers\`,
      \`translator\`,
      \`language\`,
      \`date\`,
      \`tags\`,
      \`views\`,
      \`createdOn\`,
      \`isPublished\`,
      \`englishTitle\`,
      \`urduTitle\`,
      \`romanUrduTitle\`,
      \`hindiTitle\`,
      \`writerDesignation\`,
      \`createdAt\`,
      \`modifiedOn\`
    FROM \`New_Articles\`
    WHERE ${where.join(" AND ")}
    ORDER BY \`createdOn\` DESC, \`id\` DESC
  `;

  db.query(sql, args, (err, results) => {
    if (err) {
      console.error("Error fetching articles:", err);
      return res.status(500).json({ error: "DB", message: "Error fetching articles" });
    }
    res.json(results);
  });
};

/* ------------------------------ GET BY ID (GET) ---------------------------- */
// GET /api/articles/:id
exports.getArticleById = (req, res) => {
  const id = req.params.id;
  if (!id) return res.status(400).json({ error: "VALIDATION", message: "Article ID is required." });

  const sql = `
    SELECT
      \`id\`,
      \`title\`,
      \`englishDescription\`,
      \`urduDescription\`,
      \`topic\`,
      \`writers\`,
      \`translator\`,
      \`language\`,
      \`date\`,
      \`tags\`,
      \`views\`,
      \`createdOn\`,
      \`isPublished\`,
      \`englishTitle\`,
      \`urduTitle\`,
      \`romanUrduTitle\`,
      \`romanUrduDescription\`,
      \`hindiTitle\`,
      \`hindiDescription\`,
      \`writerDesignation\`,
      \`createdAt\`,
      \`modifiedOn\`
    FROM \`New_Articles\`
    WHERE \`id\` = ? AND \`isDeleted\` = 0
    LIMIT 1
  `;

  db.query(sql, [id], (err, results) => {
    if (err) {
      console.error("Error fetching article:", err);
      return res.status(500).json({ error: "DB", message: "Error fetching article" });
    }
    if (results.length === 0) {
      return res.status(404).json({ error: "NOT_FOUND", message: "Article not found." });
    }
    res.json(results[0]);
  });
};

/* ------------------------------ IMAGE (GET) -------------------------------- */
// GET /api/articles/:id/image
exports.getArticleImage = (req, res) => {
  const id = req.params.id;
  if (!id) return res.status(400).send("Article ID is required.");

  const sql = `SELECT \`image\` FROM \`New_Articles\` WHERE \`id\` = ? AND \`isDeleted\` = 0 LIMIT 1`;

  db.query(sql, [id], (err, results) => {
    if (err) {
      console.error("Error fetching article image:", err);
      return res.status(500).send("Error fetching image");
    }
    if (results.length && results[0].image) {
      res.setHeader("Content-Type", "image/jpeg");
      return res.send(results[0].image);
    }
    res.status(404).send("Image not found");
  });
};

/* ------------------------------- UPDATE (PATCH) ---------------------------- */
// PATCH /api/articles/:id  (multipart/form-data or JSON)
exports.updateArticle = (req, res) => {
  const id = req.params.id;
  if (!id) return res.status(400).json({ error: "VALIDATION", message: "Article ID is required." });

  const {
    // core
    title,
    englishDescription,
    urduDescription,
    topic,
    writers,
    translator,
    language,
    date,
    tags,
    isPublished,

    // writer meta
    writerDesignation,

    // language blocks
    englishTitle,
    urduTitle,
    romanUrduTitle,
    romanUrduDescription,
    hindiTitle,
    hindiDescription,

    // optional meta
    createdAt,

    // flags
    removeImage,
  } = req.body;

  const imageBuffer = req.file ? req.file.buffer : null;

  const fields = [];
  const params = [];

  // image handling
  if (imageBuffer) {
    fields.push("`image` = ?");
    params.push(imageBuffer);
  } else if (asBool(removeImage || 0)) {
    fields.push("`image` = NULL");
  }

  // core
  if (title !== undefined) { fields.push("`title` = ?"); params.push(title); }
  if (englishDescription !== undefined) { fields.push("`englishDescription` = ?"); params.push(asNullableTrim(englishDescription)); }
  if (urduDescription !== undefined) { fields.push("`urduDescription` = ?"); params.push(asNullableTrim(urduDescription)); }
  if (topic !== undefined) { fields.push("`topic` = ?"); params.push(topic); }
  if (writers !== undefined) { fields.push("`writers` = ?"); params.push(writers); }
  if (translator !== undefined) { fields.push("`translator` = ?"); params.push(asNullableTrim(translator)); }
  if (language !== undefined) { fields.push("`language` = ?"); params.push(language); }
  if (date !== undefined) { fields.push("`date` = ?"); params.push(asDate(date)); }
  if (tags !== undefined) { fields.push("`tags` = ?"); params.push(asNullableTrim(tags)); }
  if (isPublished !== undefined) { fields.push("`isPublished` = ?"); params.push(asBool(isPublished)); }

  // new fields
  if (englishTitle !== undefined) { fields.push("`englishTitle` = ?"); params.push(asNullableTrim(englishTitle)); }
  if (urduTitle !== undefined) { fields.push("`urduTitle` = ?"); params.push(asNullableTrim(urduTitle)); }
  if (romanUrduTitle !== undefined) { fields.push("`romanUrduTitle` = ?"); params.push(asNullableTrim(romanUrduTitle)); }
  if (romanUrduDescription !== undefined) { fields.push("`romanUrduDescription` = ?"); params.push(asNullableTrim(romanUrduDescription)); }
  if (hindiTitle !== undefined) { fields.push("`hindiTitle` = ?"); params.push(asNullableTrim(hindiTitle)); }
  if (hindiDescription !== undefined) { fields.push("`hindiDescription` = ?"); params.push(asNullableTrim(hindiDescription)); }
  if (writerDesignation !== undefined) { fields.push("`writerDesignation` = ?"); params.push(asNullableTrim(writerDesignation)); }
  if (createdAt !== undefined) { fields.push("`createdAt` = ?"); params.push(createdAt ? new Date(createdAt) : null); }

  if (!fields.length) {
    return res.status(400).json({ error: "VALIDATION", message: "No fields provided for update." });
  }

  fields.push("`modifiedOn` = ?");
  params.push(new Date());

  const sql = `
    UPDATE \`New_Articles\`
    SET ${fields.join(", ")}
    WHERE \`id\` = ? AND \`isDeleted\` = 0
  `;
  params.push(id);

  db.query(sql, params, (err, result) => {
    if (err) {
      console.error("Error updating article:", err);
      return res.status(500).json({ error: "DB", message: "Error updating article" });
    }
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "NOT_FOUND", message: "Article not found or already deleted." });
    }
    res.json({ message: "Article updated successfully!" });
  });
};

/* ---------------------------- SOFT DELETE (DELETE) ------------------------- */
// DELETE /api/articles/:id
exports.deleteArticle = (req, res) => {
  const id = req.params.id;
  if (!id) return res.status(400).json({ error: "VALIDATION", message: "Article ID is required." });

  const sql = `
    UPDATE \`New_Articles\`
    SET \`isDeleted\` = 1, \`modifiedOn\` = ?
    WHERE \`id\` = ? AND \`isDeleted\` = 0
  `;

  db.query(sql, [new Date(), id], (err, result) => {
    if (err) {
      console.error("Error deleting article:", err);
      return res.status(500).json({ error: "DB", message: "Error deleting article" });
    }
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "NOT_FOUND", message: "Article not found or already deleted." });
    }
    res.json({ message: "Article deleted (soft) successfully!" });
  });
};

/* ------------------------- OPTIONAL: PUBLISH TOGGLE ------------------------ */
// PATCH /api/articles/:id/publish  Body: { isPublished: true|false }
exports.setPublishState = (req, res) => {
  const id = req.params.id;
  const { isPublished } = req.body;
  if (!id) return res.status(400).json({ error: "VALIDATION", message: "Article ID is required." });
  if (isPublished === undefined) {
    return res.status(400).json({ error: "VALIDATION", message: "isPublished is required." });
  }

  const sql = `
    UPDATE \`New_Articles\`
    SET \`isPublished\` = ?, \`modifiedOn\` = ?
    WHERE \`id\` = ? AND \`isDeleted\` = 0
  `;
  db.query(sql, [asBool(isPublished), new Date(), id], (err, result) => {
    if (err) {
      console.error("Error updating publish state:", err);
      return res.status(500).json({ error: "DB", message: "Error updating publish state" });
    }
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "NOT_FOUND", message: "Article not found or already deleted." });
    }
    res.json({ message: "Publish state updated." });
  });
};
