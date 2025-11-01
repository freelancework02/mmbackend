const pool = require("../config/db");

exports.getBookSliderData = (req, res) => {
  pool.query("SELECT * FROM book_slider", (err, result) => {
    if (err) return res.status(500).send(err);
    res.json(result);
  });
};