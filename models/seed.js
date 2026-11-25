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

console.log("👤 Creating test users...");
// 密码用 scrypt 哈希存储（不再明文），并标记邮箱已验证，演示账号可直接登录
const seller1 = await User.create({ username: 'zhangsan', password: User.hashPassword('password123'), email: 'zhangsan@hkmu.edu.hk', isVerified: true });
const seller2 = await User.create({ username: 'lisi', password: User.hashPassword('password123'), email: 'lisi@hkmu.edu.hk', isVerified: true });
const seller3 = await User.create({ username: 'wangwu', password: User.hashPassword('password123'), email: 'wangwu@hkmu.edu.hk', isVerified: true });

// ========== Admin 帳號（username: admin，密碼:123123，role:admin） ==========
const adminUser = await User.create({
  username: 'admin',
  password: User.hashPassword('123123'),
  email: 'admin@hkmu.edu.hk',
  isVerified: true,
  role: 'admin'
});

console.log("📦 Creating 12 test items...");
await Item.create([
        {
title: "COMP 3810 Textbook (Database System Concepts)",
description: "Bought last semester, only read the first few pages, basically brand new. No highlighting or notes.",
price: 150,
category: "Books",
condition: "Like New",
imageUrl: "https://images.unsplash.com/photo-1544947950-fa07a98d237f?q=80&w=800",
seller: seller1._id,
status: "Available"
        },
        {
title: "Used Textbook Bundle (Calculus & Linear Algebra)",
description: "Two textbooks for first-year engineering math. Some wear on the cover, but all pages are intact. Great deal.",
price: 120,
category: "Books",
condition: "Good",
imageUrl: "https://images.unsplash.com/photo-1532012197267-da84d127e765?q=80&w=800",
seller: seller2._id,
status: "Available"
        },
        {
title: "Postgraduate Entrance Exam English Papers (2010-2023)",
description: "Full set of past papers. Some pages have handwritten notes in pencil, easily erasable. Free vocabulary book included.",
price: 40,
category: "Books",
condition: "Very Good",
imageUrl: "https://images.unsplash.com/photo-1517842645767-c639042777db?q=80&w=800",
seller: seller1._id,
status: "Available"
        },
        {
title: "Postgraduate Math Review Book (Full Set)",
description: "Complete set of review books for the math exam. Used for one semester. Minimal notes, mostly clean.",
price: 80,
category: "Books",
condition: "Very Good",
imageUrl: "https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?q=80&w=800",
seller: seller3._id,
status: "Available"
        },
        {
title: "Logitech G304 Wireless Mouse",
description: "Used for gaming, great condition, includes original receiver. Selling due to upgrade.",
price: 99,
category: "Electronics",
condition: "Very Good",
imageUrl: "https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?q=80&w=800",
seller: seller2._id,
status: "Available"
        },
        {
title: "Dell 24-inch Monitor (Second-hand)",
description: "1080p IPS screen. No scratches or dead pixels. Perfect for dorm study setup. Comes with power cable.",
price: 450,
category: "Electronics",
condition: "Good",
imageUrl: "https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?q=80&w=800",
seller: seller1._id,
status: "Available"
        },
        {
title: "Dorm Desk Lamp (with USB Port)",
description: "Graduation clearance. Three brightness levels, perfect for late-night study. USB port still works perfectly.",
price: 25,
category: "Daily Necessities",
condition: "Good",
imageUrl: "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?q=80&w=800",
seller: seller1._id,
status: "Available"
        },
        {
title: "Mini Electric Fan (USB Powered)",
description: "Quiet and powerful. Great for dorm desks in summer. Slight dust on the blades, easy to clean.",
price: 15,
category: "Daily Necessities",
condition: "Good",
imageUrl: "https://images.unsplash.com/photo-1618944847023-38aa001235f0?q=80&w=800",
seller: seller3._id,
status: "Available"
        },
        {
title: "Giant Mountain Bike",
description: "Great for commuting. Ridden for one year, brakes work perfectly. Includes lock and pump.",
price: 350,
category: "Transportation",
condition: "Very Good",
imageUrl: "https://images.unsplash.com/photo-1485965120184-e220f721d03e?q=80&w=800",
seller: seller2._id,
status: "Sold"
        },
        {
title: "Folding Bike (Lightweight)",
description: "Easy to carry into the dorm. Folds in 10 seconds. Some rust on the chain but rides smoothly.",
price: 180,
category: "Transportation",
condition: "Fair",
imageUrl: "https://images.unsplash.com/photo-1571068316344-75bc76f77890?q=80&w=800",
seller: seller1._id,
status: "Available"
        },
        {
title: "IKEA Desk (Second-hand)",
description: "Sturdy white desk. Some scratches on the surface. Must pick up from dorm. Great for study.",
price: 60,
category: "Furniture",
condition: "Good",
imageUrl: "https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?q=80&w=800",
seller: seller2._id,
status: "Available"
        },
        {
title: "Mini Bookshelf (3-Tier)",
description: "Compact bookshelf, fits perfectly next to a dorm desk. Easy to assemble and disassemble.",
price: 35,
category: "Furniture",
condition: "Very Good",
imageUrl: "https://images.unsplash.com/photo-1594620302200-9a762244a156?q=80&w=800",
seller: seller3._id,
status: "Available"
        }
    ]);

    console.log("✅ Data seeding completed successfully with 12 items!");
    mongoose.disconnect();
}).catch(err => {
    console.error("❌ Seeding failed:", err.message);
    process.exit(1);
});
