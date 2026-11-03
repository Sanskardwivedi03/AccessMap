const mongoose = require("mongoose");

const accessibilityFacilitySchema = new mongoose.Schema(
  {
    facility_id: {
      type: String,
      unique: true,
      index: true
    },
    place_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Place",
      default: null
    },
    name: {
      type: String,
      required: true
    },
    type: {
      type: String,
      required: true
    },
    description: {
      type: String,
      default: ""
    },
    is_accessible: {
      type: Boolean,
      default: false
    },
    details: {
      type: String,
      default: ""
    },
    latitude: Number,
    longitude: Number,
    osm_id: String
  },
  { timestamps: true }
);

accessibilityFacilitySchema.pre("save", function(next) {
  if (!this.facility_id) {
    this.facility_id = this._id.toString();
  }
  next();
});

module.exports = mongoose.model(
  "AccessibilityFacility",
  accessibilityFacilitySchema
);
