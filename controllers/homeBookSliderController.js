const db = require("../config/db");

// Get all books in slider
exports.getAllBooks = (req, res) => {
  const sql = `
    SELECT id, bookName, createdOn, modifiedOn
    FROM home_books_slider
    WHERE isDeleted = 0
    ORDER BY id DESC
  `;
  db.query(sql, (err, results) => {
    if (err) return res.status(500).send('Error fetching slider books');
    res.json(results);
  });
};

// Get a single book by ID
exports.getBookById = (req, res) => {
  const { id } = req.params;
  if (!id) return res.status(400).send('ID is required');

  const sql = `SELECT id, bookName, createdOn, modifiedOn FROM home_books_slider WHERE id = ? AND isDeleted = 0`;
  db.query(sql, [id], (err, results) => {
    if (err) return res.status(500).send('Error fetching book');
    if (results.length === 0) return res.status(404).send('Book not found');
    res.json(results[0]);
  });
};

// Get image
exports.getBookImage = (req, res) => {
  const { id } = req.params;
  if (!id) return res.status(400).send('ID is required');

  const sql = `SELECT bookImage FROM home_books_slider WHERE id = ? AND isDeleted = 0`;
  db.query(sql, [id], (err, results) => {
    if (err) return res.status(500).send('Error fetching image');
    if (results.length > 0 && results[0].bookImage) {
      res.setHeader("Content-Type", "image/jpeg");
      res.send(results[0].bookImage);
    } else {
      res.status(404).send('Image not found');
    }
  });
};

// Create book slider entry
exports.createBook = (req, res) => {
  const { bookName } = req.body;
  const bookImage = req.file ? req.file.buffer : null;

  if (!bookName || !bookImage) {
    return res.status(400).send('Book name and image are required');
  }

  const createdOn = new Date();
  const modifiedOn = new Date();

  const sql = `
    INSERT INTO home_books_slider (bookName, bookImage, createdOn, modifiedOn, isDeleted)
    VALUES (?, ?, ?, ?, 0)
  `;
  db.query(sql, [bookName, bookImage, createdOn, modifiedOn], (err, result) => {
    if (err) return res.status(500).send('Error creating book');
    res.status(201).json({ message: 'Book slider entry created', id: result.insertId });
  });
};

// Update book slider entry
exports.updateBook = (req, res) => {
  const { id } = req.params;
  const { bookName } = req.body;
  const bookImage = req.file ? req.file.buffer : null;

  if (!id || !bookName) {
    return res.status(400).send('ID and book name are required');
  }

  const modifiedOn = new Date();

  let sql = `
    UPDATE home_books_slider SET
    ${bookImage ? "bookImage = ?, " : ""}
    bookName = ?,
    modifiedOn = ?
    WHERE id = ? AND isDeleted = 0
  `;

  const params = [];
  if (bookImage) params.push(bookImage);
  params.push(bookName, modifiedOn, id);

  db.query(sql, params, (err, result) => {
    if (err) return res.status(500).send('Error updating book');
    if (result.affectedRows === 0) return res.status(404).send('Book not found');
    res.json({ message: 'Book slider entry updated' });
  });
};

// Soft delete
exports.deleteBook = (req, res) => {
  const { id } = req.params;
  if (!id) return res.status(400).send('ID is required');

  const modifiedOn = new Date();
  const sql = `UPDATE home_books_slider SET isDeleted = 1, modifiedOn = ? WHERE id = ?`;

  db.query(sql, [modifiedOn, id], (err, result) => {
    if (err) return res.status(500).send('Error deleting book');
    if (result.affectedRows === 0) return res.status(404).send('Book not found');
    res.send('Book slider entry soft-deleted');
  });
};
