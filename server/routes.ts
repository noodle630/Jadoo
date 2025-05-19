// File: server/routes.ts
import express from "express";
import multer from "multer";
import path from "path";
import { transformCSVWithOpenAI } from "./utils/transformer";
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
    const marketplace = (req.body.marketplace || "unknown").toLowerCase();
    const category = req.body.category || "unknown";
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
      category,
      status: "uploaded",
      input_path: fullPath,
      row_count: rowCount,
      output_path: "",
      summary_json: {},
    });

    if (error) throw error;
    res.status(201).json({ message: "Feed created successfully", id: feedId });
  } catch (err: any) {
    console.error("[UPLOAD ERROR]", err);
    res.status(500).json({ error: "Upload failed", details: err.message || err.toString() });
  }
});

// Trigger processing
router.post("/feeds/:id/process", async (req, res) => {
  try {
    const id = req.params.id;
    const { data, error } = await supabase.from("feeds").select("*").eq("id", id).single();
    if (error || !data) return res.status(404).json({ error: "Feed not found" });

   const outputPath = await transformCSVWithOpenAI(
  data.input_path,
  data.platform
);


    await supabase.from("feeds").update({
      status: "completed",
      output_path: outputPath,
      summary_json: {},
    }).eq("id", id);

    res.status(200).json({ message: "Processed successfully" });
  } catch (err: any) {
    console.error("[PROCESS ERROR]", err);
    await supabase.from("feeds").update({ status: "failed" }).eq("id", req.params.id);
    res.status(500).json({ error: "Processing failed", details: err.message || err.toString() });
  }
});

// Download result
router.get("/feeds/:id/download", async (req, res) => {
  try {
    const id = req.params.id;
    const { data, error } = await supabase.from("feeds").select("output_path").eq("id", id).single();
    if (error || !data) return res.status(404).json({ error: "Output not found" });

    const filePath = data.output_path;
    return res.download(filePath);
  } catch (err: any) {
    console.error("[DOWNLOAD ERROR]", err);
    res.status(500).json({ error: "Download failed", details: err.message || err.toString() });
  }
});

export default router;


// Poll processing status
router.get("/feeds/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const { data, error } = await supabase
      .from("feeds")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !data) {
      return res.status(404).json({ error: "Feed not found" });
    }

    return res.json(data);
  } catch (err: any) {
    console.error("[GET FEED STATUS ERROR]", err);
    res.status(500).json({
      error: "Failed to retrieve feed",
      details: err.message || err.toString(),
    });
  }
});

