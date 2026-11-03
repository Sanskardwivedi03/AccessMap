const Report = require("../models/Report");

async function createReport(req, res) {
  try {
    const {
      place_id = null,
      description,
      report_type = "Other"
    } = req.body;

    if (!description) {
      return res.status(400).json({
        message: "Description is required"
      });
    }

    const report = await Report.create({
      user_id: req.user._id,
      place_id,
      description,
      report_type
    });

    res.status(201).json({
      message: "Accessibility report submitted",
      report
    });
  } catch (error) {
    res.status(500).json({
      message: "Could not submit report",
      error: error.message
    });
  }
}

async function getReports(req, res) {
  try {
    const reports = await Report.find()
      .populate("user_id", "name email")
      .populate("place_id", "name category")
      .populate("admin_id", "name email")
      .sort({ created_at: -1 });

    res.json({
      count: reports.length,
      reports
    });
  } catch (error) {
    res.status(500).json({
      message: "Could not load reports",
      error: error.message
    });
  }
}

async function updateReport(req, res) {
  try {
    const { status } = req.body;

    const allowed = [
      "pending",
      "verified",
      "rejected",
      "resolved"
    ];

    if (!allowed.includes(status)) {
      return res.status(400).json({
        message: "Invalid report status"
      });
    }

    const report = await Report.findByIdAndUpdate(
      req.params.id,
      {
        status,
        admin_id: req.user._id
      },
      { new: true }
    );

    if (!report) {
      return res.status(404).json({
        message: "Report not found"
      });
    }

    res.json({
      message: "Report updated",
      report
    });
  } catch (error) {
    res.status(500).json({
      message: "Could not update report",
      error: error.message
    });
  }
}

module.exports = {
  createReport,
  getReports,
  updateReport
};
