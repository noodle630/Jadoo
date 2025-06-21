import express from "express";
import path from "path";
import fs from "fs";
import { v4 as uuidv4 } from "uuid";
import supabase from "../supabaseClient"; // ✅ at root
import { handleProcess } from "./utils/transformer"; // ✅ match your tree

const router = express.Router();

// ✅ /api/upload — uses express-fileupload
router.post("/upload", async (req, res) => {
  try {
    if (!req.files || !req.files.file) {
      return res.status(400).json({ error: "No file uploaded." });
    }

    const file = req.files.file as fileUpload.UploadedFile;
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

