const express = require("express");
const router = express.Router();
const multer = require('multer');
const writerController = require("../controllers/writerController"); // Make sure this path is correct

// Setup multer memory storage
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Routes
router.get("/", writerController.getAllWriters);
router.get('/:id', writerController.getWriterById);
router.get("/image/:id", writerController.getWriterImage);

router.post("/", upload.single('image'), writerController.createWriter);
router.put("/:id", upload.single('image'), writerController.updateWriter);

router.delete("/:id", writerController.deleteWriter);

module.exports = router;
