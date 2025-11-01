const express = require("express");
const router = express.Router();
const multer = require("multer");
const aboutContentController = require("../controllers/aboutContentController");

// Setup multer memory storage for image upload
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Routes
router.get("/", aboutContentController.getAllAboutContents);
router.get("/:id", aboutContentController.getAboutContentById);
router.get("/image/:id", aboutContentController.getAboutContentImage);

router.post("/", upload.single("image"), aboutContentController.createAboutContent);
router.put("/:id", upload.single("image"), aboutContentController.updateAboutContent);
router.delete("/:id", aboutContentController.deleteAboutContent);

module.exports = router;
