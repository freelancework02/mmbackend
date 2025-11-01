const express = require("express");
const router = express.Router();
const bookRequestController = require("../controllers/bookRequestController");

router.get("/", bookRequestController.getAllBookRequests);
router.post("/", bookRequestController.createBookRequest);

module.exports = router;