const express = require("express");
const router = express.Router();
const multer = require('multer');
const articleController = require("../controllers/articleController");

// Setup multer memory storage
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Routes
router.get("/", articleController.getAllArticles);
router.get("/:id", articleController.getArticleById);
router.get("/image/:id", articleController.getArticleImage);

router.post("/", upload.single('image'), articleController.createArticle);
router.patch("/:id", upload.single('image'), articleController.updateArticle);


router.delete("/:id", articleController.deleteArticle);

module.exports = router;
