/*
  The ER diagram contains Admin as a separate entity.
  Authentication remains in User with role="admin".
  This model stores the ER-specific admin_id relationship
  without duplicating the password/email data.
*/

const mongoose = require("mongoose");

const adminSchema = new mongoose.Schema(
  {
    admin_id: {
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
    name: String,
    email: String,
    role: {
      type: String,
      default: "admin"
    }
  },
  { timestamps: true }
);

adminSchema.pre("save", function(next) {
  if (!this.admin_id) {
    this.admin_id = this._id.toString();
  }
  next();
});

module.exports = mongoose.model("Admin", adminSchema);
