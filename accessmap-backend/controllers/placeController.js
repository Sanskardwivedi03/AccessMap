const Place = require("../models/Place");
const AccessibilityFacility = require("../models/AccessibilityFacility");

async function getPlaces(req, res) {
  try {
    const {
      search,
      category,
      wheelchair,
      tactile_paving,
      limit = 100
    } = req.query;

    const query = {};

    if (category) {
      query.category = new RegExp(`^${escapeRegex(category)}$`, "i");
    }

    if (wheelchair) {
      query["accessibility.wheelchair"] = wheelchair;
    }

    if (tactile_paving) {
      query["accessibility.tactile_paving"] = tactile_paving;
    }

    if (search) {
      query.$text = { $search: search };
    }

    const places = await Place.find(query)
      .limit(Math.min(Number(limit), 500))
      .sort({ name: 1 });

    res.json({
      count: places.length,
      places
    });
  } catch (error) {
    res.status(500).json({
      message: "Could not load places",
      error: error.message
    });
  }
}

async function getPlaceById(req, res) {
  try {
    const place = await Place.findById(req.params.id);

    if (!place) {
      return res.status(404).json({
        message: "Place not found"
      });
    }

    const facilities = await AccessibilityFacility.find({
      place_id: place._id
    });

    res.json({
      place,
      facilities
    });
  } catch (error) {
    res.status(500).json({
      message: "Could not load place",
      error: error.message
    });
  }
}

async function nearbyPlaces(req, res) {
  try {
    const lat = Number(req.query.lat);
    const lng = Number(req.query.lng);
    const radius = Number(req.query.radius || 5000);

    if (
      Number.isNaN(lat) ||
      Number.isNaN(lng)
    ) {
      return res.status(400).json({
        message: "lat and lng are required"
      });
    }

    const places = await Place.find({
      location: {
        $near: {
          $geometry: {
            type: "Point",
            coordinates: [lng, lat]
          },
          $maxDistance: radius
        }
      }
    }).limit(100);

    res.json({
      count: places.length,
      places
    });
  } catch (error) {
    res.status(500).json({
      message: "Could not find nearby places",
      error: error.message
    });
  }
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

module.exports = {
  getPlaces,
  getPlaceById,
  nearbyPlaces
};
