// routes.ts
import express from "express";
import { Router } from "express";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { handleUpload, handleProcess } from "./utils/transformer.js"; // adjust if your transformer is in ./utils

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// ✅ Health check
router.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

// ✅ Upload route — uses express-fileupload
router.post("/feeds/upload", async (req, res) => {
  if (!req.files || !req.files.file) {
    return res.status(400).json({ error: "No file uploaded" });
  }

  const file = req.files.file;
  const id = Date.now().toString();
  const uploadDir = path.join(process.cwd(), "temp_uploads");

  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  const savePath = path.join(uploadDir, `${id}.csv`);
  await file.mv(savePath);

  console.log("✅ File uploaded:", savePath);
  res.json({ id });
});

// ✅ Process route
router.post("/feeds/:id/process", async (req, res) => {
  try {
    const { id } = req.params;
    const result = await handleProcess(id);
    res.json({ status: "processed", file: result });
  } catch (err) {
    console.error("[PROCESS ERROR]", err);
    res.status(500).json({ error: err.message });
  }
});

// ✅ Download route
router.get("/feeds/:id/download", (req, res) => {
  const { id } = req.params;
  const outputPath = path.join(__dirname, "../outputs", `${id}.xlsx`);
  if (!fs.existsSync(outputPath)) {
    return res.status(404).json({ error: "Output file not found" });
  }
  res.download(outputPath);
});

export default router;
