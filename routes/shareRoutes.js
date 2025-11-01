const express = require("express");
const router = express.Router();
const { handleShare } = require("../controllers/shareController");

// Route: /share/:type/:id/:slug
router.get("/:type/:id/:slug", handleShare);

module.exports = router;
