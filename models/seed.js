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

// 原本这里创建 12 个商品（Item.create）的代码已经被删掉了，数据库现在只有用户，没有商品。

    console.log("✅ Data seeding completed successfully!");
    mongoose.disconnect();
}).catch(err => {
    console.error("❌ Seeding failed:", err.message);
    process.exit(1);
});