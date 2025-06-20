import express from "express";
import dotenv from "dotenv";
import fileUpload from "express-fileupload";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import cors from "cors";
import { createServer } from "http";
import routes from "./routes";
import { setupAuth } from "./replitAuth"; // if you still use this

dotenv.config();

const app = express();
const server = createServer(app);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


// Create /outputs if missing
const outputsPath = path.join(__dirname, "../outputs");
if (!fs.existsSync(outputsPath)) {
  fs.mkdirSync(outputsPath);
  console.log(`✅ Created outputs folder: ${outputsPath}`);
}

app.use(cors());
app.use(fileUpload());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve frontend static files correctly:
app.use(express.static(path.join(__dirname, "../client/dist")));

// API routes
app.use("/api", routes);

// Fallback: send index.html if route not found (optional for React Router)
app.get("*", (_, res) => {
  res.sendFile(path.join(__dirname, "../client/dist/index.html"));
});

// Start
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});
