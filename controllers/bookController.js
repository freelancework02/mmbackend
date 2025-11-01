const db = require("../config/db");
const admin = require("../config/firebase");

// Create a book
exports.createBook = (req, res) => {
  const {
    title, isbn, description, author, translator, bookDate,
    status, category, isPublished, language
  } = req.body;

  const coverImage = req.files?.coverImage?.[0]?.buffer || null;
  const attachment = req.files?.attachment?.[0]?.buffer || null;

  // Remove 'translator' from required check
  if (!title || !isbn || !description || !author || !bookDate || !status || !category || isPublished === undefined || !language || !coverImage || !attachment) {
    return res.status(400).send("All required fields (excluding translator) must be provided including files.");
  }

  const createdOn = new Date();
  const modifiedOn = new Date();
  const isDeleted = 0;

  const sql = `
    INSERT INTO Books_New
    (coverImage, attachment, title, isbn, description, author, translator, bookDate, status, category, language, createdOn, isPublished, modifiedOn, isDeleted)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  db.query(sql, [
    coverImage, attachment, title, isbn, description, author, translator || null, bookDate,
    status, category, language, createdOn, isPublished === 'true' ? 1 : 0, modifiedOn, isDeleted
  ], (err, result) => {
    if (err) {
      console.error("Error saving book:", err);
      return res.status(500).send("Error saving book");
    }
    res.send("Book saved successfully!");
  });
};

// Get all books (excluding file buffers)
exports.getAllBooks = (req, res) => {
  const sql = `
    SELECT 
      id, 
      title, 
      isbn, 
      REGEXP_REPLACE(description, '<[^>]*>', '') AS description,
      author, 
      translator, 
      bookDate, 
      status, 
      category, 
      language, 
      isPublished, 
      createdOn, 
      modifiedOn
    FROM Books_New
    WHERE isDeleted = 0
    ORDER BY createdOn DESC
  `;
  db.query(sql, (err, result) => {
    if (err) return res.status(500).send(err);
    res.send(result);
  });
};


// Get book by ID
exports.getBookById = (req, res) => {
  const id = req.params.id;
  const sql = `
    SELECT id, title, isbn, description, author, translator, bookDate, status, category, language, 
           isPublished, createdOn, modifiedOn
    FROM Books_New
    WHERE id = ? AND isDeleted = 0
  `;
  db.query(sql, [id], (err, results) => {
    if (err) return res.status(500).send(err);
    if (!results.length) return res.status(404).send("Book not found");
    res.json(results[0]);
  });
};

// Get cover image by book ID
exports.getCoverImage = (req, res) => {
  const id = req.params.id;
  db.query("SELECT coverImage FROM Books_New WHERE id = ? AND isDeleted = 0", [id], (err, results) => {
    if (err) return res.status(500).send("Error fetching image");
    if (!results.length || !results[0].coverImage) return res.status(404).send("Image not found");
    res.setHeader("Content-Type", "image/jpeg");
    res.send(results[0].coverImage);
  });
};

// Get attachment (e.g., PDF)
exports.getAttachment = (req, res) => {
  const id = req.params.id;
  db.query("SELECT attachment FROM Books_New WHERE id = ? AND isDeleted = 0", [id], (err, results) => {
    if (err) return res.status(500).send("Error fetching attachment");
    if (!results.length || !results[0].attachment) return res.status(404).send("Attachment not found");
    res.setHeader("Content-Type", "application/pdf");
    res.send(results[0].attachment);
  });
};

// Update book
exports.updateBook = (req, res) => {
  const id = req.params.id;
  const {
    title, isbn, description, author, translator, bookDate,
    status, category, isPublished, language
  } = req.body;

  const coverImage = req.files?.coverImage?.[0]?.buffer || null;
  const attachment = req.files?.attachment?.[0]?.buffer || null;

  const modifiedOn = new Date();

  let fields = [
    "title = ?", "isbn = ?", "description = ?", "author = ?",
    "translator = ?", "bookDate = ?", "status = ?", "category = ?",
    "language = ?", "isPublished = ?", "modifiedOn = ?"
  ];
  let values = [
    title, isbn, description, author, translator || null, bookDate,
    status, category, language, isPublished === 'true' ? 1 : 0, modifiedOn
  ];

  if (coverImage) {
    fields.unshift("coverImage = ?");
    values.unshift(coverImage);
  }
  if (attachment) {
    fields.unshift("attachment = ?");
    values.unshift(attachment);
  }

  const sql = `UPDATE Books_New SET ${fields.join(", ")} WHERE id = ? AND isDeleted = 0`;
  values.push(id);

  db.query(sql, values, (err, result) => {
    if (err) {
      console.error("Error updating book:", err);
      return res.status(500).send("Error updating book");
    }
    res.send("Book updated successfully!");
  });
};

// Soft delete book
exports.deleteBook = (req, res) => {
  const id = req.params.id;
  const modifiedOn = new Date();
  const sql = `UPDATE Books_New SET isDeleted = 1, modifiedOn = ? WHERE id = ?`;
  db.query(sql, [modifiedOn, id], (err, result) => {
    if (err) return res.status(500).send("Error deleting book");
    res.send("Book deleted successfully (soft delete)");
  });
};


// Count records
exports.getBookCount = async (req, res) => {
 const mysqlQuery = `
    SELECT 
      (SELECT COUNT(*) FROM New_Writer WHERE isDeleted = 0) AS writerCount,
      (SELECT COUNT(*) FROM New_Translator) AS translatorCount,
      (SELECT COUNT(*) FROM Books_New WHERE isDeleted = 0) AS bookCount,
      (SELECT COUNT(*) FROM New_Articles WHERE isDeleted = 0) AS articleCount,
      (SELECT COUNT(*) FROM New_Question_Table WHERE isDeleted = 0) AS questionCount,
      (SELECT COUNT(*) FROM feedback) AS feedbackCount
  `;

  try {
    // MySQL count
    const [mysqlResult] = await new Promise((resolve, reject) => {
      db.query(mysqlQuery, (err, result) => {
        if (err) return reject(err);
        resolve(result);
      });
    });

    // Firestore admin count
    const adminSnapshot = await admin.firestore().collection("admins").get();
    const adminCount = adminSnapshot.size;

    res.json({
      ...mysqlResult,
      adminCount
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Error fetching counts");
  }
};
