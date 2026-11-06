const Review = require("../models/Review");
const Place = require("../models/Place");

async function createReview(req, res) {
  try {
    const { place_id, comment, rating } = req.body;
    const numericRating = Number(rating);
    const cleanComment = String(comment || "").trim();

    if (!place_id || !cleanComment || !Number.isInteger(numericRating) || numericRating < 1 || numericRating > 5) {
      return res.status(400).json({
        message: "place_id, a comment and a rating from 1 to 5 are required"
      });
    }

    const place = await Place.findById(place_id);
    if (!place) {
      return res.status(404).json({ message: "Place not found" });
    }

    const review = await Review.create({
      place_id: place._id,
      user_id: req.user._id,
      comment: cleanComment,
      rating: numericRating
    });

    const savedReview = await Review.findById(review._id)
      .populate("user_id", "name")
      .populate("place_id", "name category");

    return res.status(201).json({
      message: "Review created",
      review: savedReview
    });
  } catch (error) {
    return res.status(500).json({
      message: "Could not create review",
      error: error.message
    });
  }
}

async function getReviews(req, res) {
  try {
    const reviews = await Review.find({ place_id: req.params.placeId })
      .populate("user_id", "name")
      .populate("admin_id", "name")
      .populate("place_id", "name category")
      .sort({ created_at: -1 });

    return res.json({ count: reviews.length, reviews });
  } catch (error) {
    return res.status(500).json({
      message: "Could not load reviews",
      error: error.message
    });
  }
}

async function getAllReviews(req, res) {
  try {
    const reviews = await Review.find({})
      .populate("user_id", "name")
      .populate("admin_id", "name")
      .populate("place_id", "name category")
      .sort({ created_at: -1 })
      .limit(200);

    return res.json({ count: reviews.length, reviews });
  } catch (error) {
    return res.status(500).json({
      message: "Could not load reviews",
      error: error.message
    });
  }
}

module.exports = {
  createReview,
  getReviews,
  getAllReviews
};
