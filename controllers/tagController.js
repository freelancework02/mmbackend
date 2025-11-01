const db = require("../config/db");

// GET all tags (only non-deleted ones)
exports.getAllTags = (req, res) => {
  db.query("SELECT * FROM tags WHERE isDeleted = 0", (err, result) => {
    if (err) return res.status(500).send(err);
    res.json(result);
  });
};

// CREATE a new tag
exports.createTag = (req, res) => {
  const { tag } = req.body;
  const createdOn = new Date();
  const modifiedOn = new Date();
  const isDeleted = false;

  const sql = "INSERT INTO tags (tag, createdOn, modifiedOn, isDeleted) VALUES (?, ?, ?, ?)";
  db.query(sql, [tag, createdOn, modifiedOn, isDeleted], (err, result) => {
    if (err) return res.status(500).send(err);
    res.json({ message: "Tag created successfully", id: result.insertId });
  });
};

// UPDATE an existing tag
exports.updateTag = (req, res) => {
  const { id } = req.params;
  const { tag } = req.body;
  const modifiedOn = new Date();

  const sql = "UPDATE tags SET tag = ?, modifiedOn = ? WHERE id = ?";
  db.query(sql, [tag, modifiedOn, id], (err, result) => {
    if (err) return res.status(500).send(err);
    if (result.affectedRows === 0) return res.status(404).json({ message: "Tag not found" });
    res.json({ message: "Tag updated successfully" });
  });
};

// DELETE (soft delete) a tag
exports.deleteTag = (req, res) => {
  const { id } = req.params;
  const sql = "UPDATE tags SET isDeleted = 1 WHERE id = ?";
  db.query(sql, [id], (err, result) => {
    if (err) return res.status(500).send(err);
    if (result.affectedRows === 0) return res.status(404).json({ message: "Tag not found" });
    res.json({ message: "Tag deleted successfully (soft delete)" });
  });
};
