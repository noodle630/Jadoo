import React, { useState } from "react";
import axios from "axios";

export default function NewFeedV2() {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<
    "idle" | "uploading" | "processing" | "done" | "error"
  >("idle");
  const [log, setLog] = useState<string[]>([]);
  const [output, setOutput] = useState<{
    file: string;
    rows: any[];
    summary: any;
    category: string;
    vendorFields: string[];
  } | null>(null);

  const handleUpload = async () => {
    if (!file) return;
    setStatus("uploading");
    setLog(["⏳ Uploading..."]);

    const formData = new FormData();
    formData.append("file", file);

    try {
      // ✅ Upload CSV
      const uploadRes = await axios.post("/api/upload", formData);
      const { id } = uploadRes.data;
      setLog((prev) => [...prev, `✅ Uploaded: ${id}`]);

      // ✅ Process CSV
      setStatus("processing");
      const procRes = await axios.post(`/api/process/${id}`);
      const {
        file: outputFile,
        category,
        vendorFields,
        rows
      } = procRes.data;
      setLog((prev) => [...prev, `✅ Processing complete.`]);

      const summary = {
        green: rows.filter((r: any) => r.row_confidence === "green").length,
        yellow: rows.filter((r: any) => r.row_confidence === "yellow").length,
        red: rows.filter((r: any) => r.row_confidence === "red").length,
        total: rows.length,
      };

      // ✅ FIX: Store category & vendorFields too!
      setOutput({
        file: outputFile,
        rows,
        summary,
        category,
        vendorFields
      });
      setStatus("done");

    } catch (err: any) {
      console.error(err);
      setLog((prev) => [
        ...prev,
        `❌ ${err.message || "Unknown error"}`
      ]);
      setStatus("error");
    }
  };

  return (
    <div className="max-w-xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">
        📦 Smart Feed Transformer
      </h1>

      {status === "idle" && (
        <>
          <input
            type="file"
            accept=".csv"
            onChange={(e) =>
              setFile(e.target.files?.[0] || null)
            }
            className="mb-4"
          />
          <button
            onClick={handleUpload}
            disabled={!file}
            className="px-4 py-2 bg-blue-600 text-white rounded"
          >
            Upload & Process
          </button>
        </>
      )}

      {(status === "uploading" || status === "processing") && (
        <div className="mt-4 p-4 border rounded">
          <h2 className="font-bold mb-2">
            {status === "uploading"
              ? "Uploading..."
              : "Processing..."}
          </h2>
          <ul className="text-sm space-y-1">
            {log.map((line, i) => (
              <li key={i}>{line}</li>
            ))}
          </ul>
        </div>
      )}

      {status === "done" && output && (
        <div className="mt-6 p-4 border rounded">
          <h2 className="text-lg font-bold mb-2">
            ✅ Transformation Complete
          </h2>
          <p className="mb-2">
            <strong>Total Rows:</strong> {output.summary.total}
          </p>
          <p className="mb-2">
            <strong>Detected Category:</strong> {output.category}
          </p>
          <p className="mb-4">
            <strong>Vendor Fields:</strong>{" "}
            {output.vendorFields && output.vendorFields.length > 0
              ? output.vendorFields.join(", ")
              : "N/A"}
          </p>
          <div className="flex gap-4 mb-4">
            <span className="text-green-600">
              🟢 {output.summary.green} Green
            </span>
            <span className="text-yellow-600">
              🟡 {output.summary.yellow} Yellow
            </span>
            <span className="text-red-600">
              🔴 {output.summary.red} Red
            </span>
          </div>
          <a
            href={`/api/download/${output.file}`}
            className="inline-block px-4 py-2 bg-green-600 text-white rounded"
          >
            📥 Download Output File
          </a>
          <h3 className="mt-6 mb-2 font-bold">
            Detailed Row Log:
          </h3>
          <ul className="text-sm space-y-1 max-h-60 overflow-y-auto border p-2 rounded bg-gray-50">
            {output.rows.map((row, i) => (
              <li key={i}>
                Row {row.row_number}: {row.status} [
                {row.row_confidence}]
              </li>
            ))}
          </ul>
        </div>
      )}

      {status === "error" && (
        <div className="mt-6 p-4 border rounded text-red-600">
          ❌ Something went wrong. Check the logs above and your
          server.
        </div>
      )}
    </div>
  );
}
