const express = require("express");
const router = express.Router();

const {
  getPlaces,
  getPlaceById,
  nearbyPlaces
} = require("../controllers/placeController");

router.get("/", getPlaces);
router.get("/nearby", nearbyPlaces);
router.get("/:id", getPlaceById);

module.exports = router;
