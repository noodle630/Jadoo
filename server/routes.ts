import express, { type Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import multer from "multer";
import path from "path";
import fs from "fs";
import { z } from "zod";
import { v4 as uuidv4 } from 'uuid';
import { insertFeedSchema, insertTemplateSchema, feedStatusEnum, marketplaceEnum, feedSourceEnum } from '@shared/schema';
import { fromZodError } from "zod-validation-error";

// Create a temporary directory for file uploads
const uploadDir = path.resolve("temp_uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Setup multer for file uploads
const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => {
      cb(null, uploadDir);
    },
    filename: (_req, file, cb) => {
      const uniqueName = `${Date.now()}-${uuidv4()}${path.extname(file.originalname)}`;
      cb(null, uniqueName);
    }
  }),
  fileFilter: (_req, file, cb) => {
    // Only accept CSV files
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'));
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  }
});

export async function registerRoutes(app: Express): Promise<Server> {
  const router = express.Router();

  // Get current user (demo implementation)
  router.get('/user', async (_req: Request, res: Response) => {
    try {
      const user = await storage.getUser(1); // Always return the demo user
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      // Don't return the password
      const { password, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
      res.status(500).json({ message: 'Error retrieving user' });
    }
  });

  // Get all feeds for the current user
  router.get('/feeds', async (_req: Request, res: Response) => {
    try {
      const feeds = await storage.getFeedsByUserId(1); // Always use the demo user
      res.json(feeds);
    } catch (error) {
      res.status(500).json({ message: 'Error retrieving feeds' });
    }
  });

  // Get a specific feed
  router.get('/feeds/:id', async (req: Request, res: Response) => {
    try {
      const feedId = parseInt(req.params.id);
      if (isNaN(feedId)) {
        return res.status(400).json({ message: 'Invalid feed ID' });
      }
      
      const feed = await storage.getFeed(feedId);
      if (!feed) {
        return res.status(404).json({ message: 'Feed not found' });
      }
      
      res.json(feed);
    } catch (error) {
      res.status(500).json({ message: 'Error retrieving feed' });
    }
  });

  // Create a new feed - CSV upload
  router.post('/feeds/upload', upload.single('file'), async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded' });
      }

      const feedSchema = z.object({
        name: z.string().min(1),
        marketplace: marketplaceEnum,
      });
      
      const result = feedSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ 
          message: 'Invalid feed data',
          errors: fromZodError(result.error).toString()
        });
      }

      const { name, marketplace } = result.data;
      
      // Create a new feed record
      const newFeed = await storage.createFeed({
        userId: 1, // Always use the demo user
        name,
        source: 'csv',
        sourceDetails: { 
          filename: req.file.originalname,
          path: req.file.path
        },
        marketplace,
        status: 'pending',
        itemCount: 0, // Will be updated after processing
        aiChanges: null,
        outputUrl: null
      });
      
      res.status(201).json(newFeed);
    } catch (error) {
      res.status(500).json({ message: 'Error creating feed' });
    }
  });

  // Create a new feed - API connection
  router.post('/feeds/api', async (req: Request, res: Response) => {
    try {
      const apiSchema = z.object({
        name: z.string().min(1),
        endpoint: z.string().url(),
        authMethod: z.string(),
        authKey: z.string(),
        marketplace: marketplaceEnum,
      });
      
      const result = apiSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ 
          message: 'Invalid API data',
          errors: fromZodError(result.error).toString()
        });
      }

      const { name, endpoint, authMethod, authKey, marketplace } = result.data;
      
      // Create a new feed record
      const newFeed = await storage.createFeed({
        userId: 1, // Always use the demo user
        name,
        source: 'api',
        sourceDetails: { 
          endpoint,
          authMethod,
          authKey
        },
        marketplace,
        status: 'pending',
        itemCount: 0, // Will be updated after processing
        aiChanges: null,
        outputUrl: null
      });
      
      res.status(201).json(newFeed);
    } catch (error) {
      res.status(500).json({ message: 'Error creating API feed' });
    }
  });

  // Process a feed with AI
  router.post('/feeds/:id/process', async (req: Request, res: Response) => {
    try {
      const feedId = parseInt(req.params.id);
      if (isNaN(feedId)) {
        return res.status(400).json({ message: 'Invalid feed ID' });
      }
      
      const feed = await storage.getFeed(feedId);
      if (!feed) {
        return res.status(404).json({ message: 'Feed not found' });
      }
      
      // Update feed status to processing
      await storage.updateFeed(feedId, { status: 'processing' });
      
      // In a real implementation, this would be an async process
      // For demo purposes, we'll simulate AI processing with a timeout
      setTimeout(async () => {
        // Simulate successful processing
        const aiChanges = {
          titleOptimized: Math.floor(Math.random() * 20) + 10,
          categoryCorrected: Math.floor(Math.random() * 10) + 5,
          descriptionEnhanced: Math.floor(Math.random() * 30) + 20,
          pricingFixed: Math.floor(Math.random() * 4)
        };
        
        const itemCount = Math.floor(Math.random() * 100) + 50;
        const outputUrl = `/feeds/${feed.name.toLowerCase().replace(/\s+/g, '-')}.csv`;
        
        await storage.updateFeed(feedId, {
          status: 'completed',
          itemCount,
          aiChanges,
          outputUrl
        });
      }, 3000);
      
      res.json({ message: 'Feed processing started' });
    } catch (error) {
      res.status(500).json({ message: 'Error processing feed' });
    }
  });

  // Get all templates for the current user
  router.get('/templates', async (_req: Request, res: Response) => {
    try {
      const templates = await storage.getTemplatesByUserId(1); // Always use the demo user
      res.json(templates);
    } catch (error) {
      res.status(500).json({ message: 'Error retrieving templates' });
    }
  });

  // Get a specific template
  router.get('/templates/:id', async (req: Request, res: Response) => {
    try {
      const templateId = parseInt(req.params.id);
      if (isNaN(templateId)) {
        return res.status(400).json({ message: 'Invalid template ID' });
      }
      
      const template = await storage.getTemplate(templateId);
      if (!template) {
        return res.status(404).json({ message: 'Template not found' });
      }
      
      res.json(template);
    } catch (error) {
      res.status(500).json({ message: 'Error retrieving template' });
    }
  });

  // Create a new template
  router.post('/templates', async (req: Request, res: Response) => {
    try {
      const result = insertTemplateSchema.safeParse({
        ...req.body,
        userId: 1 // Always use the demo user
      });
      
      if (!result.success) {
        return res.status(400).json({ 
          message: 'Invalid template data',
          errors: fromZodError(result.error).toString()
        });
      }
      
      const newTemplate = await storage.createTemplate(result.data);
      res.status(201).json(newTemplate);
    } catch (error) {
      res.status(500).json({ message: 'Error creating template' });
    }
  });

  // Update a template
  router.put('/templates/:id', async (req: Request, res: Response) => {
    try {
      const templateId = parseInt(req.params.id);
      if (isNaN(templateId)) {
        return res.status(400).json({ message: 'Invalid template ID' });
      }
      
      const template = await storage.getTemplate(templateId);
      if (!template) {
        return res.status(404).json({ message: 'Template not found' });
      }
      
      const updatedTemplate = await storage.updateTemplate(templateId, req.body);
      res.json(updatedTemplate);
    } catch (error) {
      res.status(500).json({ message: 'Error updating template' });
    }
  });

  // Delete a template
  router.delete('/templates/:id', async (req: Request, res: Response) => {
    try {
      const templateId = parseInt(req.params.id);
      if (isNaN(templateId)) {
        return res.status(400).json({ message: 'Invalid template ID' });
      }
      
      const template = await storage.getTemplate(templateId);
      if (!template) {
        return res.status(404).json({ message: 'Template not found' });
      }
      
      await storage.deleteTemplate(templateId);
      res.json({ message: 'Template deleted successfully' });
    } catch (error) {
      res.status(500).json({ message: 'Error deleting template' });
    }
  });

  // Use template for a feed
  router.post('/templates/:id/use', async (req: Request, res: Response) => {
    try {
      const templateId = parseInt(req.params.id);
      if (isNaN(templateId)) {
        return res.status(400).json({ message: 'Invalid template ID' });
      }
      
      const template = await storage.getTemplate(templateId);
      if (!template) {
        return res.status(404).json({ message: 'Template not found' });
      }
      
      await storage.incrementTemplateUsage(templateId);
      
      res.json({ message: 'Template usage recorded' });
    } catch (error) {
      res.status(500).json({ message: 'Error using template' });
    }
  });

  // Use main route prefix
  app.use('/api', router);

  const httpServer = createServer(app);
  return httpServer;
}
