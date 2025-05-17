import { Express, Request, Response, Router } from "express";
import multer from "multer";
import { createServer, type Server } from "http";
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { storage } from "./storage";
import { transformCSVWithOpenAI } from "./utils/transformer.js";
import { v4 as uuidv4 } from "uuid"; // also required for filenames

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
  app.use("/api", router);

  router.get('/user', async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(200).json({ isAuthenticated: false });
    }

    try {
      const userInfo = (req.user as any);
      const userId = userInfo?.id || userInfo?.claims?.sub || '1';
      const user = await storage.getUser(userId);
      return res.status(200).json({ isAuthenticated: true, user });
    } catch (error) {
      console.error('Error fetching user:', error);
      return res.status(500).json({ message: 'Error fetching user information' });
    }
  });

  router.get('/feeds', async (req, res) => {
    try {
      const userId = req.isAuthenticated() ? (req.user as any).id || '1' : '1';
      // Assuming you want to get all feeds for a user, implement getFeeds in storage if not present
      if (typeof storage.getFeeds === 'function') {
        const feeds = await storage.getFeeds(userId);
        res.json(feeds);
      } else {
        // If only getFeed exists, return an empty array or handle accordingly
        res.json([]);
      }
    } catch (error) {
      console.error('Error fetching feeds:', error);
      res.status(500).json({ message: 'Error fetching feeds' });
    }
  });

  router.get('/feeds/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: 'Invalid feed ID' });

      const feed = await storage.getFeed(id);
      if (!feed) return res.status(404).json({ message: 'Feed not found' });

      res.json(feed);
    } catch (error) {
      console.error('Error fetching feed:', error);
      res.status(500).json({ message: 'Error fetching feed' });
    }
  });

  router.patch('/feeds/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: 'Invalid feed ID' });

      const feed = await storage.getFeed(id);
      if (!feed) return res.status(404).json({ message: 'Feed not found' });

      const updates = req.body;
      Object.keys(updates).forEach(key => {
        if (feed[key] !== undefined && !['id', 'userId', 'source', 'sourceDetails'].includes(key)) {
          feed[key] = updates[key];
        }
      });

      const updatedFeed = await storage.updateFeed(id, feed);
      res.json(updatedFeed);
    } catch (error) {
      console.error('Error updating feed:', error);
      res.status(500).json({ message: 'Error updating feed' });
    }
  });

  router.post('/feeds/upload', upload.single('file'), async (req: Request, res: Response) => {
    try {
      // ✅ FIXED: dynamic import instead of require
      const reliableParser = await import('./utils/reliableParser.js');

      if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded' });
      }

      const name = req.body.name || req.file.originalname.replace(/\.[^/.]+$/, "");
      const marketplace = req.body.marketplace || 'amazon';
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
        aiChanges: { transformed: false },
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

  router.post('/feeds/api', async (req: Request, res: Response) => {
    try {
      const { name, source, marketplace, data } = req.body;
      if (!name || !source || !marketplace || !data) {
        return res.status(400).json({ message: 'Missing required fields' });
      }

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

  router.post('/feeds/:id/process', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: 'Invalid feed ID' });

      const feed = await storage.getFeed(id);
      if (!feed) return res.status(404).json({ message: 'Feed not found' });

      await storage.updateFeed(id, {
  ...feed,
  status: 'completed',
  processedAt: new Date(),
  itemCount: 20, // or actual row count if re-read
  outputUrl: `/static/fake-output-${id}.csv`, // or real path if using OpenAI
  aiChanges: {
    titleOptimized: 14,
    descriptionEnhanced: 10,
    categoryCorrected: 3,
    errorsCorrected: 2
  }
});


// Actually run the transformation
try {
  const result = await transformCSVWithOpenAI(feed.sourceDetails.originalPath, feed.marketplace);

  await storage.updateFeed(id, {
    ...feed,
    status: 'completed',
    itemCount: result.output_rows,
    outputUrl: result.output_file,
    aiChanges: result.aiChanges,
    processedAt: new Date()
  });

  return res.json({ message: "Feed processed successfully", id }); // ✅ added return
} catch (err) {
  console.error("Error during transformation:", err);

  await storage.updateFeed(id, {
    ...feed,
    status: 'failed'
  });

  return res.status(500).json({ message: "Feed processing failed" }); // ✅ added return
}


      res.json({ message: 'Feed processing started', id });
    } catch (error) {
      console.error('Error processing feed:', error);
      res.status(500).json({ message: 'Error processing feed' });
    }
  });

  router.get('/feeds/:id/download', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: 'Invalid feed ID' });

    const feed = await storage.getFeed(id);
    if (!feed || !feed.outputUrl) {
      return res.status(404).json({ message: 'Feed or output not found' });
    }

    const outputPath = path.resolve(feed.outputUrl);

    if (!fs.existsSync(outputPath)) {
      return res.status(404).json({ message: 'Output file missing on disk' });
    }

    return res.download(outputPath, `${feed.name || 'output'}.csv`);
  } catch (error) {
    console.error('Download error:', error);
    return res.status(500).json({ message: 'Download failed' });
  }
});

  router.get('/templates', async (req, res) => {
    try {
      const userId = req.user ? (req.user as any).id : null;
      const templates = await storage.getTemplates(userId);
      res.json(templates);
    } catch (error) {
      console.error('Error fetching templates:', error);
      res.status(500).json({ message: 'Error fetching templates' });
    }
  });

  router.get('/templates/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: 'Invalid template ID' });

      const template = await storage.getTemplate(id);
      if (!template) return res.status(404).json({ message: 'Template not found' });

      res.json(template);
    } catch (error) {
      console.error('Error fetching template:', error);
      res.status(500).json({ message: 'Error fetching template' });
    }
  });

  router.post('/templates', async (req, res) => {
    try {
      const { name, marketplace, fieldMappings, description } = req.body;
      if (!name || !marketplace || !fieldMappings) {
        return res.status(400).json({ message: 'Missing required fields' });
      }

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

  router.put('/templates/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: 'Invalid template ID' });

      const template = await storage.getTemplate(id);
      if (!template) return res.status(404).json({ message: 'Template not found' });

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

  router.delete('/templates/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: 'Invalid template ID' });

      const template = await storage.getTemplate(id);
      if (!template) return res.status(404).json({ message: 'Template not found' });

      await storage.deleteTemplate(id);
      res.json({ message: 'Template deleted successfully' });
    } catch (error) {
      console.error('Error deleting template:', error);
      res.status(500).json({ message: 'Error deleting template' });
    }
  });

  router.post('/templates/:id/use', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: 'Invalid template ID' });

      const template = await storage.getTemplate(id);
      if (!template) return res.status(404).json({ message: 'Template not found' });

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

  app.post('/api/transform/csv', upload.single('file'), (req, res) => {
    res.redirect(307, '/api/transform-direct');
  });

  const httpServer = createServer(app);
  return httpServer;
}
