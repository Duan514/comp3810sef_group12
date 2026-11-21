const dns = require('dns');
// Force Node.js to use Google's public DNS to resolve addresses, fixing the ECONNREFUSED error on Windows.
dns.setServers(['8.8.8.8', '8.8.4.4']); 

require('dotenv').config();
const mongoose = require('mongoose');

const uri = process.env.MONGODB_URI;

if (!uri) {
    console.log("❌ Error: MONGODB_URI not found in .env file");
    process.exit(1);
}

console.log("⏳ Attempting to connect to the database...");

// Added a connection timeout. It will throw an error if it cannot connect within 5 seconds, preventing it from hanging indefinitely.
mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 })
    .then(() => {
        console.log("✅ Congratulations! Database connected successfully! The password and Link are correct!");
        process.exit(0); 
    })
    .catch((err) => {
        console.error("❌ Database connection failed!");
        console.error("Error message:", err.message);
        process.exit(1);
    });