const express = require("express");
const multer = require("multer");
const {
  createGallery,
  updateGalleryMeta,
  addImages,
  deleteImage,
  deleteGallery,
  getImageById,
  getAllGalleries,
  getGalleryById,
} = require("../controllers/galleryController");

const router = express.Router();

const storage = multer.memoryStorage();
const fileFilter = (req, file, cb) => {
  if (file.mimetype?.startsWith("image/")) cb(null, true);
  else cb(new Error("Only image files are allowed"), false);
};
const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter,
});

// Create gallery with multiple images
router.post("/", upload.array("images", 50), createGallery);

// Update gallery meta (no images here)
router.put("/:id", updateGalleryMeta);

// Add more images to an existing gallery
router.post("/:id/images", upload.array("images", 50), addImages);

// Delete a specific image
router.delete("/image/:imageId", deleteImage);

// Get image binary
router.get("/image/:imageId", getImageById);

// Get one gallery (meta + image list)
router.get("/:id", getGalleryById);

// List galleries (paginated)
router.get("/", getAllGalleries);

// Delete an entire gallery
router.delete("/:id", deleteGallery);

module.exports = router;
