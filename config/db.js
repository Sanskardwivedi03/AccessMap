const mongoose = require("mongoose");
const dns = require("dns");

// Use public DNS servers for Node's SRV lookup.
// Windows nslookup can resolve MongoDB, while Node's
// default resolver is currently returning ECONNREFUSED.
dns.setServers([
  "8.8.8.8",
  "1.1.1.1"
]);

async function connectDB() {
  try {
    console.log("Connecting to MongoDB...");

    await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 15000
    });

    console.log("MongoDB connected successfully");
  } catch (error) {
    console.error("MongoDB connection failed:");
    console.error(error.message);
    process.exit(1);
  }
}

module.exports = connectDB;