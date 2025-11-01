const express = require("express");
const router = express.Router();
const { getBookSliderData } = require("../controllers/bookSliderController");

router.get("/book_slider", getBookSliderData);

module.exports = router;