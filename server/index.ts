import 'dotenv/config';
console.log('[DEBUG] REDIS_URL at index.ts:', process.env.REDIS_URL);
import express from "express";
import cors from "cors";
import routes from "./routes.js"; // 👈 match your folder
import fileUpload from "express-fileupload";
import './queue.js';
import IORedis from 'ioredis';

const app = express();
const port = process.env.PORT || 4000;

const allowedOrigins = [
  /\.lovable\.app$/, // allow all subdomains of lovable.app
  /\.lovableproject\.com$/, // allow all subdomains of lovableproject.com
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5175',
  'https://236d-135-84-144-58.ngrok-free.app', // ngrok dev
  'https://jadoo.fly.dev', // Fly.io prod
];

const redisUrl = process.env.REDIS_URL;
if (!redisUrl) {
  throw new Error('[REDIS][App] REDIS_URL is not set!');
}
console.log('[REDIS][App] Connecting to:', redisUrl);
const testRedis = new IORedis(redisUrl);
testRedis.on('connect', () => console.log('[REDIS][App] Connected!'));
testRedis.on('error', (err) => console.error('[REDIS][App] Connection error:', err));

app.use(cors({
  origin: function(origin, callback) {
    if (!origin) return callback(null, true);
    if (
      allowedOrigins.some(pattern =>
        typeof pattern === 'string'
          ? pattern === origin
          : pattern.test(origin)
      )
    ) {
      return callback(null, true);
    } else {
      return callback(new Error('Not allowed by CORS'), false);
    }
  },
  credentials: true,
}));

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

process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION:', err);
  process.exit(1);
});
process.on('unhandledRejection', (reason, promise) => {
  console.error('UNHANDLED REJECTION:', reason);
  process.exit(1);
});

try {
  app.listen(Number(port), '0.0.0.0', () => {
    console.log(`🚀 Server running at http://localhost:${port}`);
  });
} catch (err) {
  console.error('FATAL ERROR DURING SERVER STARTUP:', err);
  process.exit(1);
}
