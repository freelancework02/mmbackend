const express = require("express");
const router = express.Router();
const printedBookController = require("../controllers/printedBookController");

router.get("/", printedBookController.getAllPrintedBook);

module.exports = router;