const db = require("../config/db");
const { decode } = require("html-entities");

// Utility function to strip HTML tags and decode entities
function cleanHtml(html) {
  const decoded = decode(html || "");
  return decoded.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
}

// Create About Content
exports.createAboutContent = (req, res) => {
  const { englishTitle, urduTitle, englishDescription, urduDescription } = req.body;
  const imageBuffer = req.file ? req.file.buffer : null;

  if (!englishTitle || !urduTitle || !englishDescription || !urduDescription || !imageBuffer) {
    return res.status(400).send("All fields including image are required.");
  }

  const createdOn = new Date();
  const modifiedOn = new Date();
  const isDeleted = 0;

  const sql = `
    INSERT INTO about_contents 
    (image, englishTitle, urduTitle, englishDescription, urduDescription, createdOn, modifiedOn, isDeleted)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `;

  db.query(sql, [imageBuffer, englishTitle, urduTitle, englishDescription, urduDescription, createdOn, modifiedOn, isDeleted], (err) => {
    if (err) {
      console.error("Error inserting About Content:", err);
      return res.status(500).send("Error saving About Content");
    }
    res.send("About Content saved successfully!");
  });
};

// Get all About Contents (without image, and not deleted)
exports.getAllAboutContents = (req, res) => {
  const sql = `
    SELECT id, englishTitle, urduTitle, englishDescription, urduDescription 
    FROM about_contents
    WHERE isDeleted = 0
  `;

  db.query(sql, (err, results) => {
    if (err) {
      console.error("Error fetching About Contents:", err);
      return res.status(500).send("Error fetching About Contents");
    }

    const sanitizedResults = results.map(item => ({
      ...item,
      englishDescription: cleanHtml(item.englishDescription),
      urduDescription: cleanHtml(item.urduDescription),
    }));

    res.json(sanitizedResults);
  });
};

// Get a single About Content by ID (without image, and not deleted)
exports.getAboutContentById = (req, res) => {
  const id = req.params.id;

  if (!id) {
    return res.status(400).send("About Content ID is required.");
  }

  const sql = `
    SELECT id, englishTitle, urduTitle, englishDescription, urduDescription
    FROM about_contents
    WHERE id = ? AND isDeleted = 0
  `;

  db.query(sql, [id], (err, results) => {
    if (err) {
      console.error("Error fetching About Content:", err);
      return res.status(500).send("Error fetching About Content");
    }

    if (results.length === 0) {
      return res.status(404).send("About Content not found.");
    }

    const sanitizedItem = {
      ...results[0],
      englishDescription: cleanHtml(results[0].englishDescription),
      urduDescription: cleanHtml(results[0].urduDescription),
    };

    res.json(sanitizedItem);
  });
};

// Get About Content image by ID
exports.getAboutContentImage = (req, res) => {
  const id = req.params.id;

  const sql = `SELECT image FROM about_contents WHERE id = ? AND isDeleted = 0`;

  db.query(sql, [id], (err, results) => {
    if (err) {
      console.error("Error fetching image:", err);
      return res.status(500).send("Error fetching image");
    }

    if (results.length > 0 && results[0].image) {
      res.setHeader("Content-Type", "image/jpeg"); // or detect type if needed
      res.send(results[0].image);
    } else {
      res.status(404).send("Image not found");
    }
  });
};

// Update About Content
exports.updateAboutContent = (req, res) => {
  const id = req.params.id;
  const { englishTitle, urduTitle, englishDescription, urduDescription } = req.body;
  const imageBuffer = req.file ? req.file.buffer : null;

  if (!id) {
    return res.status(400).send("About Content ID is required.");
  }

  const modifiedOn = new Date();

  const sql = `
    UPDATE about_contents SET
      ${imageBuffer ? "image = ?," : ""}
      englishTitle = ?,
      urduTitle = ?,
      englishDescription = ?,
      urduDescription = ?,
      modifiedOn = ?
    WHERE id = ? AND isDeleted = 0
  `;

  const params = [];

  if (imageBuffer) {
    params.push(imageBuffer);
  }

  params.push(englishTitle, urduTitle, englishDescription, urduDescription, modifiedOn, id);

  db.query(sql, params, (err) => {
    if (err) {
      console.error("Error updating About Content:", err);
      return res.status(500).send("Error updating About Content");
    }
    res.send("About Content updated successfully!");
  });
};

// Soft delete About Content
exports.deleteAboutContent = (req, res) => {
  const id = req.params.id;

  if (!id) {
    return res.status(400).send("About Content ID is required.");
  }

  const modifiedOn = new Date();

  const sql = `
    UPDATE about_contents 
    SET isDeleted = 1, modifiedOn = ?
    WHERE id = ?
  `;

  db.query(sql, [modifiedOn, id], (err) => {
    if (err) {
      console.error("Error deleting About Content:", err);
      return res.status(500).send("Error deleting About Content");
    }
    res.send("About Content deleted (soft delete) successfully!");
  });
};
