const pool = require("../config/db");

/* ----------------------------- Helpers ----------------------------- */

// Basic slugify (keeps Urdu/Hindi letters, trims, collapses spaces)
const slugify = (str = "") =>
  String(str)
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, "")  // drop punctuation except letters/numbers/spaces/hyphens (unicode aware)
    .replace(/\s+/g, "-")               // spaces -> hyphen
    .replace(/-+/g, "-")                // collapse multiple hyphens
    .replace(/^-|-$/g, "");             // trim leading/trailing hyphens

// Strip HTML on MySQL side for text previews. (Kept here for clarity)
const STRIP_HTML_SQL = (col) => `REGEXP_REPLACE(${col}, '<[^>]*>', '')`;

/* ============================= CREATE ============================== */
/**
 * Create Event (multipart/form-data)
 * Accepts fields:
 *  - Required: title, topic, language, eventDate (yyyy-mm-dd), venue
 *  - Optional simple: writers, translator, tags, isPublished (boolean-ish), writerDesignation
 *  - Optional multilingual: englishTitle/Description, urduTitle/Description,
 *                           romanUrduTitle/Description, hindiTitle/Description
 *  - Optional: image (file)
 */
exports.createEvent = (req, res) => {
  const b = req.body;

  const title = b.title?.trim();
  const topic = b.topic?.trim();
  const language = b.language?.trim();
  const eventDate = b.eventDate; // expect yyyy-mm-dd
  const venue = b.venue?.trim();

  // Optional fields
  const writers = (b.writers ?? "").toString().trim(); // keep empty string if not provided (older NOT NULL schema)
  const translator = b.translator?.trim() || null;
  const tags = b.tags?.trim() || null;
  const writerDesignation = b.writerDesignation?.trim() || null;

  // Boolean-ish isPublished ("true"/"false"/1/0)
  const isPublished =
    b.isPublished === true ||
    b.isPublished === "true" ||
    b.isPublished === "1" ||
    b.isPublished === 1
      ? 1
      : 0;

  // Multilingual blocks
  const englishTitle = b.englishTitle?.trim() || null;
  const englishDescription = b.englishDescription ?? null;

  const urduTitle = b.urduTitle?.trim() || null;
  const urduDescription = b.urduDescription ?? null;

  const romanUrduTitle = b.romanUrduTitle?.trim() || null;
  const romanUrduDescription = b.romanUrduDescription ?? null;

  const hindiTitle = b.hindiTitle?.trim() || null;
  const hindiDescription = b.hindiDescription ?? null;

  // Image (optional now)
  const imageBuffer = req.file ? req.file.buffer : null;

  // Validate required
  if (!title || !topic || !language || !eventDate || !venue) {
    return res.status(400).json({ error: "title, topic, language, eventDate and venue are required." });
  }

  const slug = slugify(b.slug || title);
  const createdOn = new Date();
  const modifiedOn = createdOn;
  const views = 0;
  const isDeleted = 0;

  const sql = `
    INSERT INTO events (
      image, slug, title, topic, language, writers, translator, tags, eventDate,
      venue, isPublished, writerDesignation,
      englishTitle, englishDescription,
      urduTitle, urduDescription,
      romanUrduTitle, romanUrduDescription,
      hindiTitle, hindiDescription,
      views, createdOn, modifiedOn, isDeleted
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  const values = [
    imageBuffer || null,
    slug,
    title,
    topic,
    language,
    writers,
    translator,
    tags,
    eventDate,
    venue,
    isPublished,
    writerDesignation,
    englishTitle,
    englishDescription,
    urduTitle,
    urduDescription,
    romanUrduTitle,
    romanUrduDescription,
    hindiTitle,
    hindiDescription,
    views,
    createdOn,
    modifiedOn,
    isDeleted,
  ];

  pool.query(sql, values, (err, result) => {
    if (err) {
      console.error("Error inserting event:", err);
      return res.status(500).json({ error: "Error saving event." });
    }
    res.status(201).json({ message: "Event saved successfully!", eventId: result.insertId });
  });
};

/* =============================== READ ============================== */
// Get All Events (excluding image)
exports.getAllEvents = (req, res) => {
  const sql = `
    SELECT
      id, slug, title, topic, language, writers, translator, tags, eventDate,
      venue, isPublished, writerDesignation,
      englishTitle, englishDescription,
      urduTitle, urduDescription,
      romanUrduTitle, romanUrduDescription,
      hindiTitle, hindiDescription,
      ${STRIP_HTML_SQL("englishDescription")} AS englishDescriptionText,
      ${STRIP_HTML_SQL("urduDescription")}    AS urduDescriptionText,
      ${STRIP_HTML_SQL("romanUrduDescription")} AS romanUrduDescriptionText,
      ${STRIP_HTML_SQL("hindiDescription")}   AS hindiDescriptionText,
      views, createdOn, modifiedOn
    FROM events
    WHERE isDeleted = 0
    ORDER BY createdOn DESC
  `;

  pool.query(sql, (err, results) => {
    if (err) {
      console.error("Error fetching events:", err);
      return res.status(500).json({ error: "Error fetching events." });
    }
    res.json(results);
  });
};

// Get Event by ID (excluding image)
exports.getEventById = (req, res) => {
  const { id } = req.params;
  if (!id) return res.status(400).json({ error: "Event ID is required." });

  const sql = `
    SELECT
      id, slug, title, topic, language, writers, translator, tags, eventDate,
      venue, isPublished, writerDesignation,
      englishTitle, englishDescription,
      urduTitle, urduDescription,
      romanUrduTitle, romanUrduDescription,
      hindiTitle, hindiDescription,
      ${STRIP_HTML_SQL("englishDescription")} AS englishDescriptionText,
      ${STRIP_HTML_SQL("urduDescription")}    AS urduDescriptionText,
      ${STRIP_HTML_SQL("romanUrduDescription")} AS romanUrduDescriptionText,
      ${STRIP_HTML_SQL("hindiDescription")}   AS hindiDescriptionText,
      views, createdOn, modifiedOn
    FROM events
    WHERE id = ? AND isDeleted = 0
  `;

  pool.query(sql, [id], (err, results) => {
    if (err) {
      console.error("Error fetching event:", err);
      return res.status(500).json({ error: "Error fetching event." });
    }
    if (results.length === 0) {
      return res.status(404).json({ error: "Event not found." });
    }
    res.json(results[0]);
  });
};

// Get Event Image
exports.getEventImage = (req, res) => {
  const { id } = req.params;
  if (!id) return res.status(400).json({ error: "Event ID is required." });

  const sql = `SELECT image FROM events WHERE id = ? AND isDeleted = 0`;

  pool.query(sql, [id], (err, results) => {
    if (err) {
      console.error("Error fetching image:", err);
      return res.status(500).json({ error: "Error fetching image." });
    }

    if (results.length > 0 && results[0].image) {
      // You may want to detect MIME type; defaulting to jpeg as before
      res.setHeader("Content-Type", "image/jpeg");
      res.send(results[0].image);
    } else {
      res.status(404).json({ error: "Image not found." });
    }
  });
};

/* ============================== UPDATE ============================= */
/**
 * Update Event (multipart/form-data)
 * Pass only fields you want to update.
 * Converts isPublished to 0/1 when present.
 */
exports.updateEvent = (req, res) => {
  const { id } = req.params;
  if (!id) return res.status(400).json({ error: "Event ID is required." });

  const b = req.body;
  const imageBuffer = req.file ? req.file.buffer : null;

  const fields = [];
  const values = [];

  // Allowed updatable fields
  const updatableMap = {
    title: (v) => v?.trim(),
    slug: (v) => slugify(v || b.title || ""), // if slug provided use it; else re-slugify from title if provided
    topic: (v) => v?.trim(),
    language: (v) => v?.trim(),
    writers: (v) => (v === undefined ? undefined : String(v).trim()), // keep empty string if set to ""
    translator: (v) => (v === "" || v === null ? null : v?.trim()),
    tags: (v) => (v === "" || v === null ? null : v?.trim()),
    eventDate: (v) => v, // yyyy-mm-dd
    venue: (v) => v?.trim(),
    writerDesignation: (v) => (v === "" || v === null ? null : v?.trim()),
    isPublished: (v) =>
      v === true || v === "true" || v === "1" || v === 1 ? 1 :
      v === false || v === "false" || v === "0" || v === 0 ? 0 : undefined,

    englishTitle: (v) => (v === "" ? null : v?.trim()),
    englishDescription: (v) => (v === "" ? null : v),

    urduTitle: (v) => (v === "" ? null : v?.trim()),
    urduDescription: (v) => (v === "" ? null : v),

    romanUrduTitle: (v) => (v === "" ? null : v?.trim()),
    romanUrduDescription: (v) => (v === "" ? null : v),

    hindiTitle: (v) => (v === "" ? null : v?.trim()),
    hindiDescription: (v) => (v === "" ? null : v),
  };

  Object.keys(updatableMap).forEach((key) => {
    if (Object.prototype.hasOwnProperty.call(b, key)) {
      const val = updatableMap[key](b[key]);
      if (val !== undefined) {
        fields.push(`${key} = ?`);
        values.push(val);
      }
    }
  });

  if (imageBuffer !== null) {
    fields.push("image = ?");
    values.push(imageBuffer);
  }

  if (fields.length === 0) {
    return res.status(400).json({ error: "At least one field must be provided for update." });
  }

  const modifiedOn = new Date();
  fields.push("modifiedOn = ?");
  values.push(modifiedOn, id);

  const sql = `UPDATE events SET ${fields.join(", ")} WHERE id = ? AND isDeleted = 0`;

  pool.query(sql, values, (err, result) => {
    if (err) {
      console.error("Error updating event:", err);
      return res.status(500).json({ error: "Error updating event." });
    }
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Event not found or already deleted." });
    }
    res.json({ message: "Event updated successfully!" });
  });
};

/* ============================== DELETE ============================= */
// Soft Delete Event
exports.deleteEvent = (req, res) => {
  const { id } = req.params;
  if (!id) return res.status(400).json({ error: "Event ID is required." });

  const modifiedOn = new Date();
  const sql = `
    UPDATE events
    SET isDeleted = 1, modifiedOn = ?
    WHERE id = ? AND isDeleted = 0
  `;

  pool.query(sql, [modifiedOn, id], (err, result) => {
    if (err) {
      console.error("Error deleting event:", err);
      return res.status(500).json({ error: "Error deleting event." });
    }
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Event not found or already deleted." });
    }
    res.json({ message: "Event deleted successfully!" });
  });
};
