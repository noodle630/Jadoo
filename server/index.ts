import express from "express";
import cors from "cors";
import routes from "server/routes"; // 👈 match your folder
import fileUpload from "express-fileupload";

const app = express();
const port = process.env.PORT || 3000;

// ===== COMPREHENSIVE CORS CONFIGURATION (FIRST!) =====
app.use((req, res, next) => {
  const origin = req.headers.origin;
  console.log('🌐 CORS - Request from origin:', origin);
  
  // Dynamic CORS for Lovable domains and development
  const allowedPatterns = [
    /^https:\/\/.*\.lovableproject\.com$/,
    /^https:\/\/.*\.lovable\.app$/,
    /^https:\/\/.*\.lovable\.dev$/,
    /^http:\/\/localhost(:\d+)?$/,
    /^https:\/\/.*\.ngrok-free\.app$/,
    /^https:\/\/.*\.ngrok\.io$/
  ];
  
  const isAllowed = allowedPatterns.some(pattern => pattern.test(origin || ''));
  
  if (isAllowed) {
    res.header('Access-Control-Allow-Origin', origin);
    console.log('✅ CORS - Origin allowed:', origin);
  } else {
    console.log('❌ CORS - Origin blocked:', origin);
  }
  
  // Essential CORS headers
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, ngrok-skip-browser-warning');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Max-Age', '86400'); // 24 hours
  
  // Handle preflight OPTIONS requests
  if (req.method === 'OPTIONS') {
    console.log('🔄 CORS - Preflight request handled');
    return res.status(200).end();
  }
  
  next();
});

// Log all requests for debugging
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  console.log('Headers:', req.headers);
  next();
});

// Body parsers for non-upload routes
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Only use fileUpload for /api/upload legacy route
app.use("/api/upload", fileUpload());

// All API routes (including the new Multer-based upload)
app.use("/api", routes);

// Add CORS test endpoint
app.get('/api/cors-test', (req, res) => {
  console.log('🧪 CORS Test - Headers sent:', res.getHeaders());
  res.json({ 
    message: 'CORS test successful', 
    origin: req.headers.origin,
    headers: res.getHeaders()
  });
});

app.listen(port, () => {
  console.log(`🚀 Server running at http://localhost:${port}`);
});
