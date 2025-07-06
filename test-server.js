import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const port = process.env.PORT || 4000;

// CORS setup
app.use(cors({
  origin: true,
  credentials: true
}));

// Body parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Ensure directories exist
const tempDir = join(__dirname, 'temp_uploads');
const outputsDir = join(__dirname, 'outputs');

if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
}
if (!fs.existsSync(outputsDir)) {
  fs.mkdirSync(outputsDir, { recursive: true });
}

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Test server running' });
});

// Simple file upload endpoint
app.post('/api/simple-upload', (req, res) => {
  console.log('📁 Upload request received');
  
  // Simulate file processing
  const feedId = uuidv4();
  const outputPath = join(outputsDir, `${feedId}_output.xlsx`);
  
  // Create a simple test output file
  const testData = `Feed ID: ${feedId}\nProcessed at: ${new Date().toISOString()}\nStatus: Success`;
  fs.writeFileSync(outputPath, testData);
  
  console.log(`✅ Created output file: ${outputPath}`);
  
  res.json({
    success: true,
    feedId: feedId,
    message: 'File uploaded and processed successfully',
    outputUrl: `/api/download/${feedId}`
  });
});

// Download endpoint
app.get('/api/download/:feedId', (req, res) => {
  const { feedId } = req.params;
  const outputPath = join(outputsDir, `${feedId}_output.xlsx`);
  
  console.log(`📥 Download request for feed: ${feedId}`);
  
  if (fs.existsSync(outputPath)) {
    console.log(`✅ Serving file: ${outputPath}`);
    res.download(outputPath, `processed_feed_${feedId}.xlsx`);
  } else {
    console.log(`❌ File not found: ${outputPath}`);
    res.status(404).json({ error: 'File not found' });
  }
});

// Test endpoint
app.get('/api/test', (req, res) => {
  res.json({
    message: 'Test server is working!',
    timestamp: new Date().toISOString(),
    endpoints: {
      health: '/api/health',
      upload: '/api/simple-upload',
      download: '/api/download/:feedId'
    }
  });
});

// Start server
app.listen(port, '0.0.0.0', () => {
  console.log(`🚀 Test server running at http://localhost:${port}`);
  console.log(`📁 Temp directory: ${tempDir}`);
  console.log(`📁 Outputs directory: ${outputsDir}`);
  console.log(`🧪 Test endpoint: http://localhost:${port}/api/test`);
});

export default app; 