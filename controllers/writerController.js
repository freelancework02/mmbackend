// controllers/writerController.js
const db = require("../config/db");

/* ------------------------------ Helper utils ------------------------------ */
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

const isEnumStatus = (v) => ["Active", "InActive"].includes(String(v));

/* --------------------------------- CREATE --------------------------------- */
// POST /api/writers  (multipart/form-data)
exports.createWriter = (req, res) => {
  const {
    name,
    designation,
    email,
    joinedDate,     // YYYY-MM-DD
    status,         // "Active" | "InActive"
    englishDescription,
    urduDescription,
    isTeamMember,   // bool-ish
  } = req.body;

  const imageBuffer = req.file ? req.file.buffer : null;

  // Validate requireds to match DB + UI
  if (!name || !email || !joinedDate || !status) {
    return res.status(400).json({
      error: "VALIDATION",
      message: "Required: name, email, joinedDate, status",
    });
  }
  if (!isEnumStatus(status)) {
    return res.status(400).json({ error: "VALIDATION", message: "status must be 'Active' or 'InActive'" });
  }

  const now = new Date();

  // 12 columns → 12 placeholders
  const sql = `
    INSERT INTO \`New_Writer\`
    (
      \`image\`,
      \`name\`,
      \`designation\`,
      \`email\`,
      \`joinedDate\`,
      \`status\`,
      \`englishDescription\`,
      \`urduDescription\`,
      \`isTeamMember\`,
      \`createdOn\`,
      \`modifiedOn\`,
      \`isDeleted\`
    )
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?)
  `;

  const params = [
    imageBuffer || null,
    name,
    asNullableTrim(designation) || "",          // table is NOT NULL safe with ""
    email,
    asDate(joinedDate),
    status,
    asNullableTrim(englishDescription) || "",   // NOT NULL → empty string acceptable
    asNullableTrim(urduDescription) || "",
    asBool(isTeamMember, 0),
    now,
    now,
    0, // isDeleted
  ];

  db.query(sql, params, (err, result) => {
    if (err) {
      console.error("Error inserting writer:", err);
      return res.status(500).json({ error: "DB", message: "Error saving writer" });
    }
    return res.json({ message: "Writer saved successfully!", id: result.insertId });
  });
};

/* ----------------------------------- LIST --------------------------------- */
// GET /api/writers  (optional filters: ?status=Active|InActive&team=1)
exports.getAllWriters = (req, res) => {
  const { status, team } = req.query;

  const where = ["`isDeleted` = 0"];
  const args = [];

  if (status !== undefined) {
    if (!isEnumStatus(status)) {
      return res.status(400).json({ error: "VALIDATION", message: "status must be 'Active' or 'InActive'" });
    }
    where.push("`status` = ?");
    args.push(status);
  }
  if (team !== undefined) {
    where.push("`isTeamMember` = ?");
    args.push(asBool(team));
  }

  const sql = `
    SELECT
      \`id\`,
      \`name\`,
      \`designation\`,
      \`email\`,
      \`joinedDate\`,
      \`status\`,
      \`englishDescription\`,
      \`urduDescription\`,
      \`isTeamMember\`,
      \`createdOn\`,
      \`modifiedOn\`
    FROM \`New_Writer\`
    WHERE ${where.join(" AND ")}
    ORDER BY \`createdOn\` DESC, \`id\` DESC
  `;

  db.query(sql, args, (err, results) => {
    if (err) {
      console.error("Error fetching writers:", err);
      return res.status(500).json({ error: "DB", message: "Error fetching writers" });
    }
    return res.json(results);
  });
};

/* --------------------------------- GET BY ID ------------------------------- */
// GET /api/writers/:id
exports.getWriterById = (req, res) => {
  const id = req.params.id;
  if (!id) return res.status(400).json({ error: "VALIDATION", message: "Writer ID is required." });

  const sql = `
    SELECT
      \`id\`,
      \`name\`,
      \`designation\`,
      \`email\`,
      \`joinedDate\`,
      \`status\`,
      \`englishDescription\`,
      \`urduDescription\`,
      \`isTeamMember\`,
      \`createdOn\`,
      \`modifiedOn\`
    FROM \`New_Writer\`
    WHERE \`id\` = ? AND \`isDeleted\` = 0
    LIMIT 1
  `;

  db.query(sql, [id], (err, results) => {
    if (err) {
      console.error("Error fetching writer:", err);
      return res.status(500).json({ error: "DB", message: "Error fetching writer" });
    }
    if (!results.length) {
      return res.status(404).json({ error: "NOT_FOUND", message: "Writer not found." });
    }
    return res.json(results[0]);
  });
};

/* ---------------------------------- IMAGE --------------------------------- */
// GET /api/writers/:id/image
exports.getWriterImage = (req, res) => {
  const id = req.params.id;
  if (!id) return res.status(400).send("Writer ID is required.");

  const sql = "SELECT `image` FROM `New_Writer` WHERE `id` = ? AND `isDeleted` = 0 LIMIT 1";

  db.query(sql, [id], (err, results) => {
    if (err) {
      console.error("Error fetching image:", err);
      return res.status(500).send("Error fetching image");
    }
    if (results.length && results[0].image) {
      res.setHeader("Content-Type", "image/jpeg");
      return res.send(results[0].image);
    }
    return res.status(404).send("Image not found");
  });
};

/* --------------------------------- UPDATE --------------------------------- */
// PATCH /api/writers/:id  (multipart/form-data or JSON)
// You can remove image with removeImage=1
exports.updateWriter = (req, res) => {
  const id = req.params.id;
  if (!id) return res.status(400).json({ error: "VALIDATION", message: "Writer ID is required." });

  const {
    name,
    designation,
    email,
    joinedDate,
    status,
    englishDescription,
    urduDescription,
    isTeamMember,
    removeImage, // "1"/true to null image
  } = req.body;

  if (status !== undefined && !isEnumStatus(status)) {
    return res.status(400).json({ error: "VALIDATION", message: "status must be 'Active' or 'InActive'" });
  }

  const imageBuffer = req.file ? req.file.buffer : null;

  const fields = [];
  const params = [];

  // Image handling
  if (imageBuffer) {
    fields.push("`image` = ?");
    params.push(imageBuffer);
  } else if (asBool(removeImage || 0)) {
    fields.push("`image` = NULL");
  }

  // Core fields (only if provided)
  if (name !== undefined)           { fields.push("`name` = ?"); params.push(name); }
  if (designation !== undefined)    { fields.push("`designation` = ?"); params.push(asNullableTrim(designation) || ""); }
  if (email !== undefined)          { fields.push("`email` = ?"); params.push(email); }
  if (joinedDate !== undefined)     { fields.push("`joinedDate` = ?"); params.push(asDate(joinedDate)); }
  if (status !== undefined)         { fields.push("`status` = ?"); params.push(status); }
  if (englishDescription !== undefined) { fields.push("`englishDescription` = ?"); params.push(asNullableTrim(englishDescription) || ""); }
  if (urduDescription !== undefined)    { fields.push("`urduDescription` = ?"); params.push(asNullableTrim(urduDescription) || ""); }
  if (isTeamMember !== undefined)   { fields.push("`isTeamMember` = ?"); params.push(asBool(isTeamMember)); }

  if (!fields.length) {
    return res.status(400).json({ error: "VALIDATION", message: "No fields provided for update." });
  }

  fields.push("`modifiedOn` = ?");
  params.push(new Date());

  const sql = `
    UPDATE \`New_Writer\`
    SET ${fields.join(", ")}
    WHERE \`id\` = ? AND \`isDeleted\` = 0
  `;
  params.push(id);

  db.query(sql, params, (err, result) => {
    if (err) {
      console.error("Error updating writer:", err);
      return res.status(500).json({ error: "DB", message: "Error updating writer" });
    }
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "NOT_FOUND", message: "Writer not found or already deleted." });
    }
    return res.json({ message: "Writer updated successfully!" });
  });
};

/* --------------------------------- DELETE --------------------------------- */
// DELETE /api/writers/:id  (soft delete)
exports.deleteWriter = (req, res) => {
  const id = req.params.id;
  if (!id) return res.status(400).json({ error: "VALIDATION", message: "Writer ID is required." });

  const sql = `
    UPDATE \`New_Writer\`
    SET \`isDeleted\` = 1, \`modifiedOn\` = ?
    WHERE \`id\` = ? AND \`isDeleted\` = 0
  `;

  db.query(sql, [new Date(), id], (err, result) => {
    if (err) {
      console.error("Error soft deleting writer:", err);
      return res.status(500).json({ error: "DB", message: "Error deleting writer" });
    }
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "NOT_FOUND", message: "Writer not found or already deleted." });
    }
    return res.json({ message: "Writer deleted (soft) successfully!" });
  });
};
