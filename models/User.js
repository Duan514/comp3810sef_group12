// This file defines the Mongoose schema for the User model, which represents a user in the application.

const mongoose = require('mongoose');
const crypto = require('crypto');

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
 
  password: { type: String, required: true },
  email: { type: String, required: true },
  isVerified: { type: Boolean, default: false },
  verificationCode: { type: String },
  verificationCodeExpires: { type: Date },
  resetPasswordToken: { type: String },
  resetPasswordExpires: { type: Date },

  role: { type: String, enum: ['user', 'admin'], default: 'user' }
}, { timestamps: true });


userSchema.statics.hashPassword = function (plain) {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(plain, salt, 64);
  return 'scrypt$' + salt.toString('hex') + '$' + hash.toString('hex');
};

// 校验密码
userSchema.methods.verifyPassword = function (plain) {
  const stored = this.password || '';
  if (!stored.startsWith('scrypt$')) {
    return stored === plain;
  }
  const parts = stored.split('$');
  if (parts.length !== 3) return false;
  const salt = Buffer.from(parts[1], 'hex');
  const expected = Buffer.from(parts[2], 'hex');
  const actual = crypto.scryptSync(plain, salt, expected.length);
  return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
};

module.exports = mongoose.model('User', userSchema);
