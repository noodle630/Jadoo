import express from "express";
import multer from "multer";
import path from "path";
import { transform_csv_with_openai } from "./utils/transformer";
import { createClient } from "@supabase/supabase-js";
import fs from "fs";

const router = express.Router();
const upload = multer({ dest: "temp_uploads/" });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Upload
router.post("/feeds/upload", upload.single("file"), async (req, res) => {
  try {
    const file = req.file;
    const marketplace = req.body.marketplace || "unknown";
    if (!file) return res.status(400).json({ error: "No file provided" });

    const feedId = file.filename.split("_")[0];
    const filename = file.originalname;
    const fullPath = path.resolve(file.path);

const raw = fs.readFileSync(fullPath, "utf8");
const rowCount = raw.split("\n").length - 1;

    const { error } = await supabase.from("feeds").insert({
      id: feedId,
      filename,
      platform: marketplace,
      status: "uploaded",
      input_path: fullPath,
      row_count: rowCount,
      output_path: "",
      summary_json: {},
    });

    if (error) throw error;
    res.status(201).json({ message: "Feed created successfully", id: feedId });
  } catch (err) {
    console.error("[UPLOAD ERROR]", err);
    res.status(500).json({ error: "Upload failed" });
  }
});

// Trigger processing
router.post("/feeds/:id/process", async (req, res) => {
  try {
    const id = req.params.id;
    const { data, error } = await supabase.from("feeds").select("*").eq("id", id).single();
    if (error || !data) return res.status(404).json({ error: "Feed not found" });

    const result = await transform_csv_with_openai(data.input_path, data.platform);

    await supabase.from("feeds").update({
      status: "completed",
      output_path: result.output_path,
      row_count: result.row_count,
      summary_json: result.summary,
    }).eq("id", id);

    res.json({ message: "Processed", ...result });
  } catch (err) {
    console.error("[PROCESS ERROR]", err);
    await supabase.from("feeds").update({ status: "failed" }).eq("id", req.params.id);
    res.status(500).json({ error: "Processing failed" });
  }
});

// Status fetch
router.get("/feeds/:id", async (req, res) => {
  const { data, error } = await supabase.from("feeds").select("*").eq("id", req.params.id).single();
  if (error || !data) return res.status(404).json({ error: "Feed not found" });
  res.json(data);
});

// Download
router.get("/feeds/:id/download", async (req, res) => {
  const { data, error } = await supabase.from("feeds").select("output_path").eq("id", req.params.id).single();
  if (error || !data) return res.status(404).json({ error: "Feed not found" });
  res.download(data.output_path);
});

export default router;
