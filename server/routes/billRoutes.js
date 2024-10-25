const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const {
  processStockUpdate,
  processInvoice,
} = require("../controllers/billController");

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    cb(null, `bill-${Date.now()}${path.extname(file.originalname)}`);
  },
});

const upload = multer({ storage });

router.post("/process-bill", upload.single("bill"), processStockUpdate);
router.post("/process-invoice", upload.single("invoice"), processInvoice);

module.exports = router;
