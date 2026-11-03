const mongoose = require("mongoose");

const reviewSchema = new mongoose.Schema(
  {
    review_id: {
      type: String,
      unique: true,
      index: true
    },
    place_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Place",
      required: true
    },
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    admin_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null
    },
    comment: {
      type: String,
      required: true,
      trim: true
    },
    rating: {
      type: Number,
      min: 1,
      max: 5,
      required: true
    }
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } }
);

reviewSchema.pre("save", function(next) {
  if (!this.review_id) {
    this.review_id = this._id.toString();
  }
  next();
});

module.exports = mongoose.model("Review", reviewSchema);
