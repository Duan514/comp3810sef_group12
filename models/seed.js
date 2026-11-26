// This file is used to seed the database with initial data for testing purposes.

process.env.MONGODB_URI = "mongodb+srv://Cdg111:Chendegao123@cluster0.vxksxkp.mongodb.net/?retryWrites=true&w=majority";
require('dotenv').config();


const path = require('path');
const dns = require('dns');
// Fix Windows DNS resolution issue
dns.setServers(['8.8.8.8', '8.8.4.4']);

require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const mongoose = require('mongoose');
const User = require('./User');
const Item = require('./Item');

mongoose.connect(process.env.MONGODB_URI).then(async () => {
console.log("⏳ Connected to MongoDB. Clearing old data...");
await User.deleteMany({});
await Item.deleteMany({});

// ========== Admin account（username: admin，password:123123，role:admin） ==========
const adminUser = await User.create({
  username: 'admin',
  password: User.hashPassword('123123'),
  email: 'admin@hkmu.edu.hk',
  isVerified: true,
  role: 'admin'
});


    console.log("✅ Data seeding completed successfully!");
    mongoose.disconnect();
}).catch(err => {
    console.error("❌ Seeding failed:", err.message);
    process.exit(1);
});