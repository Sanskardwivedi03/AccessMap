const mongoose = require("mongoose");

const reportSchema = new mongoose.Schema(
  {
    report_id: {
      type: String,
      unique: true,
      index: true
    },
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    place_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Place",
      default: null
    },
    description: {
      type: String,
      required: true
    },
    report_type: {
      type: String,
      default: "Other"
    },
    status: {
      type: String,
      enum: ["pending", "verified", "rejected", "resolved"],
      default: "pending"
    },
    admin_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null
    }
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } }
);

reportSchema.pre("save", function(next) {
  if (!this.report_id) {
    this.report_id = this._id.toString();
  }
  next();
});

module.exports = mongoose.model("Report", reportSchema);
