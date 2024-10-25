import { useState } from "react";

const BillProcessor = () => {
  const [file, setFile] = useState(null);
  const [customerId, setCustomerId] = useState("");
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file || !customerId) {
      setError("Please provide both a bill file and customer ID");
      return;
    }

    setProcessing(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("customerId", customerId);

    try {
      const response = await fetch("http://localhost:8000/api/bill/process", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      const data = await response.json();
      setResult(data);
    } catch (err) {
      setError(err.message || "Error processing bill");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="border rounded-lg shadow-lg p-4">
        <h2 className="text-lg font-semibold mb-4">Bill Processing System</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              Customer ID:
            </label>
            <input
              type="text"
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              className="border rounded w-full p-2"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Upload Bill:
            </label>
            <input
              type="file"
              onChange={handleFileChange}
              accept="image/*"
              className="border rounded w-full p-2"
              required
            />
          </div>

          <button
            type="submit"
            disabled={processing}
            className="bg-blue-500 text-white w-full p-2 rounded hover:bg-blue-600 disabled:opacity-50"
          >
            {processing ? "Processing..." : "Process Bill"}
          </button>
        </form>

        {error && (
          <div className="bg-red-100 text-red-700 p-4 rounded mt-4">
            <strong>Error:</strong> {error}
          </div>
        )}

        {result && (
          <div className="border rounded-lg shadow-lg p-4 mt-4">
            <h3 className="text-lg font-semibold mb-2">
              Processed Bill Details
            </h3>
            <p>Bill Number: {result.billDetails.billNumber}</p>
            <p>Total Amount: ${result.billDetails.totalAmount}</p>

            <div>
              <h4 className="font-medium mb-2">Items:</h4>
              <ul className="space-y-2">
                {result.billDetails.items.map((item, index) => (
                  <li key={index} className="flex justify-between">
                    <span>{item.name}</span>
                    <span>
                      {item.quantity} x ${item.price} = ${item.total}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BillProcessor;
