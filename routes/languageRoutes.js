const express = require("express");
const router = express.Router();
const languageController = require("../controllers/languageController");

router.get("/language", languageController.getAllLanguages);
router.post("/language", languageController.createLanguage); // <-- New route

router.put("/language/:id", languageController.updateLanguage);

router.delete("/language/:id", languageController.deleteLanguage);


module.exports = router;
