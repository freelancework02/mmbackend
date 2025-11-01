const pool = require("../config/db");

// Existing function
exports.getAllLanguages = (req, res) => {
  pool.query("SELECT * FROM language", (err, result) => {
    if (err) return res.status(500).send(err);
    res.json(result);
  });
};

// New function to create a language
exports.createLanguage = (req, res) => {
  const { language } = req.body;

  if (!language) {
    return res.status(400).json({ error: "Language is required" });
  }

  const createdOn = new Date();
  const isDeleted = false;

  const query = `
    INSERT INTO language (language, createdOn, isDeleted)
    VALUES (?, ?, ?)
  `;

  pool.query(query, [language, createdOn, isDeleted], (err, result) => {
    if (err) return res.status(500).send(err);
    res.status(201).json({ message: "Language created successfully", id: result.insertId });
  });
};

// Edit (Update) a language
exports.updateLanguage = (req, res) => {
  const { id } = req.params;
  const { language } = req.body;

  if (!language) {
    return res.status(400).json({ error: "Language is required" });
  }

  const query = `
    UPDATE language SET language = ? WHERE id = ?
  `;

  pool.query(query, [language, id], (err, result) => {
    if (err) return res.status(500).send(err);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Language not found" });
    }

    res.json({ message: "Language updated successfully" });
  });
};

// Delete a language (soft delete)
exports.deleteLanguage = (req, res) => {
  const { id } = req.params;

  const query = `
    DELETE FROM language WHERE id = ?
  `;

  pool.query(query, [id], (err, result) => {
    if (err) return res.status(500).send(err);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Language not found" });
    }

    res.json({ message: "Language deleted successfully" });
  });
};