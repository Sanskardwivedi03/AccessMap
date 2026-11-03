const mongoose = require("mongoose");

const routeSchema = new mongoose.Schema(
  {
    route_id: {
      type: String,
      unique: true,
      index: true
    },
    start_place_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Place",
      required: true
    },
    end_place_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Place",
      required: true
    },
    distance: Number,
    duration: Number,
    is_accessible: {
      type: Boolean,
      default: false
    },
    barriers: {
      type: [String],
      default: []
    },
    geometry: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    }
  },
  { timestamps: true }
);

routeSchema.pre("save", function(next) {
  if (!this.route_id) {
    this.route_id = this._id.toString();
  }
  next();
});

module.exports = mongoose.model("Route", routeSchema);
