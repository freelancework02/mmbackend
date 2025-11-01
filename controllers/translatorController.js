const db = require("../config/db");

// Create Translator (upload translator with image)
exports.createTranslator = (req, res) => {
  const { name, designation, englishDescription, urduDescription } = req.body;
  const imageBuffer = req.file ? req.file.buffer : null;

  if (!name || !designation || !englishDescription || !urduDescription || !imageBuffer) {
    return res.status(400).send('All fields including image are required.');
  }

  const createdOn = new Date();
  const modifiedOn = new Date();

  const sql = `
    INSERT INTO New_Translator (image, name, designation, englishDescription, urduDescription, createdOn, modifiedOn)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `;

  db.query(sql, [imageBuffer, name, designation, englishDescription, urduDescription, createdOn, modifiedOn], (err, result) => {
    if (err) {
      console.error('Error inserting translator:', err);
      return res.status(500).send('Error saving translator');
    }
    res.send('Translator saved successfully!');
  });
};

// Get all translators (without image)
exports.getAllTranslators = (req, res) => {
  const sql = `
    SELECT id, name, designation, englishDescription, urduDescription, createdOn
    FROM New_Translator
    ORDER BY createdOn DESC
  `;

  db.query(sql, (err, results) => {
    if (err) {
      console.error('Error fetching translators:', err);
      return res.status(500).send('Error fetching translators');
    }
    res.json(results);
  });
};


// Get translator image by ID
exports.getTranslatorImage = (req, res) => {
  const id = req.params.id;

  const sql = `SELECT image FROM New_Translator WHERE id = ?`;

  db.query(sql, [id], (err, results) => {
    if (err) {
      console.error('Error fetching image:', err);
      return res.status(500).send('Error fetching image');
    }

    if (results.length > 0 && results[0].image) {
      res.setHeader('Content-Type', 'image/jpeg');
      res.send(results[0].image);
    } else {
      res.status(404).send('Image not found');
    }
  });
};

// Update translator (with optional new image)
exports.updateTranslator = (req, res) => {
  const id = req.params.id;
  const { name, designation, englishDescription, urduDescription } = req.body;
  const imageBuffer = req.file ? req.file.buffer : null;

  if (!id) {
    return res.status(400).send('Translator ID is required.');
  }

  const modifiedOn = new Date();

  const sql = `
    UPDATE New_Translator SET
      image = COALESCE(?, image),
      name = ?,
      designation = ?,
      englishDescription = ?,
      urduDescription = ?,
      modifiedOn = ?
    WHERE id = ?
  `;

  db.query(sql, [imageBuffer, name, designation, englishDescription, urduDescription, modifiedOn, id], (err, result) => {
    if (err) {
      console.error('Error updating translator:', err);
      return res.status(500).send('Error updating translator');
    }
    res.send('Translator updated successfully!');
  });
};

// Delete translator (hard delete)
exports.deleteTranslator = (req, res) => {
  const id = req.params.id;

  if (!id) {
    return res.status(400).send('Translator ID is required.');
  }

  const sql = `DELETE FROM New_Translator WHERE id = ?`;

  db.query(sql, [id], (err, result) => {
    if (err) {
      console.error('Error deleting translator:', err);
      return res.status(500).send('Error deleting translator');
    }
    res.send('Translator deleted successfully!');
  });
};
