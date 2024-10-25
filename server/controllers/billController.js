const Tesseract = require("tesseract.js");
const Stock = require("../model/inventory");
const fs = require("fs").promises;
const path = require("path");

const processStockUpdate = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded." });
    }

    // Validate operation type
    if (!["reduce", "add"].includes(req.body.operation)) {
      return res.status(400).json({ error: "Invalid operation type." });
    }

    const filePath = path.resolve(req.file.path);

    // Verify file exists
    try {
      await fs.access(filePath);
    } catch (error) {
      return res.status(400).json({ error: "Upload file not found." });
    }

    // Perform OCR on uploaded bill
    const {
      data: { text },
    } = await Tesseract.recognize(filePath, "eng", {
      logger: (m) => console.log(m),
    });

    // Clean up the uploaded file after processing
    await fs.unlink(filePath).catch(console.error);

    if (!text.trim()) {
      return res
        .status(400)
        .json({ error: "Could not extract text from image." });
    }

    // Parse OCR text to extract product information
    const lines = text.split("\n").filter((line) => line.trim());
    const updates = [];
    const alerts = [];

    // Process each line from the bill
    for (const line of lines) {
      // Improved regex to better match product names and quantities
      const match = line.match(/([a-zA-Z\s]+)([0-9]+)/);
      if (match) {
        const productName = match[1].trim();
        const quantity = parseInt(match[2], 10);

        if (productName && !isNaN(quantity)) {
          try {
            const product = await Stock.findOne({
              name: { $regex: new RegExp(productName, "i") },
            });

            if (product) {
              const oldQuantity = product.quantity;

              // Update quantity based on operation type
              if (req.body.operation === "reduce") {
                if (quantity > product.quantity) {
                  alerts.push(
                    `Warning: Insufficient stock for ${product.name}. Current stock: ${product.quantity}`
                  );
                  continue;
                }
                product.quantity = Math.max(0, product.quantity - quantity);
              } else {
                product.quantity += quantity;
              }

              product.lastUpdated = new Date();
              await product.save();

              updates.push({
                name: product.name,
                oldQuantity,
                newQuantity: product.quantity,
                change: req.body.operation === "reduce" ? -quantity : quantity,
              });

              // Check for low stock alert
              if (product.quantity <= product.minimumStock) {
                alerts.push(
                  `Low stock alert: ${product.name} (${product.quantity} remaining)`
                );
              }
            }
          } catch (err) {
            console.error(`Error processing product ${productName}:`, err);
            continue;
          }
        }
      }
    }

    if (updates.length === 0) {
      return res.status(400).json({
        error: "No valid products found in the bill.",
        text: text, // Return OCR text for debugging
      });
    }

    res.json({
      success: true,
      updates,
      alerts,
    });
  } catch (error) {
    console.error("Error processing stock update:", error);
    res.status(500).json({
      error: "Failed to process stock update",
      details: error.message,
    });
  }
};

// Function to extract price from text
const extractPrice = (text) => {
  const priceMatch = text.match(/\$?\s*(\d+(\.\d{2})?)/);
  return priceMatch ? parseFloat(priceMatch[1]) : null;
};

// Function to extract category based on predefined mappings
const extractCategory = (productName) => {
  const categoryMappings = {
    rice: "Grains",
    sugar: "Baking",
    milk: "Dairy",
    bread: "Bakery",
    coffee: "Beverages",
    tea: "Beverages",
    flour: "Baking",
    oil: "Cooking",
    spice: "Spices",
    vegetable: "Produce",
    fruit: "Produce",
    meat: "Meat",
    fish: "Seafood",
    chicken: "Poultry",
    soap: "Cleaning",
    detergent: "Cleaning",
  };

  const productLower = productName.toLowerCase();
  for (const [keyword, category] of Object.entries(categoryMappings)) {
    if (productLower.includes(keyword)) {
      return category;
    }
  }
  return "Other";
};

// const processInvoice = async (req, res) => {
//   try {
//     if (!req.file) {
//       return res.status(400).json({ error: "No file uploaded." });
//     }

//     const filePath = path.resolve(req.file.path);

//     try {
//       await fs.access(filePath);
//     } catch (error) {
//       return res.status(400).json({ error: "Upload file not found." });
//     }

//     // Perform OCR on uploaded invoice
//     const {
//       data: { text },
//     } = await Tesseract.recognize(filePath, "eng", {
//       logger: (m) => console.log(m),
//     });

//     // Clean up the uploaded file after processing
//     await fs.unlink(filePath).catch(console.error);

//     if (!text.trim()) {
//       return res
//         .status(400)
//         .json({ error: "Could not extract text from image." });
//     }

//     const lines = text.split("\n").filter((line) => line.trim());
//     const newItems = [];
//     const updates = [];
//     const errors = [];

//     for (const line of lines) {
//       // Enhanced regex to capture product name, quantity, and price
//       const match = line.match(
//         /([a-zA-Z\s]+)([0-9]+).*?(\$?\s*\d+(\.\d{2})?)?/
//       );

//       if (match) {
//         const productName = match[1].trim();
//         const quantity = parseInt(match[2], 10);
//         const price = extractPrice(match[3] || "");

//         if (productName && !isNaN(quantity)) {
//           try {
//             // Check if product exists
//             let product = await Stock.findOne({
//               name: { $regex: new RegExp("^" + productName + "$", "i") },
//             });

//             if (product) {
//               // Update existing product
//               const oldQuantity = product.quantity;
//               product.quantity += quantity;
//               if (price) product.price = price;
//               product.lastUpdated = new Date();
//               await product.save();

//               updates.push({
//                 name: product.name,
//                 oldQuantity,
//                 newQuantity: product.quantity,
//                 price: product.price,
//               });
//             } else {
//               // Create new product
//               const category = extractCategory(productName);
//               const newProduct = new Stock({
//                 name: productName,
//                 quantity: quantity,
//                 price: price || 0,
//                 category: category,
//                 minimumStock: Math.ceil(quantity * 0.2), // Set minimum stock to 20% of initial quantity
//               });

//               await newProduct.save();
//               newItems.push({
//                 name: productName,
//                 quantity: quantity,
//                 price: price || 0,
//                 category: category,
//               });
//             }
//           } catch (err) {
//             console.error(`Error processing product ${productName}:`, err);
//             errors.push(`Failed to process ${productName}: ${err.message}`);
//           }
//         }
//       }
//     }

//     if (updates.length === 0 && newItems.length === 0) {
//       return res.status(400).json({
//         error: "No valid products found in the invoice.",
//         text: text, // Return OCR text for debugging
//       });
//     }

//     res.json({
//       success: true,
//       updates,
//       newItems,
//       errors: errors.length > 0 ? errors : undefined,
//     });
//   } catch (error) {
//     console.error("Error processing invoice:", error);
//     res.status(500).json({
//       error: "Failed to process invoice",
//       details: error.message,
//     });
//   }
// };

const processInvoice = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded." });
    }

    const filePath = path.resolve(req.file.path);
    // Verify file exists
    try {
      await fs.access(filePath);
    } catch (error) {
      return res.status(400).json({ error: "Upload file not found." });
    }

    // Perform OCR on uploaded invoice
    const {
      data: { text },
    } = await Tesseract.recognize(filePath, "eng", {
      logger: (m) => console.log(m),
    });

    console.log(data);
    // Clean up the uploaded file after processing
    await fs.unlink(filePath).catch(console.error);

    if (!text.trim()) {
      return res
        .status(400)
        .json({ error: "Could not extract text from image." });
    }

    const lines = text.split("\n").filter((line) => line.trim());
    const newItems = [];
    const updates = [];
    const errors = [];

    // Generate a unique product ID
    const generateProductId = async (name) => {
      const baseId =
        name.substring(0, 3).toUpperCase() + Date.now().toString().slice(-6);
      const existing = await Stock.findOne({ productId: baseId });
      return existing ? baseId + Math.floor(Math.random() * 100) : baseId;
    };

    // Process each line from the invoice
    for (const line of lines) {
      // Enhanced regex to capture product name, quantity, and price
      const match = line.match(/([a-zA-Z\s]+)([0-9]+).*?(\$?\s*\d+(\.\d{2})?)/);

      if (match) {
        const productName = match[1].trim();
        const quantity = parseInt(match[2], 10);
        const price = extractPrice(match[3] || "");

        if (!productName || isNaN(quantity)) {
          errors.push(`Invalid data format in line: ${line}`);
          continue;
        }

        try {
          // Check if product exists (case-insensitive exact match)
          let product = await Stock.findOne({
            name: { $regex: new RegExp(`^${productName}$`, "i") },
          });

          if (product) {
            // Update existing product
            const oldQuantity = product.quantity;
            product.quantity += quantity;
            if (price) product.price = price;
            product.lastUpdated = new Date();
            console.log(product);
            await product.save();

            updates.push({
              productId: product.productId,
              name: product.name,
              oldQuantity,
              newQuantity: product.quantity,
              price: product.price,
            });
          } else {
            // Create new product
            const productId = await generateProductId(productName);
            const category = extractCategory(productName);

            const newProduct = new Stock({
              productId,
              name: productName,
              quantity: quantity,
              xprice: price || 0,
              category: category,
              minimumStock: Math.ceil(quantity * 0.2), // Set minimum stock to 20% of initial quantity
              lastUpdated: new Date(),
            });

            console.log(newProduct);

            await newProduct.save();
            newItems.push({
              productId,
              name: productName,
              quantity: quantity,
              price: price || 0,
              category: category,
            });
          }
        } catch (err) {
          console.error(`Error processing product ${productName}:`, err);
          errors.push(`Failed to process ${productName}: ${err.message}`);
        }
      } else {
        errors.push(`Could not parse line: ${line.trim()}`);
      }
    }

    if (updates.length === 0 && newItems.length === 0) {
      return res.status(400).json({
        error: "No valid products found in the invoice.",
        text: text, // Return OCR text for debugging
      });
    }

    res.json({
      success: true,
      updates,
      newItems,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error("Error processing invoice:", error);
    res.status(500).json({
      error: "Failed to process invoice",
      details: error.message,
    });
  }
};

// // Function to generate a unique product ID
// const generateProductId = async (name) => {
//   // Create a base product ID from the name (first 3 letters + timestamp)
//   const baseId =
//     name.substring(0, 3).toUpperCase() + Date.now().toString().slice(-6);

//   // Check if this ID already exists
//   const existing = await Stock.findOne({ productId: baseId });
//   if (!existing) {
//     return baseId;
//   }

//   // If exists, add a random number
//   return baseId + Math.floor(Math.random() * 100);
// };

// // Function to extract price from text
// const extractPrice = (text) => {
//   const priceMatch = text.match(/\$?\s*(\d+(\.\d{2})?)/);
//   return priceMatch ? parseFloat(priceMatch[1]) : null;
// };

// // Function to extract category based on predefined mappings
// const extractCategory = (productName) => {
//   const categoryMappings = {
//     rice: "Grains",
//     sugar: "Baking",
//     milk: "Dairy",
//     bread: "Bakery",
//     coffee: "Beverages",
//     tea: "Beverages",
//     flour: "Baking",
//     oil: "Cooking",
//     spice: "Spices",
//     vegetable: "Produce",
//     fruit: "Produce",
//     meat: "Meat",
//     fish: "Seafood",
//     chicken: "Poultry",
//     soap: "Cleaning",
//     detergent: "Cleaning",
//   };

//   const productLower = productName.toLowerCase();
//   for (const [keyword, category] of Object.entries(categoryMappings)) {
//     if (productLower.includes(keyword)) {
//       return category;
//     }
//   }
//   return "Other";
// };

// const processInvoice = async (req, res) => {
//   try {
//     if (!req.file) {
//       return res.status(400).json({ error: "No file uploaded." });
//     }

//     const filePath = path.resolve(req.file.path);

//     try {
//       await fs.access(filePath);
//     } catch (error) {
//       return res.status(400).json({ error: "Upload file not found." });
//     }

//     // Perform OCR on uploaded invoice
//     const {
//       data: { text },
//     } = await Tesseract.recognize(filePath, "eng", {
//       logger: (m) => console.log(m),
//     });

//     // Clean up the uploaded file after processing
//     await fs.unlink(filePath).catch(console.error);

//     if (!text.trim()) {
//       return res
//         .status(400)
//         .json({ error: "Could not extract text from image." });
//     }

//     const lines = text.split("\n").filter((line) => line.trim());
//     const newItems = [];
//     const updates = [];
//     const errors = [];

//     for (const line of lines) {
//       // Enhanced regex to capture product details: ID (optional), name, quantity, and price
//       const match = line.match(
//         /(?:([A-Z0-9]+)\s+)?([a-zA-Z\s]+)([0-9]+).*?(\$?\s*\d+(\.\d{2})?)?/
//       );

//       if (match) {
//         const existingId = match[1]?.trim();
//         const productName = match[2].trim();
//         const quantity = parseInt(match[3], 10);
//         const price = extractPrice(match[4] || "");

//         if (!productName || isNaN(quantity) || !price) {
//           errors.push(`Invalid data for line: ${line.trim()}`);
//           continue;
//         }

//         try {
//           // Try to find product by ID first, then by name
//           let product = existingId
//             ? await Stock.findOne({ productId: existingId })
//             : await Stock.findOne({
//                 name: { $regex: new RegExp("^" + productName + "$", "i") },
//               });

//           if (product) {
//             // Update existing product
//             const oldQuantity = product.quantity;
//             product.quantity += quantity;
//             product.price = price;
//             product.lastUpdated = new Date();
//             await product.save();

//             updates.push({
//               productId: product.productId,
//               name: product.name,
//               oldQuantity,
//               newQuantity: product.quantity,
//               price: product.price,
//             });
//           } else {
//             // Create new product
//             const productId = await generateProductId(productName);
//             const category = extractCategory(productName);

//             const newProduct = new Stock({
//               productId,
//               name: productName,
//               quantity: quantity,
//               price: price,
//               category: category,
//               minimumStock: Math.ceil(quantity * 0.2), // Set minimum stock to 20% of initial quantity
//               lastUpdated: new Date(),
//             });

//             await newProduct.save();
//             newItems.push({
//               productId,
//               name: productName,
//               quantity: quantity,
//               price: price,
//               category: category,
//             });
//           }
//         } catch (err) {
//           console.error(`Error processing product ${productName}:`, err);
//           errors.push(`Failed to process ${productName}: ${err.message}`);
//         }
//       } else {
//         errors.push(`Could not parse line: ${line.trim()}`);
//       }
//     }

//     if (updates.length === 0 && newItems.length === 0) {
//       return res.status(400).json({
//         error: "No valid products found in the invoice.",
//         text: text, // Return OCR text for debugging
//       });
//     }

//     res.json({
//       success: true,
//       updates,
//       newItems,
//       errors: errors.length > 0 ? errors : undefined,
//     });
//   } catch (error) {
//     console.error("Error processing invoice:", error);
//     res.status(500).json({
//       error: "Failed to process invoice",
//       details: error.message,
//     });
//   }
// };

module.exports = {
  processStockUpdate,
  processInvoice,
};

// const Tesseract = require("tesseract.js");
// const Stock = require("../model/inventory");
// const fs = require("fs").promises;
// const path = require("path");

// const processStockUpdate = async (req, res) => {
//   try {
//     if (!req.file) {
//       return res.status(400).json({ error: "No file uploaded." });
//     }

//     if (!["reduce", "add"].includes(req.body.operation)) {
//       return res.status(400).json({ error: "Invalid operation type." });
//     }

//     const filePath = path.resolve(req.file.path);
//     try {
//       await fs.access(filePath);
//     } catch (error) {
//       return res.status(400).json({ error: "Upload file not found." });
//     }

//     const {
//       data: { text },
//     } = await Tesseract.recognize(filePath, "eng", {
//       logger: (m) => null,
//     });

//     await fs.unlink(filePath);

//     if (!text.trim()) {
//       return res
//         .status(400)
//         .json({ error: "Could not extract text from image." });
//     }

//     const lines = text.split("\n").filter((line) => line.trim());
//     const updates = [];
//     const alerts = [];

//     for (const line of lines) {
//       const match = line.match(/([a-zA-Z\s]+)([0-9]+)/);
//       if (match) {
//         const productName = match[1].trim();
//         const quantity = parseInt(match[2], 10);

//         if (productName && !isNaN(quantity)) {
//           try {
//             const product = await Stock.findOne({
//               name: { $regex: new RegExp(productName, "i") },
//             });

//             if (product) {
//               const oldQuantity = product.quantity;
//               if (req.body.operation === "reduce") {
//                 if (quantity > product.quantity) {
//                   alerts.push(
//                     `Warning: Insufficient stock for ${product.name}. Current stock: ${product.quantity}`
//                   );
//                   continue;
//                 }
//                 product.quantity = Math.max(0, product.quantity - quantity);
//               } else {
//                 product.quantity += quantity;
//               }

//               product.lastUpdated = new Date();
//               await product.save();

//               updates.push({
//                 name: product.name,
//                 oldQuantity,
//                 newQuantity: product.quantity,
//                 change: req.body.operation === "reduce" ? -quantity : quantity,
//               });

//               if (product.quantity <= product.minimumStock) {
//                 alerts.push(
//                   `Low stock alert: ${product.name} (${product.quantity} remaining)`
//                 );
//               }
//             }
//           } catch (err) {
//             continue;
//           }
//         }
//       }
//     }

//     if (updates.length === 0) {
//       return res.status(400).json({
//         error: "No valid products found in the bill.",
//         text: text,
//       });
//     }

//     res.json({ success: true, updates, alerts });
//   } catch (error) {
//     res.status(500).json({
//       error: "Failed to process stock update",
//       details: error.message,
//     });
//   }
// };

// const processInvoice = async (req, res) => {
//   try {
//     if (!req.file) {
//       return res.status(400).json({ error: "No file uploaded." });
//     }

//     const filePath = path.resolve(req.file.path);
//     try {
//       await fs.access(filePath);
//     } catch (error) {
//       return res.status(400).json({ error: "Upload file not found." });
//     }

//     const {
//       data: { text },
//     } = await Tesseract.recognize(filePath, "eng", {
//       logger: (m) => null,
//     });

//     await fs.unlink(filePath);

//     if (!text.trim()) {
//       return res
//         .status(400)
//         .json({ error: "Could not extract text from image." });
//     }

//     const lines = text.split("\n").filter((line) => line.trim());
//     const newItems = [];
//     const updates = [];
//     const errors = [];

//     const generateProductId = async (name) => {
//       const baseId =
//         name.substring(0, 3).toUpperCase() + Date.now().toString().slice(-6);
//       const existing = await Stock.findOne({ productId: baseId });
//       return existing ? baseId + Math.floor(Math.random() * 100) : baseId;
//     };

//     // for (const line of lines) {
//     //   const match = line.match(/([a-zA-Z\s]+)([0-9]+).*?(\$?\s*\d+(\.\d{2})?)/);
//     //   if (match) {
//     //     const productName = match[1].trim();
//     //     const quantity = parseInt(match[2], 10);
//     //     const price = extractPrice(match[3] || "");

//     //     if (!productName || isNaN(quantity)) {
//     //       errors.push(`Invalid data format in line: ${line}`);
//     //       continue;
//     //     }

//     //     try {
//     //       let product = await Stock.findOne({
//     //         name: { $regex: new RegExp(`^${productName}$`, "i") },
//     //       });

//     //       if (product) {
//     //         const oldQuantity = product.quantity;
//     //         product.quantity += quantity;
//     //         if (price) product.price = price;
//     //         product.lastUpdated = new Date();
//     //         await product.save();

//     //         updates.push({
//     //           productId: product.productId,
//     //           name: product.name,
//     //           oldQuantity,
//     //           newQuantity: product.quantity,
//     //           price: product.price,
//     //         });
//     //       } else {
//     //         const productId = await generateProductId(productName);
//     //         const category = extractCategory(productName);

//     //         const newProduct = new Stock({
//     //           productId,
//     //           name: productName,
//     //           quantity: quantity,
//     //           price: price || 0,
//     //           category: category,
//     //           minimumStock: Math.ceil(quantity * 0.2),
//     //           lastUpdated: new Date(),
//     //         });

//     //         await newProduct.save();
//     //         newItems.push({
//     //           productId,
//     //           name: productName,
//     //           quantity: quantity,
//     //           price: price || 0,
//     //           category: category,
//     //         });
//     //       }
//     //     } catch (err) {
//     //       errors.push(`Failed to process ${productName}: ${err.message}`);
//     //     }
//     //   } else {
//     //     errors.push(`Could not parse line: ${line.trim()}`);
//     //   }
//     // }
//     // Add logging within loops to catch errors for each item processed
//     for (const line of lines) {
//       const match = line.match(/([a-zA-Z\s]+)([0-9]+).*?(\$?\s*\d+(\.\d{2})?)/);
//       if (match) {
//         const productName = match[1].trim();
//         const quantity = parseInt(match[2], 10);
//         const price = extractPrice(match[3] || "");

//         console.log(
//           `Processing line: ${line}, Parsed as - Name: ${productName}, Quantity: ${quantity}, Price: ${price}`
//         );

//         if (!productName || isNaN(quantity)) {
//           errors.push(`Invalid data format in line: ${line}`);
//           continue;
//         }

//         try {
//           let product = await Stock.findOne({
//             name: { $regex: new RegExp(`^${productName}$`, "i") },
//           });

//           if (product) {
//             const oldQuantity = product.quantity;
//             product.quantity += quantity;
//             if (price) product.price = price;
//             product.lastUpdated = new Date();
//             await product.save();

//             updates.push({
//               productId: product.productId,
//               name: product.name,
//               oldQuantity,
//               newQuantity: product.quantity,
//               price: product.price,
//             });

//             console.log(
//               `Updated product: ${productName}, Old Quantity: ${oldQuantity}, New Quantity: ${product.quantity}`
//             );
//           } else {
//             const productId = await generateProductId(productName);
//             const category = extractCategory(productName);

//             const newProduct = new Stock({
//               productId,
//               name: productName,
//               quantity: quantity,
//               price: price || 0,
//               category: category,
//               minimumStock: Math.ceil(quantity * 0.2),
//               lastUpdated: new Date(),
//             });

//             await newProduct.save();
//             newItems.push({
//               productId,
//               name: productName,
//               quantity: quantity,
//               price: price || 0,
//               category: category,
//             });
//           }
//         } catch (err) {
//           console.error(`Failed to process ${productName}: ${err.message}`);
//           errors.push(`Failed to process ${productName}: ${err.message}`);
//         }
//       } else {
//         errors.push(`Could not parse line: ${line.trim()}`);
//       }
//     }

//     if (updates.length === 0 && newItems.length === 0) {
//       return res.status(400).json({
//         error: "No valid products found in the invoice.",
//         text: text,
//       });
//     }

//     res.json({
//       success: true,
//       updates,
//       newItems,
//       errors: errors.length > 0 ? errors : undefined,
//     });
//   } catch (error) {
//     res.status(500).json({
//       error: "Failed to process invoice",
//       details: error.message,
//     });
//   }
// };

// const extractPrice = (text) => {
//   const priceMatch = text.match(/\$?\s*(\d+(\.\d{2})?)/);
//   return priceMatch ? parseFloat(priceMatch[1]) : null;
// };

// const extractCategory = (productName) => {
//   const categoryMappings = {
//     rice: "Grains",
//     sugar: "Baking",
//     milk: "Dairy",
//     bread: "Bakery",
//     coffee: "Beverages",
//     tea: "Beverages",
//     flour: "Baking",
//     oil: "Cooking",
//     spice: "Spices",
//     vegetable: "Produce",
//     fruit: "Produce",
//     meat: "Meat",
//     fish: "Seafood",
//     chicken: "Poultry",
//     soap: "Cleaning",
//     detergent: "Cleaning",
//   };

//   const productLower = productName.toLowerCase();
//   for (const [keyword, category] of Object.entries(categoryMappings)) {
//     if (productLower.includes(keyword)) {
//       return category;
//     }
//   }
//   return "Other";
// };

// module.exports = {
//   processStockUpdate,
//   processInvoice,
// };
