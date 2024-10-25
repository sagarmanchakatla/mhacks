const mongoose = require("mongoose");

const stockSchema = new mongoose.Schema({
  productId: { type: String, required: true },
  name: { type: String, required: true },
  quantity: { type: Number, required: true, default: 0 },
  price: { type: Number, required: true },
  category: { type: String, required: true },
  //   sub_category: { type: String, required: true },
  lastUpdated: { type: Date, default: Date.now },
  //   minimumStock: { type: Number, default: 10 },
});

const Stock = mongoose.model("Stock", stockSchema);
module.exports = Stock;

// const mongoose = require("mongoose");

// const stockSchema = new mongoose.Schema(
//   {
//     productId: {
//       type: String,
//       required: true,
//       unique: true,
//     },
//     productName: {
//       type: String,
//       required: true,
//     },
//     category: {
//       type: String,
//       required: true,
//     },
//     subcategory: {
//       type: String,
//       required: true,
//     },
//     brand: {
//       type: String,
//       required: true,
//     },
//     price: {
//       type: Number,
//       required: true,
//     },
//     stock: {
//       type: Number,
//       required: true,
//       default: 0,
//     },
//     description: {
//       type: String,
//       default: "",
//     },
//     context: {
//       type: String,
//       default: "",
//     },
//     date: {
//       type: Date,
//       default: Date.now,
//     },
//     lastUpdated: {
//       type: Date,
//       default: Date.now,
//     },
//   },
//   {
//     timestamps: true, // This will add createdAt and updatedAt fields automatically
//   }
// );

// // Index for faster queries
// stockSchema.index({ productId: 1, category: 1, subcategory: 1 });

// const Stock = mongoose.model("Stock", stockSchema);

// module.exports = Stock;
