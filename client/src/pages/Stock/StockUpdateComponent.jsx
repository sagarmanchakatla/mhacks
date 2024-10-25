import React, { useState } from "react";
import { toast } from "react-toastify";

const StockUpdateComponent = () => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [operation, setOperation] = useState("reduce");
  const [loading, setLoading] = useState(false);

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file && !file.type.includes("image/")) {
      toast.error("Please upload an image file");
      return;
    }
    // Log file details
    console.log("Selected file:", {
      name: file.name,
      type: file.type,
      size: `${(file.size / 1024).toFixed(2)} KB`,
    });
    setSelectedFile(file);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!selectedFile) {
      toast.warning("Please select a bill to upload");
      return;
    }

    setLoading(true);
    const formData = new FormData();
    formData.append("bill", selectedFile);
    formData.append("operation", operation);

    // Log request details
    console.log("Sending request with:", {
      operation,
      fileName: selectedFile.name,
      fileType: selectedFile.type,
    });

    try {
      const response = await fetch(
        "http://localhost:8000/api/bill/process-bill",
        {
          method: "POST",
          body: formData,
        }
      );

      // Log raw response
      const responseText = await response.text();
      console.log("Raw response:", responseText);

      // Parse response only if it's JSON
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        console.error("Failed to parse response as JSON:", e);
        throw new Error("Invalid response format from server");
      }

      if (!response.ok) {
        console.error("Server error details:", data);
        throw new Error(data.error || "Failed to process bill");
      }

      // Show success notifications
      if (data.updates && data.updates.length > 0) {
        data.updates.forEach((update) => {
          toast.success(
            `${update.name}: ${update.oldQuantity} → ${update.newQuantity}`
          );
        });
      } else {
        toast.info("No products were updated from this bill");
      }

      // Show alerts
      if (data.alerts && data.alerts.length > 0) {
        data.alerts.forEach((alert) => {
          toast.warning(alert);
        });
      }

      setSelectedFile(null);
      // Reset the file input
      const fileInput = document.querySelector('input[type="file"]');
      if (fileInput) fileInput.value = "";
    } catch (error) {
      console.error("Error details:", error);
      toast.error(error.message || "Failed to process bill");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-4">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-2xl font-bold mb-4">Stock Update via Bill</h2>

          <div className="mb-6">
            <label className="block text-gray-700 text-sm font-bold mb-2">
              Operation Type
            </label>
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="radio"
                  value="reduce"
                  checked={operation === "reduce"}
                  onChange={(e) => setOperation(e.target.value)}
                  className="form-radio h-4 w-4 text-blue-600"
                />
                <span className="ml-2">Reduce Stock (Sales Bill)</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  value="add"
                  checked={operation === "add"}
                  onChange={(e) => setOperation(e.target.value)}
                  className="form-radio h-4 w-4 text-blue-600"
                />
                <span className="ml-2">Add Stock (Purchase Bill)</span>
              </label>
            </div>
          </div>

          <div className="mb-6">
            <label className="block text-gray-700 text-sm font-bold mb-2">
              Upload Bill Image
            </label>
            <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
              <div className="space-y-1 text-center">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                  id="file-upload"
                />
                <label
                  htmlFor="file-upload"
                  className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500"
                >
                  <div className="text-gray-600">
                    {selectedFile
                      ? `Selected: ${selectedFile.name} (${(
                          selectedFile.size / 1024
                        ).toFixed(2)} KB)`
                      : "Click to select or drag and drop bill"}
                  </div>
                </label>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !selectedFile}
            className={`w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white 
              ${
                loading || !selectedFile
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-blue-600 hover:bg-blue-700"
              }`}
          >
            {loading ? "Processing..." : "Process Bill"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default StockUpdateComponent;
