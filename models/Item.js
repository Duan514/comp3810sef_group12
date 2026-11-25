const mongoose = require('mongoose');

const itemSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  price: { type: Number, required: true },
  category: { type: String, required: true },
  condition: { type: String },
  seller: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  status: { type: String, default: 'Available' }
}, { timestamps: true });

itemSchema.statics.searchItems = async function(queryParams) {
  let filter = {};
  if (queryParams.title) {
    filter.title = { $regex: queryParams.title, $options: 'i' };
  }
  if (queryParams.category) {
    filter.category = queryParams.category;
  }
  if (queryParams.minPrice || queryParams.maxPrice) {
    filter.price = {};
    if (queryParams.minPrice) filter.price.$gte = Number(queryParams.minPrice);
    if (queryParams.maxPrice) filter.price.$lte = Number(queryParams.maxPrice);
  }
  if (queryParams.seller) {
    filter.seller = queryParams.seller;
  }
  return this.find(filter).populate('seller', '_id username');
};

module.exports = mongoose.model('Item', itemSchema);
