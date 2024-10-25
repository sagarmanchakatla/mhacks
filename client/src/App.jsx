import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import StockUpdateComponent from "./pages/Stock/StockUpdateComponent";
import InvoiceUploadComponent from "./pages/Stock/InvoiceUploadComponent";
import CsvUpload from "./pages/CSVupload/CSVupload";

function App() {
  return (
    <Router>
      <div>
        <ToastContainer position="top-right" />

        <Routes>
          <Route path="/stock-update" element={<StockUpdateComponent />} />
          <Route path="/upload-invoice" element={<InvoiceUploadComponent />} />
          <Route path="/upload-csv" element={<CsvUpload />} />
        </Routes>
      </div>
    </Router>
  );
}
export default App;
