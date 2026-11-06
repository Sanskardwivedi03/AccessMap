const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true
        },

        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
            index: true
        },

        // Never store the actual password.
        // Store only the hash and salt.
        passwordHash: {
            type: String,
            required: true
        },

        passwordSalt: {
            type: String,
            required: true
        },

        authToken: {
            type: String,
            default: null,
            index: true
        },

        // Accessibility needs selected by the user.
        disability: {
            type: [String],
            default: []
        },

        // Information/features the user wants
        // the system to prioritise.
        priority: {
            type: [String],
            default: []
        }
    },

    {
        timestamps: true
    }
);

module.exports = mongoose.model(
    "User",
    userSchema
);