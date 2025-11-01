const express = require("express");
const router = express.Router();
const multer = require("multer");
const newQuestionController = require("../controllers/questionController");

const storage = multer.memoryStorage();
const upload = multer({ storage });

// Routes
router.get("/", newQuestionController.getAllNewQuestions);
router.get("/:id", newQuestionController.getNewQuestionById);
router.get("/image/:id", newQuestionController.getNewQuestionImage);

router.post("/", upload.single('image'), newQuestionController.createNewQuestion);
router.patch("/:id", upload.single('image'), newQuestionController.updateNewQuestion);
router.delete("/:id", newQuestionController.deleteNewQuestion);

module.exports = router;
