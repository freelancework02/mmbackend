const db = require("../config/db");

// GET all book requests
exports.getAllBookRequests = (req, res) => {
  const query = `
    SELECT 
      id,
      name,
      email,
      contact,
      address,
      books,
      createdOn,
      modifiedOn,
      isDeleted
    FROM New_request_books
    WHERE isDeleted = 0
  `;

  db.query(query, (err, result) => {
    if (err) {
      console.error("Error fetching book requests:", err);
      return res.status(500).json({ error: "Error fetching book requests." });
    }
    res.json(result);
  });
};

// POST a new book request
exports.createBookRequest = (req, res) => {
  const { name, email, contact, address, books } = req.body;

  if (!name || !email || !contact || !address || !books) {
    return res.status(400).json({ message: "Required fields are missing." });
  }

  const createdOn = new Date();
  const modifiedOn = createdOn;
  const isDeleted = 0;

  const query = `
    INSERT INTO New_request_books (name, email, contact, address, books, createdOn, modifiedOn, isDeleted)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `;

  const values = [name, email, contact, address, books, createdOn, modifiedOn, isDeleted];

  db.query(query, values, (err, result) => {
    if (err) {
      console.error("Error inserting book request:", err);
      return res.status(500).json({ error: "Error submitting book request." });
    }
    res.status(201).json({ message: "Book request submitted successfully.", requestId: result.insertId });
  });
};
