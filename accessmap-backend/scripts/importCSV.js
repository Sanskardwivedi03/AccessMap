require("dotenv").config();

const fs = require("fs");
const path = require("path");
const csv = require("csv-parser");
const mongoose = require("mongoose");

const connectDB = require("../config/db");
const Place = require("../models/Place");
const AccessibilityFacility = require("../models/AccessibilityFacility");

const CSV_PATH =
  process.argv[2] ||
  path.join(
    __dirname,
    "..",
    "data",
    "delhi_accessibility_preprocessed (1).csv"
  );

function clean(value) {
  if (value === undefined || value === null) return "";
  const text = String(value).trim();
  return text === "" || text.toLowerCase() === "nan"
    ? ""
    : text;
}

function boolFrom(value) {
  return ["yes", "true", "1"].includes(clean(value).toLowerCase());
}

function uniqueFacilityName(row) {
  return clean(row.accessibility_feature) ||
    clean(row.highway) ||
    "Tactile accessibility feature";
}

async function importCSV() {
  await connectDB();

  if (!fs.existsSync(CSV_PATH)) {
    console.error(`CSV not found: ${CSV_PATH}`);
    process.exit(1);
  }

  const rows = [];

  await new Promise((resolve, reject) => {
    fs.createReadStream(CSV_PATH)
      .pipe(csv())
      .on("data", row => rows.push(row))
      .on("end", resolve)
      .on("error", reject);
  });

  console.log(`Read ${rows.length} CSV rows`);

  const placeRows =
    rows.filter(row => clean(row.record_type) === "PLACE");

  const tactileRows =
    rows.filter(row => clean(row.record_type) === "TACTILE_FEATURE");

  console.log(`PLACE rows: ${placeRows.length}`);
  console.log(`TACTILE_FEATURE rows: ${tactileRows.length}`);

  /*
    Clear only imported OSM data.
    This makes re-running the importer predictable.
  */

  await Place.deleteMany({});
  await AccessibilityFacility.deleteMany({});

  const placeDocs = placeRows.map(row => {
    const latitude = Number(row.latitude);
    const longitude = Number(row.longitude);

    return {
      place_id: `osm-${clean(row.osm_id)}`,
      osm_id: clean(row.osm_id),
      osm_type: clean(row.osm_type),
      name: clean(row.place_name) || "Unnamed place",
      address: "",
      latitude,
      longitude,
      location: {
        type: "Point",
        coordinates: [longitude, latitude]
      },
      category: clean(row.place_type) || "Other",
      description: "",
      accessibility: {
        wheelchair: clean(row.wheelchair),
        tactile_paving: clean(row.tactile_paving),
        ramp: clean(row.ramp),
        elevator: clean(row.elevator),
        toilets_wheelchair: clean(row.toilets_wheelchair),
        entrance: clean(row.entrance),
        parking: clean(row.parking),
        braille: clean(row.braille),
        hearing_loop: clean(row.hearing_loop),
        sign_language: clean(row.sign_language)
      },
      surface: clean(row.surface),
      width: clean(row.width),
      phone: clean(row.phone),
      website: clean(row.website)
    };
  });

  if (placeDocs.length) {
    await Place.insertMany(placeDocs, { ordered: false });
  }

  /*
    Build a lookup of imported places by OSM id/name.
  */

  const importedPlaces = await Place.find(
    {},
    { _id: 1, osm_id: 1, name: 1 }
  ).lean();

  const byName = new Map();

  for (const place of importedPlaces) {
    if (!byName.has(place.name)) {
      byName.set(place.name, place);
    }
  }

  const facilityDocs = [];

  for (const row of tactileRows) {
    const featureName = uniqueFacilityName(row);
    const nearestName = clean(row.nearest_place);

    const nearestPlace =
      byName.get(nearestName);

    const latitude = Number(row.latitude);
    const longitude = Number(row.longitude);

    facilityDocs.push({
      facility_id:
        `osm-facility-${clean(row.osm_id)}`,
      place_id:
        nearestPlace ? nearestPlace._id : null,
      name: featureName,
      type:
        clean(row.accessibility_feature) ||
        clean(row.highway) ||
        "Tactile feature",
      description:
        `Imported from OpenStreetMap accessibility data.`,
      is_accessible:
        boolFrom(row.tactile_paving) ||
        boolFrom(row.wheelchair),
      details: [
        clean(row.tactile_paving)
          ? `Tactile paving: ${clean(row.tactile_paving)}`
          : "",
        clean(row.wheelchair)
          ? `Wheelchair: ${clean(row.wheelchair)}`
          : "",
        clean(row.crossing_signals)
          ? `Crossing signals: ${clean(row.crossing_signals)}`
          : "",
        clean(row.surface)
          ? `Surface: ${clean(row.surface)}`
          : ""
      ].filter(Boolean).join(" | "),
      latitude,
      longitude,
      osm_id: clean(row.osm_id)
    });
  }

  if (facilityDocs.length) {
    await AccessibilityFacility.insertMany(
      facilityDocs,
      { ordered: false }
    );
  }

  console.log("Import completed successfully.");
  console.log(`Places inserted: ${placeDocs.length}`);
  console.log(`Accessibility facilities inserted: ${facilityDocs.length}`);

  await mongoose.disconnect();
}

importCSV()
  .catch(error => {
    console.error("Import failed:", error);
    process.exit(1);
  });
