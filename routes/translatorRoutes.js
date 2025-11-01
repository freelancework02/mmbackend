const express = require("express");
const router = express.Router();
const multer = require('multer');
const translatorController = require("../controllers/translatorController");

// Setup multer memory storage
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Routes
router.get("/", translatorController.getAllTranslators);
router.get("/image/:id", translatorController.getTranslatorImage);

router.post("/", upload.single('image'), translatorController.createTranslator);
router.put("/:id", upload.single('image'), translatorController.updateTranslator);

router.delete("/:id", translatorController.deleteTranslator);

module.exports = router;
