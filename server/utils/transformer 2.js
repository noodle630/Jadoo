import * as fs from "fs";
import * as path from "path";
import Papa from "papaparse";
import ExcelJS from "exceljs";
import supabase from "../../supabaseClient.js";
import openai from "../../openaiClient.js";
import * as winston from "winston";
import stringSimilarity from "string-similarity";
import * as crypto from "crypto";
// @ts-ignore
import llmCache from "./llm-cache.js";
// @ts-ignore
import { logPerformance, logError } from "../logger.js";
// Configure structured logging with reduced verbosity
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(winston.format.timestamp(), winston.format.errors({ stack: true }), winston.format.json()),
    defaultMeta: { service: 'transformer' },
    transports: [
        new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
        new winston.transports.File({ filename: 'logs/combined.log' }),
        new winston.transports.Console({
            format: winston.format.combine(winston.format.colorize(), winston.format.printf(({ timestamp, level, message, ...meta }) => {
                const msg = typeof message === 'string' ? message : String(message);
                // Only log important messages to console, reduce noise
                if (level === 'error' || level === 'warn' ||
                    msg.includes('Starting') || msg.includes('completed') ||
                    msg.includes('failed') || msg.includes('cache')) {
                    return `${timestamp} [${level}]: ${msg} ${Object.keys(meta).length ? JSON.stringify(meta) : ''}`;
                }
                return '';
            }))
        })
    ]
});
// Ensure logs directory exists
if (!fs.existsSync('logs')) {
    fs.mkdirSync('logs');
}
// ===== CACHING SYSTEM =====
// In-memory cache for LLM results
const llmCacheMemory = new Map();
const templateCache = new Map();
const groundingCache = new Map();
const headerMappingCache = new Map();
// Cache key generator for LLM calls
function generateCacheKey(input, context) {
    return crypto.createHash('md5').update(`${input || ''}:${context || ''}`).digest('hex');
}
// Cache management
function getCachedResult(key) {
    return llmCacheMemory.get(key) || null;
}
function setCachedResult(key, result) {
    llmCacheMemory.set(key, result);
    // Limit cache size to prevent memory issues
    if (llmCacheMemory.size > 1000) {
        const firstKey = llmCacheMemory.keys().next().value;
        llmCacheMemory.delete(firstKey || '');
    }
}
// Preload static data at startup
async function preloadStaticData(groundingRoot, templateRoot) {
    logger.info('Preloading static data for caching');
    try {
        // Always cache the base template first
        const safeTemplateRoot = templateRoot || "attached_assets/templates/walmart";
        const baseTemplatePath = path.join(safeTemplateRoot, "base.xlsx");
        if (!templateCache.has('base') && fs.existsSync(baseTemplatePath)) {
            const workbook = new ExcelJS.Workbook();
            await workbook.xlsx.readFile(baseTemplatePath);
            templateCache.set('base', workbook);
            logger.info('Cached base template');
        }
        // Cache all template files
        const categories = fs.readdirSync(groundingRoot).filter((cat) => fs.statSync(path.join(groundingRoot, String(cat))).isDirectory());
        for (const category of categories) {
            // Cache template
            const safeCategory = typeof category === 'string' ? category : 'unknown';
            const templatePath = path.join(safeTemplateRoot, `${safeCategory}.xlsx`);
            const xlsxToUse = fs.existsSync(templatePath) ? templatePath : baseTemplatePath;
            if (!templateCache.has(category)) {
                const workbook = new ExcelJS.Workbook();
                await workbook.xlsx.readFile(xlsxToUse);
                templateCache.set(category, workbook);
                logger.info('Cached template', { category });
            }
            // Cache grounding examples
            const groundingPath = path.join(groundingRoot, safeCategory, "sample_vendor_feed.xlsx");
            if (fs.existsSync(groundingPath) && !groundingCache.has(category)) {
                const groundingWorkbook = new ExcelJS.Workbook();
                await groundingWorkbook.xlsx.readFile(groundingPath);
                groundingCache.set(category, groundingWorkbook);
                logger.info('Cached grounding examples', { category });
            }
        }
        logger.info('Static data preloading completed', {
            templates: templateCache.size,
            grounding: groundingCache.size
        });
    }
    catch (error) {
        logger.warn('Static data preloading failed', { error: error instanceof Error ? error.message : error });
    }
}
// TODO: Cache template header mappings for each template file to avoid recomputing every time.
function normalizeHeader(header) {
    return header.replace(/[_\s]/g, '').toLowerCase();
}
// --- Attribute extraction utility ---
function extractAttributes(row) {
    const attrs = {};
    const title = row['Product Name'] || row['productName'] || row['Title'] || '';
    // Color
    const colorMatch = title.match(/\b(Black|White|Green|Blue|Red|Yellow|Pink|Gold|Silver|Gray|Jade)\b/i);
    if (colorMatch)
        attrs['Color'] = colorMatch[0];
    // Storage
    const storageMatch = title.match(/(\d{2,4}GB|\d{1,2}TB)/i);
    if (storageMatch)
        attrs['Storage Capacity'] = storageMatch[0];
    // Carrier
    const carrierMatch = title.match(/(T-Mobile|Verizon|AT&T|Unlocked|Sprint)/i);
    if (carrierMatch)
        attrs['Carrier'] = carrierMatch[0];
    // Condition
    const condMatch = title.match(/(Excellent|Good|Premium|Acceptable|New|Refurbished|Used)/i);
    if (condMatch)
        attrs['Condition'] = condMatch[0];
    // Model Name
    const modelMatch = title.match(/Galaxy S\d{2,}/i);
    if (modelMatch)
        attrs['Model Name'] = modelMatch[0];
    // Model Number (if present)
    if (row['Model Number'])
        attrs['Model Number'] = row['Model Number'];
    // Quantity
    if (row['Quantity'])
        attrs['Quantity'] = row['Quantity'];
    // Brand
    if (row['Brand Name'])
        attrs['Brand Name'] = row['Brand Name'];
    // SKU
    if (row['SKU'])
        attrs['SKU'] = row['SKU'];
    return attrs;
}
// Function to strip markdown code blocks from LLM responses
function stripMarkdownCodeBlocks(response) {
    if (!response)
        return '';
    // Remove ```json ... ``` or ``` ... ``` wrappers
    let cleaned = response.trim();
    if (cleaned.startsWith('```json')) {
        cleaned = cleaned.substring(7);
    }
    else if (cleaned.startsWith('```')) {
        cleaned = cleaned.substring(3);
    }
    if (cleaned.endsWith('```')) {
        cleaned = cleaned.substring(0, cleaned.length - 3);
    }
    return cleaned.trim();
}
// Enhanced LLM call with caching and retry
async function cachedLLMCall(prompt, context, options = {}) {
    const cacheKey = generateCacheKey(prompt || '', context || '');
    const cached = getCachedResult(cacheKey);
    if (cached) {
        logger.info('LLM cache hit', { context });
        return cached;
    }
    logger.info('LLM cache miss, making API call', { context, prompt });
    try {
        // Use the new LLM cache system with retry logic
        const result = await llmCache.callWithCache(openai, prompt, {
            model: options.model || "gpt-4o-mini",
            temperature: options.temperature || 0.1,
            max_tokens: options.max_tokens || 1000,
            ...options
        });
        setCachedResult(cacheKey, result);
        return result;
    }
    catch (error) {
        logError(error, { context: 'cachedLLMCall', prompt: prompt.substring(0, 100) });
        throw error;
    }
}
// Process rows in parallel with controlled concurrency
async function processRowsInParallel(rows, processor, concurrency = 4) {
    const results = [];
    const chunks = chunkArray(rows, concurrency);
    for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        const chunkStartTime = Date.now();
        // Process chunk in parallel
        const chunkPromises = chunk.map(async (row, index) => {
            const rowStartTime = Date.now();
            try {
                const result = await processor(row, i * concurrency + index);
                const rowTime = Date.now() - rowStartTime;
                logPerformance('row_process', rowTime, { rowIndex: i * concurrency + index });
                return result;
            }
            catch (error) {
                logError(error, { context: 'row_process', rowIndex: i * concurrency + index });
                return {
                    row_number: i * concurrency + index + 1,
                    status: "ERROR",
                    row_confidence: "red",
                    original_data: row,
                    transformed_data: {},
                    error_message: error instanceof Error ? error.message : 'Unknown error',
                    processing_time_ms: Date.now() - rowStartTime,
                    retry_count: 0
                };
            }
        });
        const chunkResults = await Promise.allSettled(chunkPromises);
        const chunkTime = Date.now() - chunkStartTime;
        logPerformance('chunk_process', chunkTime, { chunkIndex: i, chunkSize: chunk.length });
        // Handle results
        chunkResults.forEach((result, index) => {
            if (result.status === 'fulfilled') {
                results.push(result.value);
            }
            else {
                // Handle rejected promises
                results.push({
                    row_number: i * concurrency + index + 1,
                    status: "ERROR",
                    row_confidence: "red",
                    original_data: chunk[index],
                    transformed_data: {},
                    error_message: result.reason?.message || 'Promise rejected',
                    processing_time_ms: 0,
                    retry_count: 0
                });
            }
        });
        logger.info(`Processed chunk ${i + 1}/${chunks.length}`, {
            chunkSize: chunk.length,
            chunkTime,
            totalProcessed: results.length
        });
    }
    return results;
}
// List of non-enrichable/system fields to skip LLM calls
const NON_ENRICHABLE_FIELDS = [
    'SKU', 'Spec Product Type', 'Product ID Type', 'Product ID', 'Condition', 'Your SKU',
    'Reebelo RID', 'SKU Condition', 'SKU Battery Health', 'Min Price', 'Quantity', 'Price',
    'MSRP', 'SKU Update', 'Product Id Update', 'External Product ID', 'External Product ID Type',
    'Variant Group ID', 'Variant Attribute Names (+)', 'Is Primary Variant', 'Swatch Image URL',
    'Swatch Variant Attribute', 'States', 'State Restrictions Reason', 'ZIP Codes',
    'Product is or Contains an Electronic Component?', 'Product is or Contains a Chemical, Aerosol or Pesticide?',
    'Product is or Contains this Battery Type', 'Fulfillment Lag Time', 'Ships in Original Packaging',
    'Must ship alone?', 'Is Preorder', 'Release Date', 'Site Start Date', 'Site End Date',
    'Inventory', 'Fulfillment Center ID', 'Pre Order Available On',
    'Third Party Accreditation Symbol on Product Package Code (+)', 'Total Count',
    'Virtual Assistant (+)', 'Warranty Text', 'Warranty URL'
];
const PARALLEL_LLM_CONCURRENCY = 5; // Configurable concurrency
const KEY_FIELDS = ['SKU', 'Price', 'Brand Name', 'Product Name', 'Manufacturer Name'];
// --- OPTIMIZED LLM CONCURRENCY ---
const LLM_CONCURRENCY = 10; // Increased concurrency for faster processing
// --- AGGRESSIVE CACHING ---
const enrichmentCache = new Map();
// Placeholder for callLLM if not defined
async function callLLM(prompt, row, tier) {
    // Implement or import your LLM call logic here
    return {};
}
async function enrichRowWithLLM(row, prompt, tier) {
    const cacheKey = JSON.stringify({ row, prompt, tier });
    if (enrichmentCache.has(cacheKey)) {
        return enrichmentCache.get(cacheKey);
    }
    let result, confidence = 0;
    let retries = 0;
    while (retries < 2) {
        try {
            result = await callLLM(prompt, row, tier);
            confidence = result.confidence || 0;
            if (confidence > 0.5)
                break;
        }
        catch (e) {
            retries++;
            if (retries >= 2)
                throw e;
        }
    }
    enrichmentCache.set(cacheKey, result);
    return result;
}
// --- FIELD-LEVEL FALLBACK ---
async function enrichKeyField(row, field, prompt, tier) {
    let value = row[field];
    if (!value) {
        const fallbackPrompt = `${prompt}\nFocus on filling the ${field} field with high accuracy.`;
        const result = await enrichRowWithLLM(row, fallbackPrompt, tier);
        value = result[field] || '';
    }
    return value;
}
// --- TIER-BASED ENRICHMENT CONFIGURATION ---
const TIER_CONFIG = {
    free: {
        maxRows: 10,
        fillPercentage: 0.3, // 30% of fields filled
        model: "gpt-4o-mini",
        dataQuality: "basic", // Basic product info only
        features: ["Product Name", "Brand Name", "Price", "SKU"]
    },
    basic: {
        maxRows: 100,
        fillPercentage: 0.6, // 60% of fields filled
        model: "gpt-4o-mini",
        dataQuality: "standard", // Standard marketplace optimization
        features: ["Product Name", "Brand Name", "Price", "SKU", "Description", "Key Features", "Color", "Size"]
    },
    premium: {
        maxRows: 1000,
        fillPercentage: 0.9, // 90% of fields filled
        model: "gpt-4o",
        dataQuality: "premium", // SEO optimized, branded, search-friendly
        features: ["Product Name", "Brand Name", "Price", "SKU", "Description", "Key Features", "Color", "Size", "Specifications", "SEO Keywords", "Category Optimization"]
    }
};
// --- Tier-based, template-aware column fill and color coding ---
// Add to the main enrichment/output logic:
// 1. Define tier rules
const TIER_RULES = {
    essential: {
        always: ["Product Name", "Brand Name", "SKU", "Price"],
        ai: ["Description"],
        skip: ["Image URL", "SEO Title", "Key Features", "Color", "Size", "Condition", "Category"],
        min_confidence: 0.9,
    },
    pro: {
        always: ["Product Name", "Brand Name", "SKU", "Price", "SEO Title", "Key Features", "Main Image URL", "Color", "Size", "Condition", "Category"],
        ai: ["Description", "SEO Title", "Key Features", "Color", "Size", "Condition", "Category"],
        skip: ["All Image URLs", "Bullet Points", "Compliance", "Shipping Weight", "MSRP", "Material", "Gender"],
        min_confidence: 0.6,
    },
    enterprise: {
        always: "*", // All fields
        ai: "*", // All fields
        skip: [],
        min_confidence: 0.0,
    },
};
// 2. In the row enrichment loop, for each column:
// - If tier is essential, only fill if in always/ai and confidence >= min_confidence
// - If pro, fill if in always/ai and confidence >= min_confidence
// - If enterprise, fill all, log confidence
// - Color code cell: green >90%, yellow 60-89%, red <60%
// 3. When writing to Excel, use ExcelJS to set cell fill color based on confidence
// Example:
// cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF00FF00' } } // green
// ... yellow: 'FFFFFF00', red: 'FFFF0000'
// 4. Do NOT add summary sheets or extra text. Only color code cells.
// Walmart transformer: robust, .xlsx-only, future-proof
// NOTE: For Walmart, we require .xlsx templates and a specific worksheet/row structure.
// If generalizing for other platforms, detect template extension and structure dynamically.
export const handleProcess = async (req, res, tier = 'free') => {
    const startTime = Date.now();
    const id = req.params.id;
    const uploadPath = path.join("temp_uploads", String(id) + ".csv");
    const groundingRoot = "grounding/walmart";
    const templateRoot = "attached_assets/templates/walmart";
    // Always output .xlsx for Walmart
    const outputPath = path.join("outputs", `${id}_output.xlsx`);
    logger.info('Starting Walmart transformation', { id });
    try {
        // Preload static data if not already cached
        if (templateCache.size === 0) {
            await preloadStaticData(groundingRoot, templateRoot);
        }
        // Validate input file exists
        if (!fs.existsSync(uploadPath)) {
            throw new Error(`Input file not found: ${uploadPath}`);
        }
        // Load and parse CSV
        const csvData = fs.readFileSync(uploadPath, "utf8");
        let { data: rows, errors: parseErrors } = Papa.parse(csvData, {
            header: true,
            skipEmptyLines: true,
            transformHeader: (header) => header.trim()
        });
        if (parseErrors.length > 0) {
            logger.warn('CSV parse warnings', { errors: parseErrors });
        }
        // Robust CSV parsing: check for single-string header
        if (rows.length > 0 && typeof Object.keys(rows[0])[0] === 'string' && Object.keys(rows[0]).length === 1) {
            logger.warn('CSV parsed as single column, attempting manual split');
            // Try to re-parse with header: false
            const { data: rawRows } = Papa.parse(csvData, { header: false, skipEmptyLines: true });
            if (Array.isArray(rawRows) && rawRows.length > 1 && Array.isArray(rawRows[0])) {
                const headerLine = rawRows[0][0];
                const headers = headerLine.split(",").map((h) => h.trim());
                rows = rawRows.slice(1).map((row) => {
                    const values = (row[0] || '').split(",");
                    const obj = {};
                    headers.forEach((h, i) => { obj[h] = values[i] || ""; });
                    return obj;
                });
            }
        }
        logger.info('CSV loaded successfully', { rowCount: rows.length });
        // --- Category detection with caching ---
        const category = await detectCategory(rows, groundingRoot);
        logger.info('Category detected', { category });
        // --- Load template and field definitions with caching ---
        const { templateKeys, fieldDefinitions } = await loadTemplateAndFields(category, groundingRoot);
        logger.info('Template loaded', { fieldCount: templateKeys.length });
        // --- Extract output columns from cached template ---
        const cachedTemplate = templateCache.get(category);
        if (!cachedTemplate) {
            throw new Error(`Template not found in cache for category: ${category}`);
        }
        // Walmart: always use 'Product Content And Site Exp' worksheet, row 3 for columns
        const worksheet = cachedTemplate.getWorksheet("Product Content And Site Exp");
        if (!worksheet)
            throw new Error("Worksheet 'Product Content And Site Exp' not found in template XLSX");
        let outputColumns = [];
        const row3 = worksheet.getRow(3).values;
        if (Array.isArray(row3)) {
            outputColumns = row3
                .slice(1)
                .map((v) => (v === undefined || v === null ? '' : String(v).trim()));
            outputColumns = outputColumns.filter((v) => typeof v === 'string' && v.length > 0);
        }
        else {
            throw new Error('Template row 3 is not an array');
        }
        // --- LLM-driven key seller data detection with caching ---
        const inputHeaders = Object.keys(rows[0] || {});
        const sampleRows = rows.slice(0, 10);
        const keySellerDataPrompt = `Given the following input headers and sample rows, classify each column as either 'key seller data' (must be preserved as-is) or 'optimizable' (can be AI-enriched for the target marketplace). For each, provide a confidence score (0-1) and a short reason. Return a JSON object with two arrays: keySellerData and optimizableData, each with objects {column, confidence, reason}.\n\nHeaders: ${JSON.stringify(inputHeaders)}\nSample rows: ${JSON.stringify(sampleRows.slice(0, 5))}`;
        const keySellerDataResp = await cachedLLMCall(keySellerDataPrompt, 'key_seller_data_detection', { model: 'gpt-4o', systemPrompt: 'You are a product data transformation expert.' });
        let keySellerDataResult = {};
        try {
            const cleanedResponse = stripMarkdownCodeBlocks(keySellerDataResp);
            keySellerDataResult = JSON.parse(cleanedResponse);
        }
        catch (e) {
            logger.warn('Failed to parse key seller data response', { error: e });
            keySellerDataResult = { keySellerData: [], optimizableData: [] };
        }
        // Trim and normalize all input headers and output columns
        const trimmedInputHeaders = inputHeaders.map(h => h.trim());
        const trimmedOutputColumns = outputColumns.map(h => h.trim());
        const normalizedInputHeaders = trimmedInputHeaders.map(h => normalizeHeader(h));
        const normalizedOutputColumns = trimmedOutputColumns.map(h => normalizeHeader(h));
        logger.info('Trimmed input headers:', { trimmedInputHeaders });
        logger.info('Trimmed output columns:', { trimmedOutputColumns });
        logger.info('Normalized input headers:', { normalizedInputHeaders });
        logger.info('Normalized output columns:', { normalizedOutputColumns });
        // Robust header mapping: direct, normalized, then fuzzy (string similarity)
        const headerMapping = {};
        trimmedOutputColumns.forEach((col, idx) => {
            const normCol = normalizedOutputColumns[idx];
            // Enhanced mapping strategies
            let inputIdx = -1;
            // 1. Direct match (case-insensitive)
            inputIdx = trimmedInputHeaders.findIndex(h => h.toLowerCase() === col.toLowerCase());
            if (inputIdx !== -1) {
                headerMapping[col] = trimmedInputHeaders[inputIdx];
                logger.info(`Header mapping [direct]: '${col}' -> '${trimmedInputHeaders[inputIdx]}'`);
                return;
            }
            // 2. Normalized match
            inputIdx = normalizedInputHeaders.findIndex(h => h === normCol);
            if (inputIdx !== -1) {
                headerMapping[col] = trimmedInputHeaders[inputIdx];
                logger.info(`Header mapping [normalized]: '${col}' -> '${trimmedInputHeaders[inputIdx]}'`);
                return;
            }
            // 3. Common field variations mapping
            const commonVariations = {
                'Product Name': ['name', 'product', 'title', 'product_name', 'productname', 'item_name', 'itemname'],
                'Brand Name': ['brand', 'brand_name', 'brandname', 'manufacturer', 'make', 'company'],
                'SKU': ['sku', 'product_id', 'productid', 'item_id', 'itemid', 'code', 'product_code', 'productcode'],
                'Selling Price': ['price', 'cost', 'selling_price', 'sellingprice', 'retail_price', 'retailprice', 'amount'],
                'Site Description': ['description', 'desc', 'product_description', 'productdesc', 'details', 'summary'],
                'Color': ['color', 'colour', 'color_name', 'colorname'],
                'Size': ['size', 'dimensions', 'measurements', 'width', 'height', 'length'],
                'Manufacturer Name': ['manufacturer', 'manufacturer_name', 'manufacturername', 'brand', 'make'],
                'Model Number': ['model', 'model_number', 'modelnumber', 'model_id', 'modelid'],
                'Main Image URL': ['image', 'image_url', 'imageurl', 'photo', 'picture', 'img', 'main_image', 'mainimage']
            };
            const variations = commonVariations[col];
            if (variations) {
                for (const variation of variations) {
                    inputIdx = trimmedInputHeaders.findIndex(h => h.toLowerCase().includes(variation.toLowerCase()));
                    if (inputIdx !== -1) {
                        headerMapping[col] = trimmedInputHeaders[inputIdx];
                        logger.info(`Header mapping [variation]: '${col}' -> '${trimmedInputHeaders[inputIdx]}' (via '${variation}')`);
                        return;
                    }
                }
            }
            // 4. Partial match (contains)
            inputIdx = trimmedInputHeaders.findIndex(h => h.toLowerCase().includes(col.toLowerCase()) ||
                col.toLowerCase().includes(h.toLowerCase()));
            if (inputIdx !== -1) {
                headerMapping[col] = trimmedInputHeaders[inputIdx];
                logger.info(`Header mapping [partial]: '${col}' -> '${trimmedInputHeaders[inputIdx]}'`);
                return;
            }
            // 5. Fuzzy match (string similarity) - increased threshold
            const { bestMatch } = stringSimilarity.findBestMatch(col, trimmedInputHeaders);
            if (bestMatch.rating > 0.6) { // Lowered threshold for better matching
                headerMapping[col] = bestMatch.target;
                logger.info(`Header mapping [fuzzy]: '${col}' -> '${bestMatch.target}' (score: ${bestMatch.rating})`);
                return;
            }
            // 6. No match found
            headerMapping[col] = '';
            logger.warn(`Header mapping [unmapped]: '${col}' -> ''`);
        });
        logger.info('Final header mapping:', { headerMapping });
        // --- Initialize output rows with mapped data ---
        const outputRows = rows.map((row, index) => {
            const outputRow = {};
            trimmedOutputColumns.forEach((col) => {
                const mappedInputCol = headerMapping[col];
                // Always preserve key fields if present in input
                if (KEY_FIELDS.includes(col) && row[col]) {
                    outputRow[col] = row[col];
                }
                else if (mappedInputCol && row[mappedInputCol]) {
                    outputRow[col] = row[mappedInputCol];
                }
                else {
                    outputRow[col] = "";
                }
            });
            return outputRow;
        });
        logger.info('Sample output row:', { row: outputRows[0] });
        logger.info('All output rows:', { outputRows });
        // Do NOT abort if some columns are unmapped—always produce output
        // --- CORRECTED ROW COUNTING (exclude template headers) ---
        const actualProductRows = outputRows.filter(row => {
            // Filter out template header rows (rows with mostly empty values or template placeholders)
            const hasProductData = row['Product Name'] && row['Product Name'].trim() !== '';
            const hasDescription = row['Site Description'] && row['Site Description'].trim() !== '';
            return hasProductData || hasDescription;
        });
        const actualRowCount = actualProductRows.length;
        logger.info('Row counting corrected', {
            totalRows: outputRows.length,
            actualProductRows: actualRowCount,
            templateHeaders: outputRows.length - actualRowCount
        });
        // --- TIER-BASED ENRICHMENT ---
        const tierConfig = TIER_CONFIG[tier] || TIER_CONFIG.free;
        if (!tierConfig) {
            throw new Error(`Invalid tier: ${tier}`);
        }
        // Apply tier limits
        if (actualRowCount > tierConfig.maxRows) {
            logger.warn(`Row count ${actualRowCount} exceeds tier limit ${tierConfig.maxRows}, truncating`);
            outputRows.splice(tierConfig.maxRows);
        }
        logger.info('Starting tier-based parallel LLM enrichment', {
            tier,
            maxRows: tierConfig.maxRows,
            fillPercentage: tierConfig.fillPercentage,
            model: tierConfig.model,
            dataQuality: tierConfig.dataQuality,
            actualProductRows: actualRowCount
        });
        const enrichmentStart = Date.now();
        // --- Data/statistics accumulators for enrichment ---
        let totalEnriched = 0;
        let totalErrors = 0;
        const fieldStats = {};
        const rowStats = [];
        // --- Parallelize LLM enrichment ---
        async function enrichRow(i) {
            const row = outputRows[i];
            const rowStartTime = Date.now();
            const enrichableFields = outputColumns.filter((field) => typeof field === 'string' && !NON_ENRICHABLE_FIELDS.includes(field));
            const blankFields = enrichableFields.filter(field => !row[field] || (typeof row[field] === 'string' && row[field].trim() === ""));
            const fieldsToEnrich = blankFields.length > 0 ? blankFields : enrichableFields;
            const fieldContexts = fieldsToEnrich.map(field => {
                const def = fieldDefinitions[field] || {};
                const examples = def.examples || [];
                const exampleText = examples.length > 0 ? `Examples: ${examples.slice(0, 3).join(", ")}` : "";
                return `Field: ${field}\nDefinition: ${def.description || "Product information field"}\nProduct Type: ${def.product_type || "General"}\n${exampleText}`;
            }).join("\n\n");
            const productName = row['Product Name'] || row['productName'] || row['name'] || 'Unknown Product';
            const productType = row['Product Type'] || row['productType'] || row['type'] || 'General';
            // Tier-specific prompt optimization
            const tierSpecificInstructions = {
                free: "Fill in basic product information only. Focus on essential fields like brand name and basic description.",
                basic: "Provide comprehensive product details with marketplace optimization. Include key features and specifications.",
                premium: "Create SEO-optimized, branded content that maximizes discoverability and conversion. Include detailed specifications, SEO keywords, and category-specific optimizations."
            };
            const tierInstruction = tierSpecificInstructions[tierConfig.dataQuality] || tierSpecificInstructions.basic;
            const prompt = `You are an expert at preparing product feeds for ${category || ''} marketplace with ${tierConfig.dataQuality} quality standards.

${tierInstruction}

Category: ${category || ''}
Product: ${productName}
Product Type: ${productType}
Quality Level: ${tierConfig.dataQuality}
Target Fill Rate: ${Math.round(tierConfig.fillPercentage * 100)}%

Fill in the following fields for this product using the field definitions below.
IMPORTANT: 
- For ${tierConfig.dataQuality} tier, ensure ${Math.round(tierConfig.fillPercentage * 100)}% of fields are completed
- Use specific, accurate information when possible
- For brand names, use the exact brand name (not generic terms)
- For prices, use numeric values only
- For descriptions, make them compelling and searchable
- If you cannot determine a value with high confidence, leave it blank

Fields to fill:
${fieldContexts}

Product data: ${JSON.stringify(row, null, 2)}

Response (JSON only, no explanation, no markdown, no code block):`;
            let enrichedJson = '';
            let enriched = {};
            let llmError = null;
            try {
                enrichedJson = await openai.chat.completions.create({
                    model: tierConfig.model,
                    messages: [
                        { role: "system", content: "You are a product feed enrichment expert. Respond with ONLY a valid JSON object for the requested fields." },
                        { role: "user", content: prompt }
                    ],
                    temperature: 0.1,
                    max_tokens: 2000
                }).then(resp => resp.choices[0]?.message?.content || '');
                try {
                    const cleanedResponse = stripMarkdownCodeBlocks(enrichedJson);
                    enriched = JSON.parse(cleanedResponse);
                }
                catch (parseError) {
                    logger.warn('Failed to parse LLM response', { row: i, error: parseError instanceof Error ? parseError.message : parseError, response: enrichedJson?.substring(0, 200) });
                    // Fallback prompt
                    const fallbackPrompt = `Fill in the following fields for a product. If unsure, leave blank. Respond with ONLY a valid JSON object.\nFields: ${fieldsToEnrich.join(", ")}\nProduct data: ${JSON.stringify(row, null, 2)}\nResponse (JSON only):`;
                    try {
                        enrichedJson = await openai.chat.completions.create({
                            model: tierConfig.model,
                            messages: [
                                { role: "system", content: "You are a product feed enrichment expert. Respond with ONLY a valid JSON object for the requested fields." },
                                { role: "user", content: fallbackPrompt }
                            ],
                            temperature: 0.1,
                            max_tokens: 1000
                        }).then(resp => resp.choices[0]?.message?.content || '');
                        const cleanedFallbackResponse = stripMarkdownCodeBlocks(enrichedJson);
                        enriched = JSON.parse(cleanedFallbackResponse);
                    }
                    catch (fallbackError) {
                        logger.error('Fallback LLM call failed', { row: i, error: fallbackError instanceof Error ? fallbackError.message : fallbackError, response: enrichedJson?.substring(0, 200) });
                        llmError = fallbackError;
                        return { row: i + 1, confidence: 0, blanks: fieldsToEnrich, error: fallbackError };
                    }
                }
                // Apply enriched data and track stats
                let rowConfidence = 0;
                let rowFields = 0;
                const rowBlanks = [];
                for (const field of outputColumns.filter(f => typeof f === 'string')) {
                    if (NON_ENRICHABLE_FIELDS.includes(field)) {
                        rowFields++;
                        continue;
                    }
                    if (row[field] && typeof row[field] === 'string' && row[field].trim() !== "") {
                        rowConfidence += 1.0;
                        fieldStats[field] = fieldStats[field] || { mapped: 0, enriched: 0, blank: 0, errors: 0 };
                        fieldStats[field].mapped++;
                    }
                    else if (fieldsToEnrich.includes(field) && enriched[field]) {
                        const enrichedValue = enriched[field];
                        if (typeof enrichedValue === 'string' && enrichedValue.trim() !== "") {
                            row[field] = enrichedValue;
                            rowConfidence += 0.8;
                            totalEnriched++;
                            fieldStats[field] = fieldStats[field] || { mapped: 0, enriched: 0, blank: 0, errors: 0 };
                            fieldStats[field].enriched++;
                        }
                        else {
                            rowBlanks.push(field);
                            fieldStats[field] = fieldStats[field] || { mapped: 0, enriched: 0, blank: 0, errors: 0 };
                            fieldStats[field].blank++;
                        }
                    }
                    else {
                        rowBlanks.push(field);
                        fieldStats[field] = fieldStats[field] || { mapped: 0, enriched: 0, blank: 0, errors: 0 };
                        fieldStats[field].blank++;
                    }
                    rowFields++;
                }
                logger.info('Row enrichment completed', { row: i + 1, enrichedFields: Object.keys(enriched).length, processingTime: Date.now() - rowStartTime });
                return { row: i + 1, confidence: rowFields ? rowConfidence / rowFields : 0, blanks: rowBlanks };
            }
            catch (error) {
                logger.error('Row LLM enrichment failed', { row: i, error: error instanceof Error ? error.message : error, prompt, fieldsToEnrich, rowData: row });
                for (const field of fieldsToEnrich) {
                    totalErrors++;
                    fieldStats[field] = fieldStats[field] || { mapped: 0, enriched: 0, blank: 0, errors: 0 };
                    fieldStats[field].errors++;
                }
                return { row: i + 1, confidence: 0, blanks: fieldsToEnrich, error };
            }
        }
        // Run enrichRow in parallel batches
        const rowIndices = Array.from({ length: outputRows.length }, (_, i) => i);
        const rowChunks = chunkArray(rowIndices, PARALLEL_LLM_CONCURRENCY);
        for (const chunk of rowChunks) {
            await Promise.all(chunk.map(enrichRow));
        }
        logger.info('Parallel batch LLM enrichment completed', { totalRows: outputRows.length, totalEnriched, totalErrors, totalTime: Date.now() - enrichmentStart });
        // --- Write output directly to cells, starting at row 6 ---
        const rowsToDelete = worksheet.rowCount - 5;
        if (rowsToDelete > 0) {
            worksheet.spliceRows(6, rowsToDelete);
        }
        outputRows.forEach((row, i) => {
            outputColumns.forEach((col, j) => {
                worksheet.getRow(i + 6).getCell(j + 1).value = row[col] || "";
            });
        });
        await cachedTemplate.xlsx.writeFile(outputPath);
        logger.info('Output file written successfully', { path: outputPath, outputRows: outputRows.length });
        // --- Data quality and insights summary ---
        // Use Set for unique SKUs, filter out undefined
        const uniqueSkus = new Set(outputRows.map(r => typeof r['SKU'] === 'string' ? r['SKU'] : '').filter(Boolean));
        const productTypes = new Set();
        rows.forEach((row) => {
            if (row['SKU'] || row['sku'])
                uniqueSkus.add(row['SKU'] || row['sku']);
            if (row['Product Name'] || row['productName'])
                productTypes.add(row['Product Name'] || row['productName']);
        });
        // Aggregate stats from the optimized enrichment
        const avgConfidence = rowStats.length ? rowStats.reduce((a, b) => a + b.confidence, 0) / rowStats.length : 0;
        const totalMapped = Object.values(fieldStats).reduce((sum, stat) => sum + stat.mapped, 0);
        const totalBlank = Object.values(fieldStats).reduce((sum, stat) => sum + stat.blank, 0);
        const successRate = (totalMapped + totalEnriched) / (outputRows.length * outputColumns.length);
        const warnings = [];
        const suggestions = [];
        if (totalBlank > 0) {
            warnings.push(`${totalBlank} fields were left blank in one or more products. Manual review recommended.`);
        }
        if (successRate < 0.9) {
            suggestions.push('Add more detailed product data to improve mapping and enrichment success.');
        }
        const summary = {
            total_products: outputRows.length,
            unique_skus: uniqueSkus.size,
            detected_category: category,
            product_types: Array.from(new Set(outputRows.map(r => typeof r['Product Name'] === 'string' ? r['Product Name'] : '').filter(Boolean))),
            field_stats: fieldStats,
            row_stats: rowStats,
            avg_confidence: avgConfidence,
            success_rate: successRate,
            blanks: Object.keys(fieldStats).filter(field => fieldStats[field].blank > 0),
            warnings,
            suggestions,
            llm_calls: totalEnriched,
            llm_errors: totalErrors,
            input_sample: rows.slice(0, 2),
            output_sample: outputRows.slice(0, 2),
            processing_time_ms: Date.now() - startTime
        };
        // --- Add field definitions and examples to summary JSON ---
        const field_definitions_summary = {};
        for (const col of outputColumns) {
            field_definitions_summary[col] = fieldDefinitions[col] || {};
        }
        summary.field_definitions = field_definitions_summary;
        // Compose result object with detailed summary
        const result = {
            file: `${id}_output.xlsx`,
            category,
            vendorFields: inputHeaders,
            rows: outputRows,
            // Add the expected properties for the worker
            rowCount: outputRows.length,
            stats: {
                totalMapped: totalMapped,
                totalEnriched: totalEnriched,
                totalLLMCalls: totalEnriched, // LLM calls = enriched fields
                totalErrors: totalErrors,
                cacheHits: llmCacheMemory.size
            },
            summary: {
                total: outputRows.length,
                green: 0,
                yellow: 0,
                red: 0,
                fallback: 0,
                processing_time_ms: Date.now() - startTime
            },
            warnings,
            logs: {
                category_detection: category,
                grounding_examples_loaded: 0,
                batches_processed: 0,
                gpt_calls: llmCacheMemory.size
            },
            summary_json: summary
        };
        logger.info('Transformation completed successfully', {
            id,
            processingTime: result.summary.processing_time_ms,
            outputRows: outputRows.length,
            cacheHits: llmCacheMemory.size,
            summary: result.summary_json
        });
        console.log('[TRANSFORMER_OUTPUT] About to write output file:', outputPath);
        try {
            const { error } = await supabase.from("logs").insert(result.rows.map(row => ({
                feed_id: id,
                row_number: row.row_number,
                status: row.status,
                confidence: row.row_confidence,
                original_data: row.original_data,
                transformed_data: row.transformed_data,
                error_message: row.error_message,
                processing_time_ms: row.processing_time_ms,
                retry_count: row.retry_count,
                created_at: new Date().toISOString()
            })));
            if (error) {
                logger.warn('Failed to save logs to database', { error: error.message });
            }
            else {
                logger.info('Saved logs to database', { logCount: result.rows.length });
            }
        }
        catch (err) {
            console.error('[SUPABASE_UPLOAD_ERROR]', {
                filePath: outputPath,
                error: (err && typeof err === 'object' && 'message' in err) ? err.message : String(err),
                supabaseRole: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'service_role' : 'unknown',
            });
            throw new Error('Supabase upload failed: ' + ((err && typeof err === 'object' && 'message' in err) ? err.message : String(err)));
        }
        if (res) {
            return res.json(result);
        } else {
            return result;
        }
    }
    catch (err) {
        const errorTime = Date.now() - startTime;
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        logger.error('Transformation failed', {
            id,
            error: errorMessage,
            processingTime: errorTime
        });
        console.error('[TRANSFORMER_ERROR]', err);
        if (res) {
            return res.status(500).json({
                error: errorMessage,
                processing_time_ms: errorTime,
                feed_id: id,
                rowCount: 0,
                stats: {
                    totalMapped: 0,
                    totalEnriched: 0,
                    totalLLMCalls: 0,
                    totalErrors: 1,
                    cacheHits: 0
                }
            });
        } else {
            return {
                error: errorMessage,
                processing_time_ms: errorTime,
                feed_id: id,
                rowCount: 0,
                stats: {
                    totalMapped: 0,
                    totalEnriched: 0,
                    totalLLMCalls: 0,
                    totalErrors: 1,
                    cacheHits: 0
                }
            };
        }
    }
};
// Category detection with random sampling and better prompts
async function detectCategory(rows, groundingRoot) {
    logger.info('Starting category detection');
    const knownCategories = fs.readdirSync(groundingRoot).filter((cat) => fs.statSync(path.join(groundingRoot, String(cat))).isDirectory());
    logger.info('Available categories', { categories: knownCategories });
    // Heuristic 1: Check for category column
    if (rows.length > 0) {
        const firstRow = rows[0];
        const categoryColumn = Object.keys(firstRow).find(key => key.toLowerCase().includes('category') || key.toLowerCase().includes('type'));
        if (categoryColumn) {
            const categories = Array.from(new Set(rows.map(row => String(row[categoryColumn]).toLowerCase().trim())));
            logger.info('Found category column', { column: categoryColumn, categories });
            // If all categories are the same and valid, use it
            if (categories.length === 1 && knownCategories.includes(categories[0])) {
                logger.info('Category detected from column', { category: categories[0] });
                return categories[0];
            }
            // If mixed categories, use base
            if (categories.length > 1) {
                logger.info('Mixed categories found, using base', { categories });
                return "base";
            }
        }
    }
    // Heuristic 2: filename or headers
    const filename = path.basename(rows[0]?.filename || "").toLowerCase();
    const headerGuess = Object.keys(rows[0] || {});
    let matched = knownCategories.find((cat) => filename.includes(cat));
    if (!matched) {
        matched = knownCategories.find((cat) => headerGuess.some(h => h.toLowerCase().includes(cat)));
    }
    if (matched) {
        logger.info('Category detected via heuristics', { category: matched });
        return matched;
    }
    // Heuristic 3: OpenAI classification with random sampling
    const sampleSize = Math.min(10, Math.max(3, Math.floor(rows.length * 0.1)));
    const sampleRows = getRandomSample(rows, sampleSize);
    const prompt = `You are a product feed classifier. Analyze the sample data and respond with ONLY the category name from the provided list.

Available categories: ${knownCategories.join(", ")}

Sample data (${sampleRows.length} rows):
${JSON.stringify(sampleRows, null, 2)}

Instructions:
- If the sample shows consistent product type, return that category
- If the sample is mixed, unclear, or contains headers, respond with "base"
- If you're unsure, respond with "base"
- Respond with ONLY the category name, no explanations

Category:`;
    logger.info('Sending category detection prompt', {
        sampleSize,
        promptLength: prompt.length
    });
    try {
        const resp = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                { role: "system", content: "You are a product feed classifier. Respond with ONLY the category name from the provided list." },
                { role: "user", content: prompt }
            ],
            temperature: 0.1,
            max_tokens: 50
        });
        const detected = resp.choices[0].message.content?.toLowerCase().trim();
        logger.info('AI category detection response', { detected });
        const category = knownCategories.includes(detected || "") ? (detected || "base") : "base";
        logger.info('Category detection completed', { finalCategory: category });
        return category;
    }
    catch (error) {
        logger.warn('AI classification failed, defaulting to base', {
            error: error instanceof Error ? error.message : 'Unknown error'
        });
        return "base";
    }
}
// Helper function to get random sample
function getRandomSample(array, size) {
    const shuffled = [...array].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, size);
}
// Load template and field definitions
async function loadTemplateAndFields(category, groundingRoot) {
    const fieldDefPath = path.join(groundingRoot, String(category), "field_definitions.json");
    if (!fs.existsSync(fieldDefPath)) {
        logger.warn('Missing field definitions, using base', {
            requestedCategory: category,
            requestedPath: fieldDefPath
        });
        const baseFieldDefPath = path.join(groundingRoot, "base", "field_definitions.json");
        if (!fs.existsSync(baseFieldDefPath)) {
            throw new Error(`Missing field definitions for both ${category} and base`);
        }
        const fieldDefs = JSON.parse(fs.readFileSync(baseFieldDefPath, "utf8"));
        return {
            templateKeys: Object.keys(fieldDefs),
            fieldDefinitions: fieldDefs
        };
    }
    const fieldDefs = JSON.parse(fs.readFileSync(fieldDefPath, "utf8"));
    logger.info('Loaded field definitions', {
        category,
        fieldCount: Object.keys(fieldDefs).length
    });
    return {
        templateKeys: Object.keys(fieldDefs),
        fieldDefinitions: fieldDefs
    };
}
async function loadGroundingExamples(category, groundingRoot, maxRows = 5) {
    try {
        const xlsxPath = path.join(groundingRoot, String(category || "base"), "sample_vendor_feed.xlsx");
        const baseXlsxPath = path.join(groundingRoot, "base", "sample_vendor_feed.xlsx");
        let fileToRead = "";
        if (fs.existsSync(xlsxPath)) {
            fileToRead = xlsxPath;
        }
        else if (fs.existsSync(baseXlsxPath)) {
            fileToRead = baseXlsxPath;
            logger.warn('No sample_vendor_feed.xlsx for category, using base', {
                requestedCategory: category
            });
        }
        else {
            logger.warn('No sample_vendor_feed.xlsx found for category or base', {
                requestedCategory: category
            });
            return [];
        }
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.readFile(fileToRead);
        const worksheet = workbook.getWorksheet(1);
        if (!worksheet) {
            logger.warn('No worksheet found in sample_vendor_feed.xlsx', { fileToRead });
            return [];
        }
        const headerRaw = worksheet.getRow(1).values;
        const headerRow = Array.isArray(headerRaw)
            ? headerRaw.map(v => v === undefined || v === null ? '' : String(v))
            : [];
        const examples = [];
        for (let i = 2; i <= Math.min(worksheet.rowCount, (headerRow.length > 0 ? maxRows : 0) + 1); i++) {
            const rowRaw = worksheet.getRow(i).values;
            const row = Array.isArray(rowRaw)
                ? rowRaw.map(v => v === undefined || v === null ? '' : String(v))
                : [];
            if (!row.length)
                continue;
            const obj = {};
            for (let j = 1; j < headerRow.length; j++) {
                obj[headerRow[j] || `col${j}`] = row[j] ?? "";
            }
            examples.push(obj);
        }
        logger.info('Loaded grounding examples', {
            category,
            count: examples.length,
            sourceFile: fileToRead
        });
        return examples;
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logger.warn('Failed to load grounding examples, proceeding without them', {
            category,
            error: errorMessage
        });
        return [];
    }
}
// Utility functions
function chunkArray(arr, size) {
    const result = [];
    for (let i = 0; i < arr.length; i += size) {
        result.push(arr.slice(i, i + size));
    }
    return result;
}
// Use OpenAI to map input headers to template field names
async function mapHeadersWithOpenAI(inputHeaders, outputColumns) {
    const headerMapping = {};
    const prompt = `You are a product feed classifier. Respond with ONLY the mapping from the input headers to the output columns.

Input headers: ${inputHeaders.join(", ")}

Output columns: ${outputColumns.join(", ")}

Instructions:
- Map each input header to the corresponding output column
- If an input header does not match any output column, map it to an empty string
- Respond with ONLY the mapping in the format: "inputHeader: outputColumn"

Mapping:`;
    logger.info('Sending header mapping prompt', {
        inputHeaders: inputHeaders.length,
        outputColumns: outputColumns.length,
        promptLength: prompt.length
    });
    try {
        const resp = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                { role: "system", content: "You are a product feed classifier. Respond with ONLY the mapping from the input headers to the output columns." },
                { role: "user", content: prompt }
            ],
            temperature: 0.1,
            max_tokens: 50
        });
        const mapping = resp.choices[0].message.content?.split("\n").map(line => {
            const [inputHeader, outputColumn] = line.split(": ");
            return [inputHeader, outputColumn];
        });
        if (mapping) {
            mapping.forEach(([inputHeader, outputColumn]) => {
                headerMapping[inputHeader] = outputColumn;
            });
            logger.info('Header mapping completed', { mapping: headerMapping });
            return headerMapping;
        }
        else {
            logger.warn('No valid mapping found');
            return {};
        }
    }
    catch (error) {
        logger.warn('Failed to map headers with OpenAI', {
            error: error instanceof Error ? error.message : 'Unknown error'
        });
        return {};
    }
}
// --- TIER-AWARE PROMPTS ---
const premiumPrompt = `SEO-optimize, use branded language, maximize discoverability, and ensure all key fields are filled for Walmart marketplace.`;
// --- CONFIDENCE SCORING & LOGGING ---
function logLowConfidence(row, confidence) {
    if (confidence < 0.5) {
        logger.warn(`Low confidence enrichment: ${confidence}`, { row });
    }
}
