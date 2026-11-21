const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true }, // Reminder 3: Don't forget to use bcrypt for encryption when registering
    email: { type: String, required: true }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);