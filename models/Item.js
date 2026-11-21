const mongoose = require('mongoose');

const itemSchema = new mongoose.Schema({
    title: { type: String, required: true },       // Item name
    description: { type: String, required: true }, // Item description
    price: { type: Number, required: true },       // Price
    category: { type: String, required: true },    // Category (e.g., Books, Electronics)
    condition: { type: String },                   // Condition (e.g., Like New)
    seller: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Reference to User
    status: { type: String, default: 'Available' } // Status: Available or Sold
}, { timestamps: true });

// Static method to handle multi-condition search (Required by PDF)
itemSchema.statics.searchItems = async function(queryParams) {
    let filter = {};
    // 1. Search by title (case-insensitive regex)
    if (queryParams.title) {
        filter.title = { $regex: queryParams.title, $options: 'i' }; 
    }
    // 2. Search by category
    if (queryParams.category) {
        filter.category = queryParams.category;
    }
    // 3. Search by price range
    if (queryParams.minPrice || queryParams.maxPrice) {
        filter.price = {};
        if (queryParams.minPrice) filter.price.$gte = Number(queryParams.minPrice);
        if (queryParams.maxPrice) filter.price.$lte = Number(queryParams.maxPrice);
    }
    
    // Execute query and populate seller info (exclude password)
    return this.find(filter).populate('seller', 'username email');
};

module.exports = mongoose.model('Item', itemSchema);