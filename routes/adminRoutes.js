const express = require("express");
const router = express.Router();
const { getAllAdmins, createAdmin, getAdminById, updateAdmin, deleteAdmin } = require("../controllers/adminController");

router.get("/admin", getAllAdmins);
router.get("/admin/:id", getAdminById);
router.post("/admincreate", createAdmin);
router.put("/admin/:id", updateAdmin); // editrouter.delete("/admin/:id", deleteAdmin);
router.delete("/admin/:id", deleteAdmin);
module.exports = router;