// server/index.js
require("dotenv").config();
const express = require("express");
const app = express();
const cors = require("cors");
const mongoose = require("mongoose");
const path = require("path");
const fs = require("fs");
const Stock = require("./model/inventory");

const PORT = process.env.PORT || 8000;

app.use(cors());
app.use(express.json());

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const billRoutes = require("./routes/billRoutes");
const uploadRoutes = require("./routes/uploadCSV");

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.log(err));

app.use("/api/bill", billRoutes);
app.use("/api/inventory", uploadRoutes);

app.use("/", async (req, res) => {
  try {
    const allStocks = await Stock.find({});
    res.status(200).json(allStocks);
  } catch (error) {
    res.status(500).json({ error: "Error fetching stock data." });
  }
});

app.listen(PORT, () =>
  console.log(`Server running on http://localhost:${PORT}`)
);
