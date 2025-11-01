const express = require("express");
const router = express.Router();
const multer = require("multer");
const controller = require("../controllers/homeBookSliderController");

const upload = multer({ storage: multer.memoryStorage() });

router.get("/", controller.getAllBooks);
router.get("/:id", controller.getBookById);
router.get("/image/:id", controller.getBookImage);
router.post("/", upload.single("bookImage"), controller.createBook);
router.put("/:id", upload.single("bookImage"), controller.updateBook);
router.delete("/:id", controller.deleteBook);

module.exports = router;
