require("dotenv").config();
const mongoose = require("mongoose");
const Stock = require("./model/inventory"); // Adjust path as needed

// Categories for random selection
const categories = [
  "Electronics",
  "Groceries",
  "Clothing",
  "Books",
  "Home & Kitchen",
  "Sports",
  "Beauty",
  "Toys",
  "Stationery",
  "Hardware",
];

// Product name templates for each category
const productTemplates = {
  Electronics: [
    "Samsung Phone",
    "Apple Laptop",
    "Sony Headphones",
    "HP Printer",
    "Dell Monitor",
    "Wireless Mouse",
    "USB Cable",
    "Power Bank",
    "Smart Watch",
    "Bluetooth Speaker",
  ],
  Groceries: [
    "Rice Bag",
    "Wheat Flour",
    "Cooking Oil",
    "Sugar Pack",
    "Tea Bags",
    "Coffee Powder",
    "Pasta Pack",
    "Milk Carton",
    "Cereal Box",
    "Spice Mix",
  ],
  Clothing: [
    "Cotton T-Shirt",
    "Denim Jeans",
    "Formal Shirt",
    "Winter Jacket",
    "Sports Shorts",
    "Casual Dress",
    "Wool Sweater",
    "Running Shoes",
    "Leather Belt",
    "Cotton Socks",
  ],
  Books: [
    "Fiction Novel",
    "Science Textbook",
    "History Book",
    "Comics Collection",
    "Cookbook",
    "Biography",
    "Self-Help Book",
    "Children Book",
    "Dictionary",
    "Magazine",
  ],
  "Home & Kitchen": [
    "Coffee Maker",
    "Dinner Plate",
    "Kitchen Knife",
    "Bath Towel",
    "Bed Sheet",
    "Pillow Case",
    "Storage Box",
    "Wall Clock",
    "Table Lamp",
    "Curtain Set",
  ],
  Sports: [
    "Tennis Racket",
    "Football",
    "Yoga Mat",
    "Gym Gloves",
    "Cricket Bat",
    "Basketball",
    "Swimming Goggles",
    "Skating Shoes",
    "Boxing Gloves",
    "Sport Bottle",
  ],
  Beauty: [
    "Face Cream",
    "Shampoo Bottle",
    "Lipstick",
    "Hair Oil",
    "Face Wash",
    "Body Lotion",
    "Perfume",
    "Nail Polish",
    "Hair Brush",
    "Sunscreen",
  ],
  Toys: [
    "Lego Set",
    "Puzzle Box",
    "Toy Car",
    "Doll Set",
    "Board Game",
    "Action Figure",
    "Building Blocks",
    "Remote Car",
    "Stuffed Animal",
    "Art Kit",
  ],
  Stationery: [
    "Notebook",
    "Pen Set",
    "Pencil Box",
    "Marker Pack",
    "Stapler",
    "Tape Roll",
    "File Folder",
    "Paper Clips",
    "Sticky Notes",
    "Calculator",
  ],
  Hardware: [
    "Screwdriver",
    "Hammer",
    "Paint Brush",
    "Measuring Tape",
    "Drill Machine",
    "Wrench Set",
    "Pliers",
    "Tool Box",
    "Nails Pack",
    "Safety Gloves",
  ],
};

// Function to generate random stock data
const generateStockData = (numProducts) => {
  const stocks = [];

  for (let i = 0; i < numProducts; i++) {
    // Select random category
    const category = categories[Math.floor(Math.random() * categories.length)];

    // Select random product from category
    const productName =
      productTemplates[category][
        Math.floor(Math.random() * productTemplates[category].length)
      ];

    // Generate random product ID
    const productId = `PRD${String(i + 1).padStart(4, "0")}`;

    // Generate random price between 10 and 1000
    const price = Math.floor(Math.random() * 991) + 10;

    // Generate random quantity between 5 and 100
    const quantity = Math.floor(Math.random() * 96) + 5;

    // Generate random minimum stock between 5 and 20
    const minimumStock = Math.floor(Math.random() * 16) + 5;

    stocks.push({
      productId,
      name: productName,
      quantity,
      price,
      category,
      minimumStock,
      lastUpdated: new Date(),
    });
  }

  return stocks;
};

// Function to seed the database
const seedDatabase = async (numProducts = 50) => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB");

    // Clear existing data
    await Stock.deleteMany({});
    console.log("Cleared existing stock data");

    // Generate and insert new data
    const stockData = generateStockData(numProducts);
    await Stock.insertMany(stockData);

    console.log(`Successfully seeded database with ${numProducts} products`);

    // Log some sample data
    const sampleData = await Stock.find().limit(5);
    console.log("\nSample data:");
    console.log(sampleData);

    // Close connection
    await mongoose.connection.close();
  } catch (error) {
    console.error("Error seeding database:", error);
    process.exit(1);
  }
};

// Run the seeding function
seedDatabase()
  .then(() => {
    console.log("Database seeding completed");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Failed to seed database:", error);
    process.exit(1);
  });
