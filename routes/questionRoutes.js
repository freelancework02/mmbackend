const express = require("express");
const router = express.Router();
const multer = require("multer");
const newQuestionController = require("../controllers/questionController");

const storage = multer.memoryStorage();
const upload = multer({ storage });

// Specific routes FIRST (to avoid /:id swallowing them)
router.get("/image/:id", newQuestionController.getNewQuestionImage);
router.get("/tag/:tag", newQuestionController.getQuestionsByTag);

// Collection
router.get("/", newQuestionController.getAllNewQuestions);

// Create
router.post("/", upload.single("image"), newQuestionController.createNewQuestion);

// Single (must be AFTER specific routes)
router.get("/:id", newQuestionController.getNewQuestionById);
router.patch("/:id", upload.single("image"), newQuestionController.updateNewQuestion);
router.delete("/:id", newQuestionController.deleteNewQuestion);

module.exports = router;
