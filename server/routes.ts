import { Express, Request, Response, Router } from "express";
import multer from "multer";
import { createServer, type Server } from "http";
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { storage } from "./storage";
import { isAuthenticated } from "./replitAuth";

// Configure paths for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configure multer for file uploads
const uploadDir = path.join(__dirname, '..', 'temp_uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage_config = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    cb(null, `${Date.now()}_${file.originalname}`);
  }
});

const upload = multer({ 
  storage: storage_config,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  }
});

export async function registerRoutes(app: Express): Promise<Server> {
  const router = Router();
  
  // No OAuth setup needed
  
  // Mount the router
  app.use("/api", router);
  
  // User routes
  router.get('/user', async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(200).json({ isAuthenticated: false });
    }
    
    try {
      const userInfo = (req.user as any);
      const userId = userInfo?.id || userInfo?.claims?.sub || '1';
      
      const user = await storage.getUser(userId);
      
      return res.status(200).json({
        isAuthenticated: true,
        user
      });
    } catch (error) {
      console.error('Error fetching user:', error);
      return res.status(500).json({ message: 'Error fetching user information' });
    }
  });
  
  // Feed routes
  router.get('/feeds', async (req: Request, res: Response) => {
    try {
      const userId = req.isAuthenticated() ? (req.user as any).id || '1' : '1';
      const feeds = await storage.getFeeds(userId);
      res.json(feeds);
    } catch (error) {
      console.error('Error fetching feeds:', error);
      res.status(500).json({ message: 'Error fetching feeds' });
    }
  });
  
  router.get('/feeds/:id', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: 'Invalid feed ID' });
      }
      
      const feed = await storage.getFeed(id);
      if (!feed) {
        return res.status(404).json({ message: 'Feed not found' });
      }
      
      res.json(feed);
    } catch (error) {
      console.error('Error fetching feed:', error);
      res.status(500).json({ message: 'Error fetching feed' });
    }
  });
  
  router.patch('/feeds/:id', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: 'Invalid feed ID' });
      }
      
      const feed = await storage.getFeed(id);
      if (!feed) {
        return res.status(404).json({ message: 'Feed not found' });
      }
      
      // Get updates from request body
      const updates = req.body;
      
      // Apply updates
      Object.keys(updates).forEach(key => {
        // Only update fields that exist and are not readonly
        if (feed[key] !== undefined && !['id', 'userId', 'source', 'sourceDetails'].includes(key)) {
          feed[key] = updates[key];
        }
      });
      
      // Save updated feed
      const updatedFeed = await storage.updateFeed(id, feed);
      
      res.json(updatedFeed);
    } catch (error) {
      console.error('Error updating feed:', error);
      res.status(500).json({ message: 'Error updating feed' });
    }
  });
  
  // We will continue using the upload route for compatibility
  // but we recommend using the direct-routes.ts endpoint for new code
  router.post('/feeds/upload', upload.single('file'), async (req: Request, res: Response) => {
    try {
      // Import reliable parser to get accurate row count
      const reliableParser = require('./utils/reliableParser');
      
      // Validate the upload
      if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded' });
      }
      
      // Get form data
      const name = req.body.name || req.file.originalname.replace(/\.[^/.]+$/, "");
      const marketplace = req.body.marketplace || 'amazon';
      
      // Count rows reliably
      let rowCount = 0;
      
      try {
        const countResult = reliableParser.countCSVRows(req.file.path);
        if (countResult.success) {
          rowCount = countResult.dataRows;
          console.log(`Reliable row count: ${rowCount} data rows`);
        }
      } catch (err) {
        console.error("Error counting rows:", err);
      }
      
      // Create a new feed
      const newFeed = await storage.createFeed({
        name,
        userId: req.user ? (req.user as any).id || 1 : 1,
        status: 'pending',
        source: 'upload',
        sourceDetails: {
          originalName: req.file.originalname,
          originalPath: req.file.path,
          size: req.file.size
        },
        marketplace,
        itemCount: rowCount,
        aiChanges: {
          transformed: false
        },
        outputUrl: null
      });
      
      res.status(201).json({
        message: 'Feed created successfully',
        id: newFeed.id,
        name,
        marketplace
      });
    } catch (error) {
      console.error('Error creating feed:', error);
      res.status(500).json({ 
        message: 'Error creating feed',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });
  
  // For API integrations
  router.post('/feeds/api', async (req: Request, res: Response) => {
    try {
      const { name, source, marketplace, data } = req.body;
      
      if (!name || !source || !marketplace || !data) {
        return res.status(400).json({ message: 'Missing required fields' });
      }
      
      // Create a new feed
      const newFeed = await storage.createFeed({
        name,
        userId: req.user ? (req.user as any).id || 1 : 1,
        status: 'pending',
        source: 'api',
        sourceDetails: {
          timestamp: new Date(),
          dataLength: data.length
        },
        marketplace,
        itemCount: Array.isArray(data) ? data.length : 0,
        aiChanges: null,
        outputUrl: null
      });
      
      res.status(201).json({
        message: 'Feed created successfully',
        id: newFeed.id
      });
    } catch (error) {
      console.error('Error creating feed:', error);
      res.status(500).json({ message: 'Error creating feed' });
    }
  });
  
  // Process a feed
  router.post('/feeds/:id/process', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: 'Invalid feed ID' });
      }
      
      // Get feed
      const feed = await storage.getFeed(id);
      if (!feed) {
        return res.status(404).json({ message: 'Feed not found' });
      }
      
      // Update feed status
      await storage.updateFeed(id, {
        ...feed,
        status: 'processing'
      });
      
      // Simulate processing (we would call our transformation logic here)
      setTimeout(async () => {
        try {
          // For now, just update the status to completed
          await storage.updateFeed(id, {
            ...feed,
            status: 'completed',
            processedAt: new Date()
          });
        } catch (err) {
          console.error('Error finishing feed processing:', err);
        }
      }, 5000);
      
      res.json({
        message: 'Feed processing started',
        id
      });
    } catch (error) {
      console.error('Error processing feed:', error);
      res.status(500).json({ message: 'Error processing feed' });
    }
  });
  
  // Download a feed
  router.get('/feeds/:id/download', (req: Request, res: Response) => {
    // We will leverage the direct-routes.ts endpoint for this
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: 'Invalid feed ID' });
      }
      
      // Redirect to our reliable download endpoint
      res.redirect(`/api/direct-download/${id}`);
    } catch (error) {
      console.error('Error downloading feed:', error);
      res.status(500).json({ message: 'Error downloading feed' });
    }
  });
  
  // Legacy transform endpoint for compatibility
  // Use transform-direct in direct-routes.ts for more reliable results
  router.post('/transform-direct', upload.single('file'), async (req: Request, res: Response) => {
    // Redirect to our reliable transform endpoint
    res.redirect(307, '/api/transform-direct');
  });
  
  // Legacy download endpoint for compatibility
  router.get('/direct-download/:id', async (req: Request, res: Response) => {
    // Redirect to our reliable download endpoint
    res.redirect(`/api/direct-download/${req.params.id}`);
  });
  
  // Template routes
  router.get('/templates', async (req: Request, res: Response) => {
    try {
      const userId = req.user ? (req.user as any).id : null;
      const templates = await storage.getTemplates(userId);
      res.json(templates);
    } catch (error) {
      console.error('Error fetching templates:', error);
      res.status(500).json({ message: 'Error fetching templates' });
    }
  });
  
  router.get('/templates/:id', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: 'Invalid template ID' });
      }
      
      const template = await storage.getTemplate(id);
      if (!template) {
        return res.status(404).json({ message: 'Template not found' });
      }
      
      res.json(template);
    } catch (error) {
      console.error('Error fetching template:', error);
      res.status(500).json({ message: 'Error fetching template' });
    }
  });
  
  router.post('/templates', async (req: Request, res: Response) => {
    try {
      const { name, marketplace, fieldMappings, description } = req.body;
      
      if (!name || !marketplace || !fieldMappings) {
        return res.status(400).json({ message: 'Missing required fields' });
      }
      
      // Create template
      const template = await storage.createTemplate({
        name,
        userId: req.user ? (req.user as any).id : null,
        marketplace,
        fieldMappings,
        description: description || '',
        isPublic: true,
        usageCount: 0,
        createdAt: new Date()
      });
      
      res.status(201).json(template);
    } catch (error) {
      console.error('Error creating template:', error);
      res.status(500).json({ message: 'Error creating template' });
    }
  });
  
  router.put('/templates/:id', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: 'Invalid template ID' });
      }
      
      const template = await storage.getTemplate(id);
      if (!template) {
        return res.status(404).json({ message: 'Template not found' });
      }
      
      // Update template
      const updatedTemplate = await storage.updateTemplate(id, {
        ...template,
        ...req.body
      });
      
      res.json(updatedTemplate);
    } catch (error) {
      console.error('Error updating template:', error);
      res.status(500).json({ message: 'Error updating template' });
    }
  });
  
  router.delete('/templates/:id', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: 'Invalid template ID' });
      }
      
      const template = await storage.getTemplate(id);
      if (!template) {
        return res.status(404).json({ message: 'Template not found' });
      }
      
      // Delete template
      await storage.deleteTemplate(id);
      
      res.json({ message: 'Template deleted successfully' });
    } catch (error) {
      console.error('Error deleting template:', error);
      res.status(500).json({ message: 'Error deleting template' });
    }
  });
  
  router.post('/templates/:id/use', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: 'Invalid template ID' });
      }
      
      const template = await storage.getTemplate(id);
      if (!template) {
        return res.status(404).json({ message: 'Template not found' });
      }
      
      // Increment usage count
      await storage.updateTemplate(id, {
        ...template,
        usageCount: (template.usageCount || 0) + 1
      });
      
      res.json({ message: 'Template usage recorded successfully' });
    } catch (error) {
      console.error('Error recording template usage:', error);
      res.status(500).json({ message: 'Error recording template usage' });
    }
  });
  
  // GitHub integration routes removed to simplify
  
  // Simple transformation endpoint for backward compatibility with Python/Flask app
  app.post('/api/transform/csv', upload.single('file'), (req: Request, res: Response) => {
    res.redirect(307, '/api/transform-direct');
  });
  
  const httpServer = createServer(app);
  return httpServer;
}