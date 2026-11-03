const express = require("express");
const router = express.Router();

const {
  createReport,
  getReports,
  updateReport
} = require("../controllers/reportController");

const { protect } = require("../middleware/authMiddleware");
const { adminOnly } = require("../middleware/adminMiddleware");

router.post("/", protect, createReport);
router.get("/", protect, adminOnly, getReports);
router.patch("/:id", protect, adminOnly, updateReport);

module.exports = router;
