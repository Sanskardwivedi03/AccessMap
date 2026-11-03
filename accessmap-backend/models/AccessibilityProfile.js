const mongoose = require("mongoose");

const accessibilityProfileSchema = new mongoose.Schema(
  {
    profile_id: {
      type: String,
      unique: true,
      index: true
    },
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true
    },
    mobility_needs: {
      type: Boolean,
      default: false
    },
    sensory_needs: {
      type: Boolean,
      default: false
    },
    preferences: {
      ramps: { type: Boolean, default: false },
      tactile_paths: { type: Boolean, default: false },
      accessible_routes: { type: Boolean, default: false },
      route_barriers: { type: Boolean, default: false },
      voice_information: { type: Boolean, default: false }
    },
    additional_info: {
      type: String,
      default: ""
    }
  },
  { timestamps: true }
);

accessibilityProfileSchema.pre("save", function(next) {
  if (!this.profile_id) {
    this.profile_id = this._id.toString();
  }
  next();
});

module.exports = mongoose.model(
  "AccessibilityProfile",
  accessibilityProfileSchema
);
