const db = require("../config/db");

exports.getAllPrintedBook = (req, res) => {
  db.query("SELECT * FROM printed_books", (err, result) => {
    if (err) return res.status(500).send(err);
    res.json(result);
  });
};