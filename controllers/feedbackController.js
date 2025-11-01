const db = require("../config/db");

// Get all feedback (only non-deleted)
exports.getAllFeedback = (req, res) => {
  const query = `
    SELECT 
      id,
      name,
      email,
      feedback,
      createdOn,
      modifiedOn,
      isDeleted
    FROM New_Feedback
    WHERE isDeleted = 0
  `;

  db.query(query, (err, result) => {
    if (err) {
      console.error("Error fetching feedback:", err);
      return res.status(500).json({ error: "Failed to retrieve feedback." });
    }
    res.json(result);
  });
};

// Create feedback (POST)
exports.createFeedback = (req, res) => {
  const { name, email, feedback } = req.body;

  // Validation
  if (!name || !email || !feedback) {
    return res.status(400).json({ message: "Required fields are missing." });
  }

  // Prepare data
  const now = new Date().toISOString().slice(0, 19).replace("T", " ");
  const createdOn = now;
  const modifiedOn = now;
  const isDeleted = 0;

  // SQL Insert Query
  const query = `
    INSERT INTO New_Feedback (name, email, feedback, createdOn, modifiedOn, isDeleted)
    VALUES (?, ?, ?, ?, ?, ?)
  `;

  const values = [name, email, feedback, createdOn, modifiedOn, isDeleted];

  db.query(query, values, (err, result) => {
    if (err) {
      console.error("Error inserting feedback:", err);
      return res.status(500).json({ error: "Error submitting feedback." });
    }
    res.status(201).json({
      message: "Feedback submitted successfully.",
      feedbackId: result.insertId,
    });
  });
};
