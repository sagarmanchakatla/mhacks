import React, { useState } from "react";
import { toast } from "react-toastify";

const InvoiceUploadComponent = () => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file && !file.type.includes("image/")) {
      toast.error("Please upload an image file");
      return;
    }
    setSelectedFile(file);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!selectedFile) {
      toast.warning("Please select an invoice to upload");
      return;
    }

    setLoading(true);
    const formData = new FormData();
    formData.append("invoice", selectedFile);
    formData.append("type", "invoice");

    try {
      const response = await fetch(
        "http://localhost:8000/api/bill/process-invoice",
        {
          method: "POST",
          body: formData,
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to process invoice");
      }

      // Show notifications for updated items
      if (data.updates && data.updates.length > 0) {
        data.updates.forEach((update) => {
          toast.success(
            `Updated: ${update.name} (${update.oldQuantity} → ${update.newQuantity}) Price: $${update.price}`
          );
        });
      }

      // Show notifications for new items
      if (data.newItems && data.newItems.length > 0) {
        data.newItems.forEach((item) => {
          toast.info(
            `New Item Added: ${item.name} (Qty: ${item.quantity}, Price: $${item.price}, Category: ${item.category})`
          );
        });
      }

      // Show any errors
      if (data.errors) {
        data.errors.forEach((error) => {
          toast.warning(error);
        });
      }

      setSelectedFile(null);
      // Reset the file input
      const fileInput = document.querySelector('input[type="file"]');
      if (fileInput) fileInput.value = "";
    } catch (error) {
      console.error("Error details:", error);
      toast.error(error.message || "Failed to process invoice");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-4">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-2xl font-bold mb-4">Add Items via Invoice</h2>

          <div className="mb-6">
            <label className="block text-gray-700 text-sm font-bold mb-2">
              Upload Invoice Image
            </label>
            <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
              <div className="space-y-1 text-center">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                  id="invoice-upload"
                />
                <label
                  htmlFor="invoice-upload"
                  className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500"
                >
                  <div className="text-gray-600">
                    {selectedFile
                      ? selectedFile.name
                      : "Click to select or drag and drop invoice"}
                  </div>
                  <p className="text-xs text-gray-500">
                    PNG, JPG, GIF up to 10MB
                  </p>
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
                  : "bg-green-600 hover:bg-green-700"
              }`}
          >
            {loading ? "Processing..." : "Process Invoice"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default InvoiceUploadComponent;
