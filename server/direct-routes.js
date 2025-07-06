var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import multer from 'multer';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { storage } from './storage';
import reliableParser from './utils/reliableParser';
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
export function setupDirectRoutes(app) {
    // Direct transform endpoint
    app.post('/api/transform-direct', upload.single('file'), (req, res) => __awaiter(this, void 0, void 0, function* () {
        console.log("Direct transform request received");
        try {
            if (!req.file) {
                console.log("No file detected in upload request");
                return res.status(400).json({ message: 'No file uploaded' });
            }
            console.log(`File uploaded: ${req.file.originalname}, size: ${req.file.size}, path: ${req.file.path}`);
            // Get form data
            let name = req.body.name || req.file.originalname.replace(/\.[^/.]+$/, "");
            let marketplace = req.body.marketplace || 'amazon';
            // Count rows reliably
            const countResult = reliableParser.countCSVRows(req.file.path);
            console.log('CSV row count results:', countResult);
            const rowCount = countResult.success ? countResult.dataRows : 0;
            console.log(`Row count: ${rowCount} data rows`);
            // Generate output file path
            const outputFileName = `${marketplace}_${Date.now()}_${path.basename(req.file.originalname)}`;
            const outputFilePath = path.join(uploadDir, outputFileName);
            // Transform to target format
            console.log(`Transforming to ${marketplace} format, output path: ${outputFilePath}`);
            const transformResult = yield reliableParser.transformToMarketplace(req.file.path, outputFilePath, marketplace);
            console.log('Transformation result:', transformResult);
            if (!transformResult.success) {
                return res.status(500).json({
                    message: 'Transform failed',
                    error: transformResult.error
                });
            }
            // Create feed record
            const feed = yield storage.createFeed({
                name,
                userId: req.user ? req.user.id || 1 : 1,
                status: 'completed',
                source: 'upload',
                sourceDetails: {
                    originalName: req.file.originalname,
                    originalPath: req.file.path,
                    size: req.file.size,
                    outputPath: outputFilePath
                },
                marketplace,
                itemCount: transformResult.inputRows || 0,
                aiChanges: {
                    transformed: true,
                    rowCount: transformResult.inputRows || 0
                },
                outputUrl: outputFilePath
            });
            return res.status(201).json({
                message: 'Feed created successfully',
                id: feed.id,
                name,
                marketplace,
                rowCount: transformResult.inputRows || 0,
                downloadUrl: `/api/direct-download/${feed.id}`
            });
        }
        catch (error) {
            console.error('Error creating feed:', error);
            return res.status(500).json({
                message: 'Error creating feed',
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }));
    // Direct download endpoint
    app.get('/api/direct-download/:id', (req, res) => __awaiter(this, void 0, void 0, function* () {
        try {
            const feedId = parseInt(req.params.id);
            if (isNaN(feedId)) {
                return res.status(400).json({ message: 'Invalid feed ID' });
            }
            // Get feed
            const feed = yield storage.getFeed(feedId);
            if (!feed) {
                return res.status(404).json({ message: 'Feed not found' });
            }
            // Get file path
            let filePath = '';
            if (feed.outputUrl) {
                filePath = feed.outputUrl;
            }
            else if (feed.sourceDetails && typeof feed.sourceDetails === 'object') {
                const details = feed.sourceDetails;
                if (details.outputPath) {
                    filePath = details.outputPath;
                }
                else if (details.output) {
                    filePath = details.output;
                }
            }
            console.log(`Attempting to download file from path: ${filePath}`);
            // Check if file exists
            if (!filePath || !fs.existsSync(filePath)) {
                return res.status(404).json({ message: 'Output file not found' });
            }
            // Create a friendly filename
            const fileName = `${feed.marketplace}_${feed.name.replace(/\s+/g, '_')}.csv`;
            // Set headers for download
            res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
            res.setHeader('Content-Type', 'text/csv');
            // Stream the file directly
            const fileStream = fs.createReadStream(filePath);
            fileStream.pipe(res);
        }
        catch (error) {
            console.error('Error downloading file:', error);
            return res.status(500).json({
                message: 'Error downloading file',
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }));
}
