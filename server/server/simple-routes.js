import { Router } from 'express';
import multer from 'multer';
import * as fs from 'fs';
import * as path from 'path';
import { handleProcess } from './utils/transformer';
// Configure paths for ES modules
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
        // Use a placeholder that will be replaced with the actual feed ID
        // The actual feed ID will be generated in the upload process
        const timestamp = Date.now();
        cb(null, `upload_${timestamp}_${file.originalname}`);
    }
});
const upload = multer({
    storage: storage_config,
    limits: {
        fileSize: 50 * 1024 * 1024, // 50MB limit
    }
});
export function createSimpleRoutes() {
    console.log('[DEBUG] createSimpleRoutes called');
    const router = Router();
    // GET endpoint for simple-upload (show upload form)
    router.get('/simple-upload', (req, res) => {
        console.log('[DEBUG] GET /simple-upload endpoint hit');
        res.json({
            message: 'Upload endpoint available',
            method: 'POST',
            description: 'Send multipart form data with file, platform, and email'
        });
    });
    // Create a new feed with reliable row counting
    router.post('/simple-upload', upload.single('file'), async (req, res) => {
        console.log('[DEBUG] /api/simple-upload endpoint HIT');
        console.log('[UPLOAD] Request headers:', req.headers);
        console.log('[UPLOAD] Request body:', req.body);
        try {
            if (!req.file) {
                console.log('[UPLOAD] No file detected in upload request');
                res.status(400).json({ message: 'No file uploaded' });
                console.log('[UPLOAD] Response sent: 400 No file uploaded');
                return;
            }
            // Only allow Walmart marketplace
            const marketplace = (req.body.marketplace || '').toLowerCase();
            if (marketplace !== 'walmart') {
                console.log(`[UPLOAD] Invalid marketplace: ${marketplace}`);
                res.status(400).json({ message: 'Only Walmart marketplace is supported at this time.' });
                return;
            }
            // Generate a feedId
            const feedId = `feed_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
            // Save the uploaded file as temp_uploads/{feedId}.csv
            const tempInputPath = path.join(uploadDir, `${feedId}.csv`);
            fs.writeFileSync(tempInputPath, fs.readFileSync(req.file.path));
            const fileStats = fs.statSync(tempInputPath);
            console.log(`[UPLOAD] File saved as: ${tempInputPath}, size: ${fileStats.size} bytes`);
            // Call advanced Walmart transformation logic
            console.log(`[UPLOAD] Calling handleProcess for feedId: ${feedId}`);
            const fakeReq = { params: { id: feedId }, body: { tier: req.body.tier || 'free' } };
            let transformResult;
            try {
                transformResult = await handleProcess(fakeReq);
                console.log(`[UPLOAD] handleProcess completed for feedId: ${feedId}`);
                if (transformResult && transformResult.category) {
                    console.log(`[UPLOAD] Detected category: ${transformResult.category}`);
                }
                if (transformResult && transformResult.summary) {
                    console.log(`[UPLOAD] Transformation summary:`, transformResult.summary);
                }
            }
            catch (err) {
                console.error('[UPLOAD] Error in handleProcess:', err);
                return res.status(500).json({ message: 'Transformation failed', error: err?.message || String(err) });
            }
            // Return the enriched XLSX file for download
            const outputXlsxPath = path.join('outputs', `${feedId}_output.xlsx`);
            if (!fs.existsSync(outputXlsxPath)) {
                console.error(`[UPLOAD] Output file not found after transformation: ${outputXlsxPath}`);
                return res.status(500).json({ message: 'Output file not found after transformation.' });
            }
            const outputStats = fs.statSync(outputXlsxPath);
            console.log(`[UPLOAD] Output XLSX file ready: ${outputXlsxPath}, size: ${outputStats.size} bytes`);
            // Instead of sending the file, return a JSON response with the download URL
            const downloadUrl = `/api/simple-download/${feedId}`;
            res.json({
                success: true,
                feedId,
                downloadUrl,
                message: 'Transformation complete. Download your file.'
            });
            console.log(`[UPLOAD] JSON response sent for feedId: ${feedId}, downloadUrl: ${downloadUrl}`);
        }
        catch (error) {
            console.error('[UPLOAD] Error creating feed:', error);
            res.status(500).json({
                message: 'Error creating feed',
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            console.log('[UPLOAD] Response sent: 500 Error creating feed');
        }
    });
    // Download endpoint for processed feeds
    router.get('/simple-download/:feedId', async (req, res) => {
        console.log(`[DEBUG] /api/simple-download/:feedId handler reached for feedId: ${req.params.feedId}`);
        const { feedId } = req.params;
        const filePath = path.join('outputs', `${feedId}_output.xlsx`);
        console.log(`[DOWNLOAD] Attempting to download: ${filePath}`);
        if (!fs.existsSync(filePath)) {
            console.log(`[DOWNLOAD] File not found for feedId: ${feedId}, path: ${filePath}`);
            return res.status(404).json({ message: 'File not found' });
        }
        res.setHeader('Content-Disposition', `attachment; filename="${feedId}_output.xlsx"`);
        res.download(filePath, (err) => {
            if (err) {
                console.log(`[DOWNLOAD] Error serving file for feedId: ${feedId}, error:`, err);
            }
            else {
                console.log(`[DOWNLOAD] File served for feedId: ${feedId}, path: ${filePath}`);
            }
        });
    });
    return router;
}
