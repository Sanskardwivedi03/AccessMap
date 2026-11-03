const User = require("../models/User");

const ALLOWED_DISABILITIES = [
  "Mobility support",
  "Visual support",
  "Hearing support",
  "Speech / communication support"
];

const ALLOWED_PRIORITIES = [
  "Ramps & accessible entrances",
  "Tactile paths",
  "Route barriers",
  "Voice information"
];

// GET /api/profile
async function getProfile(req, res) {
  try {
    const user = await User.findById(req.user._id)
      .select("disability priority");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    res.json({
      success: true,
      disability: user.disability || [],
      priority: user.priority || []
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Could not load accessibility profile"
    });
  }
}

// PUT /api/profile
async function updateProfile(req, res) {
  try {
    const { disability, priority } = req.body;

    if (!Array.isArray(disability) ||
        !Array.isArray(priority)) {
      return res.status(400).json({
        success: false,
        message: "Disability and priority must be arrays"
      });
    }

    if (
      !disability.every(item =>
        ALLOWED_DISABILITIES.includes(item)
      ) ||
      !priority.every(item =>
        ALLOWED_PRIORITIES.includes(item)
      )
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid accessibility selection"
      });
    }

    const user = await User.findByIdAndUpdate(
      req.user._id,
      {
        $set: {
          disability: [...new Set(disability)],
          priority: [...new Set(priority)]
        }
      },
      {
        new: true,
        runValidators: true
      }
    ).select("name email disability priority");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    res.json({
      success: true,
      message: "Accessibility preferences saved",
      disability: user.disability,
      priority: user.priority
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Could not save accessibility profile"
    });
  }
}

module.exports = {
  getProfile,
  updateProfile
};
