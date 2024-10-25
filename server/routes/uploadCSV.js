const express = require("express");
const multer = require("multer");
const path = require("path");
const XLSX = require("xlsx");
const Stock = require("../model/inventory");
const router = express.Router();

// Configure multer for file upload
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/");
  },
  filename: function (req, file, cb) {
    cb(null, "inventory-" + Date.now() + path.extname(file.originalname));
  },
});

const fileFilter = (req, file, cb) => {
  if (
    file.mimetype ===
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
    file.mimetype === "application/vnd.ms-excel" ||
    file.mimetype === "text/csv"
  ) {
    cb(null, true);
  } else {
    cb(
      new Error("Please upload an Excel or CSV file (.xlsx, .xls, or .csv)"),
      false
    );
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
});

router.post("/upload-excel", upload.single("file"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded." });
  }

  try {
    // Read the file
    const workbook = XLSX.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);

    // Process and validate the data according to new schema
    const formattedData = data.map((item) => ({
      productId: item["Product ID"] || item.productId,
      name: item["Product Name"] || item.name,
      quantity: parseInt(item.Quantity || item.quantity) || 0,
      price: parseFloat(item.Price || item.price) || 0,
      category: item.Category || item.category,
      lastUpdated: new Date(),
    }));

    // Validate required fields based on new schema
    const invalidRows = formattedData.filter(
      (item) =>
        !item.productId ||
        !item.name ||
        !item.category ||
        typeof item.quantity !== "number" ||
        typeof item.price !== "number"
    );

    if (invalidRows.length > 0) {
      return res.status(400).json({
        error: "Invalid data in file",
        details: `${invalidRows.length} rows are missing required fields or have invalid data types`,
      });
    }

    // Insert or update data
    for (const item of formattedData) {
      await Stock.updateOne(
        { productId: item.productId },
        { $set: item },
        { upsert: true }
      );
    }

    // Delete the temporary file
    require("fs").unlinkSync(req.file.path);

    res.json({
      success: true,
      message: `Successfully processed ${formattedData.length} items.`,
    });
  } catch (error) {
    console.error("Error processing file:", error);
    // Delete the temporary file in case of error
    if (req.file) {
      require("fs").unlinkSync(req.file.path);
    }
    res.status(500).json({
      error: "Failed to process file",
      details: error.message,
    });
  }
});

module.exports = router;
