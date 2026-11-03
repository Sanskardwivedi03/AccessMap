const mongoose = require("mongoose");

const routeFacilitySchema = new mongoose.Schema(
  {
    route_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Route",
      required: true
    },
    facility_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AccessibilityFacility",
      required: true
    },
    is_accessible: {
      type: Boolean,
      default: false
    },
    notes: {
      type: String,
      default: ""
    }
  },
  { timestamps: true }
);

routeFacilitySchema.index({ route_id: 1, facility_id: 1 }, { unique: true });

module.exports = mongoose.model("RouteFacility", routeFacilitySchema);
