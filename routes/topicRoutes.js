const express = require("express");
const router = express.Router();
const multer = require('multer');
const topicController = require("../controllers/topicController");

// Setup multer memory storage
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Routes
router.get("/", topicController.getAllTopics);
router.get('/:id', topicController.getTopicById);
router.get("/image/:id", topicController.getTopicImage);

router.post("/", upload.single('image'), topicController.createTopic);
router.put("/:id", upload.single('image'), topicController.updateTopic);

router.delete("/:id", topicController.deleteTopic);

module.exports = router;
