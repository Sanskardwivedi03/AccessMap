const mongoose = require("mongoose");

const placeSchema = new mongoose.Schema(
  {
    place_id: {
      type: String,
      unique: true,
      index: true
    },
    osm_id: {
      type: String,
      index: true
    },
    osm_type: String,
    name: {
      type: String,
      default: "Unnamed place"
    },
    address: {
      type: String,
      default: ""
    },
    latitude: Number,
    longitude: Number,
    location: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point"
      },
      coordinates: {
        type: [Number],
        default: [0, 0]
      }
    },
    description: {
      type: String,
      default: ""
    },
    category: {
      type: String,
      default: "Other",
      index: true
    },
    accessibility: {
      wheelchair: String,
      tactile_paving: String,
      ramp: String,
      elevator: String,
      toilets_wheelchair: String,
      entrance: String,
      parking: String,
      braille: String,
      hearing_loop: String,
      sign_language: String
    },
    surface: String,
    width: String,
    phone: String,
    website: String
  },
  { timestamps: true }
);

placeSchema.index({ location: "2dsphere" });
placeSchema.index({ name: "text", category: "text", address: "text" });

module.exports = mongoose.model("Place", placeSchema);
