var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import React, { useState } from "react";
import axios from "axios";
export default function NewFeedV2() {
    const [file, setFile] = useState(null);
    const [status, setStatus] = useState("idle");
    const [log, setLog] = useState([]);
    const [output, setOutput] = useState(null);
    const [selectedRow, setSelectedRow] = useState(null);
    const handleUpload = () => __awaiter(this, void 0, void 0, function* () {
        if (!file)
            return;
        setStatus("uploading");
        setLog(["⏳ Uploading..."]);
        const formData = new FormData();
        formData.append("file", file);
        try {
            // ✅ Upload CSV
            const uploadRes = yield axios.post("/api/simple-upload", formData);
            const { id } = uploadRes.data;
            setLog((prev) => [...prev, `✅ Uploaded: ${id}`]);
            // ✅ Process CSV
            setStatus("processing");
            setLog((prev) => [...prev, "🔄 Processing with AI..."]);
            const procRes = yield axios.post(`/api/process/${id}`);
            const result = procRes.data;
            setLog((prev) => [
                ...prev,
                `✅ Processing complete in ${result.summary.processing_time_ms}ms`,
                `🎯 Detected category: ${result.category}`,
                `📊 Results: ${result.summary.green} green, ${result.summary.yellow} yellow, ${result.summary.red} red`
            ]);
            setOutput(result);
            setStatus("done");
        }
        catch (err) {
            console.error(err);
            setLog((prev) => {
                var _a, _b;
                return [
                    ...prev,
                    `❌ ${((_b = (_a = err.response) === null || _a === void 0 ? void 0 : _a.data) === null || _b === void 0 ? void 0 : _b.error) || err.message || "Unknown error"}`
                ];
            });
            setStatus("error");
        }
    });
    const getStatusColor = (status) => {
        switch (status) {
            case "SUCCESS": return "text-green-600";
            case "PARTIAL": return "text-yellow-600";
            case "ERROR": return "text-red-600";
            default: return "text-gray-600";
        }
    };
    const getConfidenceIcon = (confidence) => {
        switch (confidence) {
            case "green": return "🟢";
            case "yellow": return "🟡";
            case "red": return "🔴";
            default: return "⚪";
        }
    };
    // Sidebar navigation items
    const navItems = [
        { name: "Dashboard", icon: "🏠", href: "/dashboard" },
        { name: "New Feed", icon: "🆕", href: "/new-feed" },
        { name: "History", icon: "📜", href: "/history" },
        { name: "Settings", icon: "⚙️", href: "/settings" },
    ];
    return (<div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r flex flex-col justify-between h-full fixed left-0 top-0 z-30">
        <div>
          <div className="flex items-center gap-2 px-6 py-6 border-b">
            <span className="text-2xl">🚀</span>
            <span className="font-bold text-xl tracking-tight">Smart Feed</span>
          </div>
          <nav className="mt-6">
            <ul className="space-y-1">
              {navItems.map((item) => (<li key={item.name}>
                  <a href={item.href} className="flex items-center px-6 py-3 text-gray-700 hover:bg-blue-50 hover:text-blue-700 rounded-lg transition-colors font-medium">
                    <span className="mr-3 text-lg">{item.icon}</span>
                    {item.name}
                  </a>
                </li>))}
            </ul>
          </nav>
        </div>
        <div className="px-6 py-4 border-t flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-lg">U</div>
          <div>
            <div className="font-semibold text-gray-800 text-sm">User</div>
            <div className="text-xs text-gray-500">user@email.com</div>
          </div>
        </div>
      </aside>

      {/* Main content area */}
      <div className="flex-1 flex flex-col ml-64 min-h-screen">
        {/* Topbar */}
        <header className="h-16 bg-white border-b flex items-center justify-between px-8 sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <span className="text-xl font-bold tracking-tight">📦 Smart Feed Transformer</span>
            <span className="ml-3 px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-semibold">AI Powered</span>
          </div>
          <div className="flex items-center gap-4">
            <button className="px-3 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition">New Upload</button>
            <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-bold text-lg">U</div>
          </div>
        </header>

        {/* Main scrollable content */}
        <main className="flex-1 overflow-y-auto p-8 bg-gray-50">
          {status === "idle" && (<div className="bg-white rounded-lg shadow-md p-6">
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Upload your product feed CSV
                </label>
                <input type="file" accept=".csv" onChange={(e) => { var _a; return setFile(((_a = e.target.files) === null || _a === void 0 ? void 0 : _a[0]) || null); }} className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"/>
              </div>
              <button onClick={handleUpload} disabled={!file} className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed">
                Upload & Transform
              </button>
            </div>)}

          {(status === "uploading" || status === "processing") && (<div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-bold mb-4">
                {status === "uploading" ? "📤 Uploading..." : "🤖 Processing with AI..."}
              </h2>
              <div className="bg-gray-50 rounded-lg p-4 max-h-96 overflow-y-auto">
                <ul className="space-y-2">
                  {log.map((line, i) => (<li key={i} className="text-sm font-mono">{line}</li>))}
                </ul>
              </div>
            </div>)}

          {status === "done" && output && (<div className="space-y-6">
              {/* Summary Card */}
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-2xl font-bold mb-4">
                  ✅ Transformation Complete
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-900">{output.summary.total}</div>
                    <div className="text-sm text-gray-600">Total Rows</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{output.summary.green}</div>
                    <div className="text-sm text-gray-600">🟢 Confident</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-yellow-600">{output.summary.yellow}</div>
                    <div className="text-sm text-gray-600">🟡 Partial</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600">{output.summary.red}</div>
                    <div className="text-sm text-gray-600">🔴 Failed</div>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <div>
                    <strong>Detected Category:</strong> {output.category}
                  </div>
                  <div>
                    <strong>Processing Time:</strong> {output.summary.processing_time_ms}ms
                  </div>
                </div>
                <div className="mb-4">
                  <strong>Vendor Fields:</strong>{" "}
                  <span className="text-sm text-gray-600">
                    {output.vendorFields && output.vendorFields.length > 0
                ? output.vendorFields.join(", ")
                : "N/A"}
                  </span>
                </div>
                <a href={`/api/download/${output.file}`} className="inline-block px-6 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700">
                  📥 Download Output File
                </a>
              </div>

              {/* Detailed Row Log */}
              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-xl font-bold mb-4">
                  Detailed Row Analysis
                </h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Row
                        </th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Confidence
                        </th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Time (ms)
                        </th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Retries
                        </th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {output.rows.map((row, i) => (<tr key={i} className="hover:bg-gray-50">
                          <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-gray-900">
                            {row.row_number}
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap text-sm">
                            <span className={`font-medium ${getStatusColor(row.status)}`}>
                              {row.status}
                            </span>
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap text-sm">
                            {getConfidenceIcon(row.row_confidence)} {row.row_confidence}
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">
                            {row.processing_time_ms}
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">
                            {row.retry_count}
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap text-sm">
                            <button onClick={() => setSelectedRow(row)} className="text-blue-600 hover:text-blue-900 font-medium">
                              View Details
                            </button>
                          </td>
                        </tr>))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>)}

          {status === "error" && (<div className="bg-red-50 border border-red-200 rounded-lg p-6">
              <h2 className="text-xl font-bold text-red-800 mb-4">
                ❌ Transformation Failed
              </h2>
              <div className="bg-red-100 rounded-lg p-4 max-h-96 overflow-y-auto">
                <ul className="space-y-2">
                  {log.map((line, i) => (<li key={i} className="text-sm font-mono text-red-800">{line}</li>))}
                </ul>
              </div>
              <button onClick={() => {
                setStatus("idle");
                setLog([]);
                setOutput(null);
            }} className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">
                Try Again
              </button>
            </div>)}

          {/* Row Detail Modal */}
          {selectedRow && (<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
              <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                <div className="p-6">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-bold">
                      Row {selectedRow.row_number} Details
                    </h3>
                    <button onClick={() => setSelectedRow(null)} className="text-gray-500 hover:text-gray-700">
                      ✕
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-bold mb-2">Original Data</h4>
                      <pre className="bg-gray-100 p-3 rounded text-sm overflow-x-auto">
                        {JSON.stringify(selectedRow.original_data, null, 2)}
                      </pre>
                    </div>
                    
                    <div>
                      <h4 className="font-bold mb-2">Transformed Data</h4>
                      <pre className="bg-gray-100 p-3 rounded text-sm overflow-x-auto">
                        {JSON.stringify(selectedRow.transformed_data, null, 2)}
                      </pre>
                    </div>
                  </div>
                  
                  {selectedRow.error_message && (<div className="mt-4">
                      <h4 className="font-bold mb-2 text-red-600">Error Message</h4>
                      <div className="bg-red-50 border border-red-200 rounded p-3 text-red-800">
                        {selectedRow.error_message}
                      </div>
                    </div>)}
                  
                  <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <strong>Status:</strong> {selectedRow.status}
                    </div>
                    <div>
                      <strong>Confidence:</strong> {getConfidenceIcon(selectedRow.row_confidence)} {selectedRow.row_confidence}
                    </div>
                    <div>
                      <strong>Processing Time:</strong> {selectedRow.processing_time_ms}ms
                    </div>
                    <div>
                      <strong>Retry Count:</strong> {selectedRow.retry_count}
                    </div>
                  </div>
                </div>
              </div>
            </div>)}
        </main>
      </div>
    </div>);
}
