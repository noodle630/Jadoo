import { fileURLToPath } from 'url';
import path from 'path';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const express = require('express');
const multer = require('multer');
const fs = require('fs');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// DEV ALLOWED ORIGIN - update here for all dev/preview environments
const DEV_ORIGIN = 'https://jadoo.ngrok-free.app';

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'Jadoo backend is running', 
    timestamp: new Date().toISOString(),
    endpoints: {
      simpleUpload: 'POST /api/simple-upload',
      simpleDownload: 'GET /api/simple-download/:id'
    }
  });
});

// CORS middleware (after health check)
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like health checks, curl, etc.)
    if (!origin) return callback(null, true);
    // Allow the ngrok dev domain
    if (origin === DEV_ORIGIN) return callback(null, true);
    // Allow any Lovable preview domains
    if (origin.includes('lovable.app')) return callback(null, true);
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'ngrok-skip-browser-warning'],
}));

app.use(express.json());

// Create necessary directories
const uploadDir = path.join(__dirname, '..', 'temp_uploads');
const outputDir = path.join(__dirname, '..', 'outputs');

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    cb(null, `upload_${timestamp}_${file.originalname}`);
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  }
});

// Import real transformer
const { handleProcess } = require('./utils/transformer.js');

// Simple upload endpoint
app.post('/api/simple-upload', upload.single('file'), async (req, res) => {
  console.log('[UPLOAD] Request received');
  console.log('[UPLOAD] File:', req.file ? req.file.originalname : 'NO FILE');
  console.log('[UPLOAD] Body:', req.body);
  
  try {
    if (!req.file) {
      console.log('[UPLOAD] No file detected');
      return res.status(400).json({ message: 'No file uploaded' });
    }

    // Only allow Walmart marketplace
    const marketplace = (req.body.marketplace || req.body.platform || '').toLowerCase();
    if (marketplace !== 'walmart') {
      console.log(`[UPLOAD] Invalid marketplace: ${marketplace}`);
      return res.status(400).json({ message: 'Only Walmart marketplace is supported at this time.' });
    }

    // Generate a feedId
    const feedId = `feed_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
    
    // Rename uploaded file to match transformer expectations
    const transformerInputPath = path.join(uploadDir, `${feedId}.csv`);
    fs.renameSync(req.file.path, transformerInputPath);
    
    console.log(`[UPLOAD] Starting real transformer for feedId: ${feedId}`);
    
    // Call the real transformer
    try {
      const transformerOptions = {
        tier: req.body.tier || 'free',
        category: req.body.category || 'Other',
        allowGrounding: req.body.allowGrounding || 'true',
        user_id: req.body.user_id || null
      };
      
      const result = await handleProcess({
        params: { id: feedId },
        body: transformerOptions,
        headers: req.headers
      });
      
      console.log(`[UPLOAD] Transformer completed for feedId: ${feedId}`);
      
      res.json({
        feed_id: feedId,
        status: 'completed',
        message: 'File uploaded and transformed successfully',
        file_info: {
          name: req.file.originalname,
          size: req.file.size,
          type: req.file.mimetype
        },
        platform: marketplace,
        output_path: path.join(outputDir, `${feedId}_output.xlsx`),
        transformer_result: result
      });
      
    } catch (transformerError) {
      console.error(`[UPLOAD] Transformer failed for feedId: ${feedId}:`, transformerError);
      return res.status(500).json({ message: 'Transformer failed', error: transformerError.message });
    }
    
  } catch (error) {
    console.error('[UPLOAD] Error:', error);
    res.status(500).json({ 
      message: 'Error processing upload',
      error: error.message
    });
  }
});

// Simple download endpoint
app.get('/api/simple-download/:id', (req, res) => {
  const { id } = req.params;
  const filePath = path.join(outputDir, `${id}_output.xlsx`);
  
  console.log(`[DOWNLOAD] Attempting to download: ${filePath}`);
  
  if (!fs.existsSync(filePath)) {
    console.log(`[DOWNLOAD] File not found for id: ${id}`);
    return res.status(404).json({ message: 'File not found' });
  }
  
  res.setHeader('Content-Disposition', `attachment; filename="${id}_output.xlsx"`);
  res.download(filePath, (err) => {
    if (err) {
      console.log(`[DOWNLOAD] Error serving file for id: ${id}, error:`, err);
    } else {
      console.log(`[DOWNLOAD] File served for id: ${id}`);
    }
  });
});

// Wallet balance endpoint (placeholder)
app.get('/api/wallet/balance', (req, res) => {
  const userId = req.query.user_id;
  console.log(`[WALLET] Balance request for user: ${userId}`);
  // Return placeholder balance
  res.json({
    balance: 100.00,
    currency: 'USD',
    user_id: userId
  });
});

// Wallet transactions endpoint (placeholder)
app.get('/api/wallet/transactions', (req, res) => {
  const userId = req.query.user_id;
  console.log(`[WALLET] Transactions request for user: ${userId}`);
  // Return placeholder transactions as an array directly
  res.json([
    {
      id: 'txn_1',
      amount: 50.00,
      type: 'credit',
      description: 'Initial deposit',
      date: new Date().toISOString(),
      status: 'completed'
    },
    {
      id: 'txn_2',
      amount: -25.00,
      type: 'debit',
      description: 'Feed processing fee',
      date: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
      status: 'completed'
    }
  ]);
});

// Import Stripe
const Stripe = require('stripe');

// Initialize Stripe (use test key for development)
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_...');

// Wallet add funds endpoint with Stripe checkout
app.post('/api/wallet/add', async (req, res) => {
  const { user_id, amount } = req.body;
  console.log(`[WALLET] Add funds request for user: ${user_id}, amount: ${amount}`);
  
  // Validate input
  if (!user_id || !amount || isNaN(amount) || amount <= 0) {
    return res.status(400).json({ 
      message: 'Invalid request. user_id and positive amount required.' 
    });
  }

  // Validate amount (only allow $10 or $20 top-ups)
  const validAmounts = [10, 20];
  if (!validAmounts.includes(parseInt(amount))) {
    return res.status(400).json({ 
      message: 'Invalid amount. Only $10 and $20 top-ups are supported.' 
    });
  }

  try {
    // Create Stripe checkout session for wallet top-up
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      customer_email: req.body.email || 'user@example.com', // You might want to get this from user context
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `Wallet Credit - $${amount}`,
              description: `Add $${amount} to your Jadoo wallet for processing credits`,
            },
            unit_amount: parseInt(amount) * 100, // Stripe expects cents
          },
          quantity: 1,
        },
      ],
      success_url: `${process.env.FRONTEND_URL || 'https://jadoo.ngrok-free.app'}/wallet/success?session_id={CHECKOUT_SESSION_ID}&user_id=${user_id}&amount=${amount}`,
      cancel_url: `${process.env.FRONTEND_URL || 'https://jadoo.ngrok-free.app'}/wallet/cancel`,
      metadata: {
        user_id: user_id,
        amount: amount.toString(),
        type: 'wallet_topup'
      }
    });

    console.log(`[WALLET] Stripe checkout session created: ${session.id}`);
    
    res.json({
      success: true,
      checkout_url: session.url,
      session_id: session.id,
      message: `Redirecting to Stripe checkout for $${amount} wallet top-up`
    });

  } catch (error) {
    console.error(`[WALLET] Stripe checkout error:`, error);
    res.status(500).json({ 
      message: 'Failed to create checkout session',
      error: error.message
    });
  }
});

// Stripe webhook endpoint to handle successful payments
app.post('/api/stripe/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET || 'whsec_test_...';

  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch (err) {
    console.error(`[STRIPE] Webhook signature verification failed:`, err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  switch (event.type) {
    case 'checkout.session.completed':
      const session = event.data.object;
      
      // Only process wallet top-ups
      if (session.metadata && session.metadata.type === 'wallet_topup') {
        const { user_id, amount } = session.metadata;
        console.log(`[STRIPE] Wallet top-up completed for user: ${user_id}, amount: $${amount}`);
        
        // Here you would typically:
        // 1. Update the user's wallet balance in your database
        // 2. Record the transaction
        // 3. Send confirmation email
        
        // For now, just log the success
        console.log(`[STRIPE] Successfully processed wallet top-up: $${amount} for user ${user_id}`);
      }
      break;
      
    default:
      console.log(`[STRIPE] Unhandled event type: ${event.type}`);
  }

  res.json({ received: true });
});

// Feed progress endpoint (placeholder)
app.get('/api/feeds/:id/progress', (req, res) => {
  const { id } = req.params;
  const userId = req.query.user_id;
  console.log(`[FEED] Progress request for feed: ${id}, user: ${userId}`);
  
  // Return placeholder progress data
  res.json({
    feed_id: id,
    user_id: userId,
    status: 'completed',
    progress: 100,
    message: 'Feed processing completed',
    created_at: new Date().toISOString(),
    completed_at: new Date().toISOString(),
    file_ready: true,
    download_url: `/api/simple-download/${id}`
  });
});

// Catch-all 404 handler
app.use('*', (req, res) => {
  console.log(`[404] Route not found: ${req.method} ${req.originalUrl}`);
  res.status(404).json({ 
    error: 'Route not found',
    method: req.method,
    url: req.originalUrl
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('[ERROR] Global error handler:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    message: err.message
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Jadoo backend server running on port ${PORT}`);
  console.log(`📁 Upload directory: ${uploadDir}`);
  console.log(`📁 Output directory: ${outputDir}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/health`);
});

module.exports = app;