const express = require("express");
const router = express.Router();
const multer = require("multer");
const eventController = require("../controllers/eventController");

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Routes
router.get("/", eventController.getAllEvents);
router.get("/:id", eventController.getEventById);
router.get("/image/:id", eventController.getEventImage);

router.post("/", upload.single("image"), eventController.createEvent);
router.patch("/:id", upload.single("image"), eventController.updateEvent);
router.delete("/:id", eventController.deleteEvent);

module.exports = router;
