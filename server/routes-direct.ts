import express, { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import exactParser from './utils/exactParser';

// Configure file uploads
const uploadDir = path.join(process.cwd(), 'temp_uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
    cb(null, `${file.fieldname}-${uniqueSuffix}-${file.originalname}`);
  }
});

const upload = multer({ storage });

// Direct transformation router
export function setupDirectRoutes(app: express.Express) {
  // Simple frontend for direct transformation testing
  app.get('/transform-direct', (_req: Request, res: Response) => {
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Direct CSV Transformation</title>
        <style>
          body { font-family: system-ui, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
          h1 { color: #333; margin-bottom: 20px; }
          .form-group { margin-bottom: 15px; }
          label { display: block; margin-bottom: 5px; font-weight: bold; }
          select, input[type="file"], input[type="text"] { width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; }
          button { background: #0070f3; color: white; border: none; padding: 10px 15px; border-radius: 4px; cursor: pointer; }
          .result { margin-top: 20px; padding: 15px; border: 1px solid #ddd; border-radius: 4px; display: none; }
          .error { color: red; }
          .success { color: green; }
          .stats { margin-top: 15px; font-size: 14px; background: #f7f7f7; padding: 10px; border-radius: 4px; }
        </style>
      </head>
      <body>
        <h1>Direct CSV Transformation</h1>
        <p>This utility transforms CSV files with guaranteed 1:1 row mapping between input and output.</p>
        
        <form id="transform-form" enctype="multipart/form-data">
          <div class="form-group">
            <label for="file">Select CSV File</label>
            <input type="file" id="file" name="file" accept=".csv" required>
          </div>
          
          <div class="form-group">
            <label for="name">Transformation Name</label>
            <input type="text" id="name" name="name" placeholder="My Transformation">
          </div>
          
          <div class="form-group">
            <label for="marketplace">Target Marketplace</label>
            <select id="marketplace" name="marketplace" required>
              <option value="amazon">Amazon</option>
              <option value="walmart">Walmart</option>
              <option value="catch">Catch</option>
              <option value="meta">Meta</option>
              <option value="tiktok">TikTok</option>
              <option value="reebelo">Reebelo</option>
            </select>
          </div>
          
          <button type="submit">Transform CSV</button>
        </form>
        
        <div id="result" class="result">
          <h2>Transformation Result</h2>
          <div id="message"></div>
          
          <div class="stats">
            <div>Source rows: <span id="source-rows">0</span></div>
            <div>Output rows: <span id="output-rows">0</span></div>
            <div>Feed ID: <span id="feed-id">-</span></div>
          </div>
          
          <div id="download-container" style="margin-top: 15px;">
            <a id="download-link" href="#" style="display: none;">
              <button>Download Transformed CSV</button>
            </a>
          </div>
        </div>
        
        <script>
          document.getElementById('transform-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const resultElement = document.getElementById('result');
            const messageElement = document.getElementById('message');
            
            resultElement.style.display = 'block';
            messageElement.innerHTML = '<div>Processing... Please wait.</div>';
            
            const formData = new FormData(e.target);
            
            try {
              const response = await fetch('/api/transform-direct', {
                method: 'POST',
                body: formData
              });
              
              const result = await response.json();
              
              if (response.ok) {
                messageElement.innerHTML = '<div class="success">✅ Transformation successful!</div>';
                
                // Update stats
                document.getElementById('source-rows').textContent = result.sourceRows;
                document.getElementById('output-rows').textContent = result.outputRows;
                document.getElementById('feed-id').textContent = result.feedId;
                
                // Setup download link
                const downloadLink = document.getElementById('download-link');
                downloadLink.href = result.downloadUrl;
                downloadLink.style.display = 'inline-block';
              } else {
                messageElement.innerHTML = '<div class="error">❌ Error: ' + result.message + '</div>';
              }
            } catch (error) {
              console.error('Error:', error);
              messageElement.innerHTML = '<div class="error">❌ Error: ' + error.message + '</div>';
            }
          });
        </script>
      </body>
      </html>
    `);
  });

  // Direct transformation API endpoint
  app.post('/api/transform-direct', upload.single('file'), async (req: Request, res: Response) => {
    try {
      // Validate the request
      if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded' });
      }
      
      const marketplace = (req.body.marketplace || 'amazon').toLowerCase();
      const name = req.body.name || `Transformation ${new Date().toISOString()}`;
      
      console.log(`Starting direct transformation for marketplace: ${marketplace}`);
      console.log(`Input file: ${req.file.path}, size: ${req.file.size} bytes`);
      
      // Count rows in the input file
      const sourceRowsInfo = exactParser.countExactRows(req.file.path);
      console.log('Source file rows:', sourceRowsInfo);
      
      // Generate output path
      const outputFileName = `${marketplace}_${Date.now()}_${path.basename(req.file.originalname)}`;
      const outputFilePath = path.join(uploadDir, outputFileName);
      
      // Perform the transformation with guaranteed 1:1 row mapping
      const transformationResult = exactParser.transformWithExactRowMapping(
        req.file.path, 
        outputFilePath,
        // Simple line by line transformation
        (line, index, isHeader) => {
          // Header transformation - just append marketplace identifier
          if (isHeader) {
            return line + `,marketplace_${marketplace}`;
          }
          
          // Data row transformation - append marketplace name as extra column
          return line + `,${marketplace}`;
        }
      );
      
      console.log('Transformation result:', transformationResult);
      
      if (!transformationResult.success) {
        return res.status(500).json({ 
          message: 'Transformation failed',
          error: transformationResult.error
        });
      }
      
      // Store results in memory for this session (simplified for now)
      const transformationId = Date.now().toString();
      const downloadUrl = `/api/direct-download/${transformationId}`;
      
      // Store the transformation info in memory
      const transformations = (app.locals.transformations = app.locals.transformations || {});
      transformations[transformationId] = {
        outputFilePath,
        marketplace,
        name,
        timestamp: new Date(),
        sourceRows: sourceRowsInfo.dataRows,
        outputRows: transformationResult.outputRows
      };
      
      // Return success with download information
      return res.status(200).json({
        message: 'Transformation successful',
        transformationId,
        downloadUrl,
        sourceRows: sourceRowsInfo.dataRows,
        outputRows: transformationResult.outputRows
      });
    } catch (error) {
      console.error('Error in direct transformation:', error);
      return res.status(500).json({ 
        message: 'Server error during transformation',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });
  
  // Direct download route - much simpler and more reliable
  app.get('/api/direct-download/:id', (req: Request, res: Response) => {
    try {
      const transformationId = req.params.id;
      
      // Get the transformation info from memory
      const transformations = app.locals.transformations || {};
      const transformation = transformations[transformationId];
      
      if (!transformation) {
        console.log(`Transformation not found: ${transformationId}`);
        return res.status(404).json({ message: 'Transformation not found' });
      }
      
      const outputFilePath = transformation.outputFilePath;
      
      // Verify the file exists
      if (!fs.existsSync(outputFilePath)) {
        console.log(`Output file does not exist: ${outputFilePath}`);
        return res.status(404).json({ message: 'Output file not found' });
      }
      
      // Generate a user-friendly filename
      const fileName = `${transformation.marketplace}_${transformation.name.replace(/\s+/g, '_')}.csv`;
      
      // Set headers for file download
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      res.setHeader('Content-Type', 'text/csv');
      
      // Stream the file directly to the response
      fs.createReadStream(outputFilePath).pipe(res);
    } catch (error) {
      console.error('Error in direct download:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });
}