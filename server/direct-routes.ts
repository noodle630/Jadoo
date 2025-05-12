/**
 * Direct transformation routes with reliable row counting and working download functionality.
 * These routes bypass the complexity of the main application to focus on the core functionality.
 */

import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import * as directFileParser from './directFileParser';

// Setup file upload directory
const uploadDir = path.join(process.cwd(), 'temp_uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + '-' + file.originalname);
  }
});

const upload = multer({ storage });

// Define transformation storage type
interface Transformation {
  inputFile: string;
  outputFile: string;
  name: string;
  marketplace: string;
  timestamp: string;
  sourceRows?: number;
  outputRows?: number;
}

// Define utilities for debugging row count
interface RowCountDebugResult {
  filePath: string;
  fileName: string;
  totalLines: number;
  nonEmptyLines: number;
  headerRow: string;
  dataRows: number;
  columns: string[];
}

interface TransformationsStore {
  [id: string]: Transformation;
}

// We'll use Express.Multer.File type for file uploads
import type { Request, Response } from 'express';

// Create direct transformation router
function setupDirectRoutes(app: express.Application) {
  // Serve the direct transformation page
  app.get('/transform-direct', (req: Request, res: Response) => {
    const filePath = path.join(process.cwd(), 'transform_direct.html');
    if (fs.existsSync(filePath)) {
      console.log(`Serving transform_direct.html from ${filePath}`);
      res.sendFile(filePath);
    } else {
      console.error(`Transform_direct.html not found at ${filePath}`);
      res.status(404).send('Transform page not found');
    }
  });

  // Direct transformation API endpoint
  app.post('/api/direct-transform', upload.single('file'), (req: Request, res: Response) => {
    console.log('Direct transform endpoint received request');
    try {
      // Check if file was uploaded
      if (!req.file) {
        return res.status(400).json({ message: 'No file was uploaded' });
      }

      const inputFile = req.file.path;
      const marketplace = (req.body.marketplace || 'amazon').toLowerCase();
      const name = req.body.name || `Transform_${Date.now()}`;

      console.log(`Processing file: ${inputFile} for ${marketplace} marketplace`);
      
      // Get accurate row counts
      const rowInfo = directFileParser.countExactRows(inputFile);
      console.log('Row information:', rowInfo);
      
      if (!rowInfo.success) {
        return res.status(500).json({ 
          message: 'Failed to analyze file', 
          error: rowInfo.error 
        });
      }
      
      // Generate output filename
      const outputFileName = `${marketplace}_${Date.now()}_${path.basename(req.file.originalname)}`;
      const outputFilePath = path.join(uploadDir, outputFileName);
      
      // Perform transformation with guaranteed 1:1 row mapping
      const transformResult = directFileParser.transformWithExactMapping(
        inputFile,
        outputFilePath,
        // Get marketplace-specific transformation function
        (line: string, index: number, isHeader: boolean) => {
          const fields = isHeader ? [] : line.split(',');
          
          // Transform based on marketplace
          switch(marketplace) {
            case 'amazon':
              if (isHeader) {
                return 'sku,product-id,product-id-type,item-condition,price,quantity';
              } else {
                return `${fields[0]},${fields[0]},ASIN,New,${fields[3]},${fields[4]}`;
              }
            
            case 'walmart':
              if (isHeader) {
                return 'sku,productName,price,inventory';
              } else {
                return `${fields[0]},${fields[1]},${fields[3]},${fields[4]}`;
              }
              
            case 'reebelo':
              if (isHeader) {
                return 'id,title,description,price,stock';
              } else {
                return `${fields[0]},${fields[1]},${fields[2]},${fields[3]},${fields[4]}`;
              }
              
            default:
              // For any other marketplace, just add identifier columns
              if (isHeader) {
                return line + ',marketplace,source_id';
              } else {
                return line + `,${marketplace},${Date.now()}-${index}`;
              }
          }
        }
      );
      
      console.log('Transformation result:', transformResult);
      
      if (!transformResult.success) {
        return res.status(500).json({ 
          message: 'Failed to transform file', 
          error: transformResult.error 
        });
      }
      
      // Store transformation in app memory for download access
      const transformationId = Date.now().toString();
      app.locals.transformations = app.locals.transformations || {};
      app.locals.transformations[transformationId] = {
        inputFile,
        outputFile: outputFilePath,
        name,
        marketplace,
        timestamp: new Date().toISOString(),
        sourceRows: rowInfo.dataRows,
        outputRows: transformResult.outputRows
      };
      
      // Return successful response with download link
      return res.status(200).json({
        message: 'File transformed successfully',
        transformationId,
        name,
        marketplace,
        sourceRows: rowInfo.dataRows,
        outputRows: transformResult.outputRows,
        downloadUrl: `/api/direct-download/${transformationId}`
      });
      
    } catch (error: any) {
      console.error('Error in direct transform:', error);
      return res.status(500).json({ 
        message: 'Server error during transformation', 
        error: error.message 
      });
    }
  });
  
  // Row count debugging endpoint
  app.get('/api/direct-countrows', upload.single('file'), (req: Request, res: Response) => {
    try {
      // Check if file path is provided
      const filePath = req.query.filePath as string;
      
      if (!filePath) {
        return res.status(400).json({ message: 'No file path provided' });
      }
      
      // Check if the file exists
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ message: 'File not found' });
      }
      
      // Get row count info
      const rowInfo = directFileParser.countExactRows(filePath);
      
      if (!rowInfo.success) {
        return res.status(500).json({ 
          message: 'Failed to analyze file', 
          error: rowInfo.error 
        });
      }
      
      // Return detailed information
      return res.status(200).json({
        filePath,
        fileName: path.basename(filePath),
        totalLines: rowInfo.totalLines,
        nonEmptyLines: rowInfo.nonEmptyLines,
        headerRow: rowInfo.headerRow,
        dataRows: rowInfo.dataRows,
        columns: rowInfo.columns
      });
      
    } catch (error: any) {
      console.error('Error in row count:', error);
      return res.status(500).json({ 
        message: 'Server error during row counting', 
        error: error.message || 'Unknown error'
      });
    }
  });
  
  // Direct download endpoint
  app.get('/api/direct-download/:id', (req: Request, res: Response) => {
    try {
      const id = req.params.id;
      console.log(`Download requested for transformation: ${id}`);
      
      // Look up transformation in memory
      const transformations = app.locals.transformations || {};
      const transformation = transformations[id];
      
      if (!transformation) {
        console.log(`Transformation ${id} not found`);
        return res.status(404).json({ message: 'Transformation not found' });
      }
      
      const outputFilePath = transformation.outputFile;
      
      // Verify file exists
      if (!fs.existsSync(outputFilePath)) {
        console.log(`Output file not found: ${outputFilePath}`);
        return res.status(404).json({ message: 'Output file not found' });
      }
      
      // Generate user-friendly filename
      const filename = `${transformation.marketplace}_${transformation.name.replace(/\s+/g, '_')}.csv`;
      
      // Set headers for file download
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Type', 'text/csv');
      
      // Stream file to response
      fs.createReadStream(outputFilePath).pipe(res);
      
    } catch (error: any) {
      console.error('Error in direct download:', error);
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  });
}

export { setupDirectRoutes };