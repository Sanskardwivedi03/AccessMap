const express = require("express");
const router = express.Router();

const {
  createReview,
  getReviews,
  getAllReviews
} = require("../controllers/reviewController");

const { protect } = require("../middleware/authMiddleware");

// List community reviews or filter them by a specific place.
router.get("/", getAllReviews);
router.get("/place/:placeId", getReviews);
router.post("/", protect, createReview);

module.exports = router;
