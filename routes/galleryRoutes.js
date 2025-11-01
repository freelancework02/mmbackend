// routes/galleryRoutes.js
const express = require("express");
const multer = require("multer");

const {
  createGallery,
  updateGallery,
  deleteGallery,
  getImageById,
  getByDetail,
  getAllGalleries,
  getGalleryById,
} = require("../controllers/galleryController");

const router = express.Router();

// ✅ Multer memory storage (store in RAM, not disk)
const storage = multer.memoryStorage();

// ✅ Accept only image files (JPEG, PNG, etc.)
const fileFilter = (req, file, cb) => {
  if (file.mimetype && file.mimetype.startsWith("image/")) cb(null, true);
  else cb(new Error("Only image files are allowed"), false);
};

// ✅ Configure multer
const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // max 50MB per file
  fileFilter,
});

// ✅ Routes

// Create new gallery (multiple images)
router.post("/", upload.array("images", 50), createGallery);

// Update existing gallery (replace with 1 image optionally)
router.put("/:id", upload.array("images", 1), updateGallery);

// Delete gallery
router.delete("/:id", deleteGallery);

// Get gallery by ID (with metadata + image IDs)
router.get("/:id", getGalleryById);

// Get raw image binary by ID
router.get("/image/:id", getImageById);

// Get by title/date
router.get("/detail", getByDetail);

// Get all galleries (paginated)
router.get("/", getAllGalleries);

module.exports = router;
