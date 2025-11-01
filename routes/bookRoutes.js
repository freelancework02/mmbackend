const express = require("express");
const router = express.Router();
const multer = require("multer");
const bookController = require("../controllers/bookController");

const storage = multer.memoryStorage();
const upload = multer({ 
  storage: storage, 
  limits: { fileSize: 200 * 1024 * 1024 }  // 200 MB limit
});

// For handling multiple files (cover image & attachment)
const fileFields = upload.fields([
  { name: "coverImage", maxCount: 1 },
  { name: "attachment", maxCount: 1 }
]);

router.get("/", bookController.getAllBooks);
router.get("/count", bookController.getBookCount);
router.get("/:id", bookController.getBookById);
router.get("/cover/:id", bookController.getCoverImage);
router.get("/attachment/:id", bookController.getAttachment);

router.post("/", fileFields, bookController.createBook);
router.patch("/:id", fileFields, bookController.updateBook);
router.delete("/:id", bookController.deleteBook);

module.exports = router;
