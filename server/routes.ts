import dotenv from "dotenv";
dotenv.config(); // this MUST come before using any process.env vars

import express from "express";
import path from "path";
import fs from "fs";
import { v4 as uuidv4 } from "uuid";
import supabase from "../supabaseClient"; // ✅ at root
import { handleProcess } from "./utils/transformer"; // ✅ match your tree
import multer from 'multer';
import Papa from 'papaparse';

const router = express.Router();

// ✅ /api/upload — uses express-fileupload
router.post("/upload", async (req, res) => {
  try {
    if (!req.files || !req.files.file) {
      return res.status(400).json({ error: "No file uploaded." });
    }

    const file = req.files.file as Express.Multer.File;
    const id = uuidv4();
    const uploadPath = path.join("temp_uploads", `${id}.csv`);

    await file.mv(uploadPath);

    console.log(`✅ File saved: ${uploadPath}`);
    return res.json({ id });
  } catch (err) {
    console.error(`❌ Upload error: ${err}`);
    return res.status(500).json({ error: err.message });
  }
});

// ✅ /api/process/:id
router.post("/process/:id", handleProcess);

// PATCH: Jadoo - /api/simple-upload endpoint for Lovable integration
const upload = multer({ dest: 'jadoo_temp_uploads/' });

router.post('/api/simple-upload', upload.single('file'), async (req, res) => {
  try {
    // Type guards for req.body and req.file
    const body = req.body as { platform?: string; category?: string; user_email?: string };
    const file = req.file as Express.Multer.File | undefined;
    const platform = body.platform;
    const category = body.category;
    const email = body.user_email || 'dev@local.test'; // TODO: Replace with Google Auth user when ready
    if (!file) return res.status(400).json({ error: 'No file uploaded' });
    if (!platform) return res.status(400).json({ error: 'Platform is required' });
    if (platform !== 'walmart') return res.status(400).json({ error: 'Only Walmart is supported at this time' });
    // Read file and count rows
    const csvData = fs.readFileSync(file.path, 'utf8');
    const { data: rows } = Papa.parse(csvData, { header: true, skipEmptyLines: true });
    if (rows.length > 100) return res.status(400).json({ error: 'Max 100 rows supported for now' });
    // Log to feeds
    const { data: feed, error: feedErr } = await supabase.from('feeds').insert({
      platform,
      category: category || null,
      filename: file.originalname,
      row_count: rows.length,
      status: 'uploading',
      user_email: email
    }).select().single();
    if (feedErr) return res.status(500).json({ error: 'Failed to log feed', details: feedErr });
    // Log event
    await supabase.from('transformation_events').insert({
      feed_id: feed.id,
      event_type: 'upload_received',
      details: { filename: file.originalname, platform, category, row_count: rows.length, user_email: email }
    });
    // Call transformer logic (pass platform, category, feed_id, etc.)
    // TODO: Update transformer to accept these params and log to Supabase
    // For now, just return feed metadata
    return res.json({
      feed_id: feed.id,
      platform,
      category,
      status: feed.status,
      row_count: rows.length,
      created_at: feed.created_at
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return res.status(500).json({ error: message });
  }
});

export default router;

// Add below your POST routes
router.get("/logs/:id", async (req, res) => {
  const { id } = req.params;
  const { data, error } = await supabase.from("logs").select("*").eq("feed_id", id).order("row_number");
  if (error) {
    console.error(error);
    return res.status(500).json({ error: error.message });
  }
  return res.json(data);
});


router.get("/download/:file", async (req, res) => {
  const file = req.params.file;
  const filePath = path.join("outputs", file);
  if (!fs.existsSync(filePath)) {
    return res.status(404).send("File not found");
  }
  res.download(filePath);
});

