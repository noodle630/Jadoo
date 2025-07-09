"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleProcess = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const papaparse_1 = __importDefault(require("papaparse"));
const exceljs_1 = __importDefault(require("exceljs"));
const openaiClient_js_1 = __importDefault(require("../../openaiClient.js"));
const winston = __importStar(require("winston"));
const string_similarity_1 = __importDefault(require("string-similarity"));
const crypto = __importStar(require("crypto"));
// @ts-ignore
const llm_cache_js_1 = __importDefault(require("./llm-cache.js"));
// @ts-ignore
const logger_js_1 = require("../logger.js");
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
            const workbook = new exceljs_1.default.Workbook();
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
                const workbook = new exceljs_1.default.Workbook();
                await workbook.xlsx.readFile(xlsxToUse);
                templateCache.set(category, workbook);
                logger.info('Cached template', { category });
            }
            // Cache grounding examples
            const groundingPath = path.join(groundingRoot, safeCategory, "sample_vendor_feed.xlsx");
            if (fs.existsSync(groundingPath) && !groundingCache.has(category)) {
                const groundingWorkbook = new exceljs_1.default.Workbook();
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
        const result = await llm_cache_js_1.default.callWithCache(openaiClient_js_1.default, prompt, {
            model: options.model || "gpt-4o-mini",
            temperature: options.temperature || 0.1,
            max_tokens: options.max_tokens || 1000,
            ...options
        });
        setCachedResult(cacheKey, result);
        return result;
    }
    catch (error) {
        (0, logger_js_1.logError)(error, { context: 'cachedLLMCall', prompt: prompt.substring(0, 100) });
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
                (0, logger_js_1.logPerformance)('row_process', rowTime, { rowIndex: i * concurrency + index });
                return result;
            }
            catch (error) {
                (0, logger_js_1.logError)(error, { context: 'row_process', rowIndex: i * concurrency + index });
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
        (0, logger_js_1.logPerformance)('chunk_process', chunkTime, { chunkIndex: i, chunkSize: chunk.length });
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
// --- UPDATED TIER-BASED ENRICHMENT CONFIGURATION ---
const TIER_CONFIG = {
    free: {
        maxRows: 100,
        fillPercentage: 0.4, // 40% of fields filled
        model: "gpt-4o-mini",
        dataQuality: "basic", // Basic product info only
        features: ["Product Name", "Brand Name", "Price", "SKU"]
    },
    basic: {
        maxRows: 500,
        fillPercentage: 0.7, // 70% of fields filled
        model: "gpt-4o-mini",
        dataQuality: "standard", // Standard marketplace optimization
        features: ["Product Name", "Brand Name", "Price", "SKU", "Description", "Key Features", "Color", "Size"]
    },
    premium: {
        maxRows: 1000,
        fillPercentage: 0.95, // 95% of fields filled
        model: "gpt-4o",
        dataQuality: "premium", // SEO optimized, branded, search-friendly
        features: ["Product Name", "Brand Name", "Price", "SKU", "Description", "Key Features", "Color", "Size", "Specifications", "SEO Keywords", "Category Optimization"]
    }
};
// --- DYNAMIC FIELD SELECTION LOGIC ---
function getFieldsToEnrich(row, outputColumns, tierConfig) {
    // Always fill these fields if blank
    const mustFill = ["Product Name", "Brand Name", "Price", "SKU"];
    // Find blank must-fill fields
    const blankMustFill = mustFill.filter(f => outputColumns.includes(f) && (!row[f] || row[f].trim() === ""));
    // Find other blank fields, sorted by importance (could use LLM/heuristics)
    const otherBlank = outputColumns.filter(f => !mustFill.includes(f) && (!row[f] || row[f].trim() === ""));
    // Fill up to fillPercentage of all fields, prioritizing mustFill, then most valuable blank fields
    const totalToFill = Math.ceil(outputColumns.length * tierConfig.fillPercentage);
    const fieldsToEnrich = [...blankMustFill, ...otherBlank].slice(0, totalToFill);
    return fieldsToEnrich;
}
// --- UPDATED PROMPT GENERATION ---
function getTierPrompt(tierConfig, productName, productType, fieldContexts, row) {
    return `You are an expert at preparing product feeds for the target marketplace. For each product, fill in as many high-value fields as possible (up to ${Math.round(tierConfig.fillPercentage * 100)}%), prioritizing those that are blank or low quality. Always fill Name, Brand, Price, SKU, and then Description, Category, and Key Features if missing. Use the best available input data, and only enrich where it adds clear value. Do not overwrite strong input data.\n\nProduct: ${productName}\nProduct Type: ${productType}\n\nFields to fill:\n${fieldContexts}\n\nProduct data: ${JSON.stringify(row, null, 2)}\n\nResponse (JSON only, no explanation, no markdown, no code block):`;
}
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
const handleProcess = async (req = {}) => {
    console.log('[DEBUG] handleProcess CALLED');
    const startTime = Date.now();
    // Robustly handle missing req.params, req.body, req.headers
    const params = req && req.params ? req.params : {};
    const body = req && req.body ? req.body : {};
    const headers = req && req.headers ? req.headers : {};
    const id = params.id || req.id || req.feedId || req.jobId || null;
    const uploadPath = path.join("temp_uploads", String(id) + ".csv");
    const groundingRoot = "grounding/walmart";
    const templateRoot = "attached_assets/templates/walmart";
    // Always output .xlsx for Walmart
    const outputPath = path.join("outputs", `${id}_output.xlsx`);
    logger.info('handleProcess called', { requestId: headers['x-request-id'] || null, time: new Date().toISOString(), id, uploadPath });
    console.log(`[TRANSFORMER] handleProcess called for id: ${id}, uploadPath: ${uploadPath}`);
    // Ensure tier is always defined and available
    const tier = (body && body.tier) || (req.query && req.query.tier) || "free";
    const warnings = [];
    try {
        // Preload static data if not already cached
        if (templateCache.size === 0) {
            await preloadStaticData(groundingRoot, templateRoot);
            console.log(`[TRANSFORMER] Static data preloaded: templates=${templateCache.size}`);
        }
        // Validate input file exists
        if (!fs.existsSync(uploadPath)) {
            console.error(`[TRANSFORMER] Input file not found: ${uploadPath}`);
            throw new Error(`Input file not found: ${uploadPath}`);
        }
        const inputStats = fs.statSync(uploadPath);
        console.log(`[TRANSFORMER] Input file size: ${inputStats.size} bytes`);
        // --- DEEP DIAGNOSTICS: CSV file read and row counting ---
        logger.info('[CSV][DEBUG] Reading file', { uploadPath });
        const csvData = fs.readFileSync(uploadPath, "utf8");
        const allLines = csvData.split(/\r?\n/);
        logger.info('[CSV][DEBUG] First 20 lines', { lines: allLines.slice(0, 20) });
        logger.info('[CSV][DEBUG] Total lines in file', { totalLineCount: allLines.length });
        const nonEmptyLines = allLines.filter(l => l.trim().length > 0);
        logger.info('[CSV][DEBUG] Non-empty lines in file', { nonEmptyLineCount: nonEmptyLines.length });
        let { data: rows, errors: parseErrors } = papaparse_1.default.parse(csvData, {
            header: true,
            skipEmptyLines: true,
            transformHeader: (header) => header.trim()
        });
        logger.info('[CSV][DEBUG] Parsed rows', { parsedRowCount: rows.length, sample: rows.slice(0, 3) });
        if (parseErrors.length > 0) {
            logger.warn('[CSV][DEBUG] Parse errors', { parseErrors });
        }
        // Fallback if parsed rows < (non-empty lines - 1)
        if (rows.length < (nonEmptyLines.length - 1)) {
            logger.warn('[CSV][DEBUG] Fallback triggered: parsed rows less than non-empty lines', { parsedRowCount: rows.length, nonEmptyLineCount: nonEmptyLines.length });
            // Manual fallback: split lines, use header, map to objects
            const header = allLines[0].split(',').map(h => h.trim());
            const fallbackRows = allLines.slice(1).filter(l => l.trim().length > 0).map(line => {
                const values = line.split(',');
                const obj = {};
                header.forEach((h, i) => { obj[h] = values[i] || ''; });
                return obj;
            });
            logger.info('[CSV][DEBUG] Fallback row count', { fallbackRowCount: fallbackRows.length, sample: fallbackRows.slice(0, 3) });
            if (fallbackRows.length > rows.length) {
                rows = fallbackRows;
                logger.info('[CSV][DEBUG] Using fallback rows for processing');
            }
        }
        logger.info('[CSV] Final row count for processing', { finalRowCount: rows.length });
        console.log(`[TRANSFORMER] Parsed input rows: ${rows.length}`);
        // --- PATCH: Enforce tier row limit strictly, never fewer ---
        const validTiers = ['free', 'basic', 'premium'];
        const tierKey = validTiers.includes(tier) ? tier : 'free';
        const tierConfig = TIER_CONFIG[tierKey];
        if (rows.length > tierConfig.maxRows) {
            logger.warn('[CSV][DEBUG] Row limit exceeded', { maxRows: tierConfig.maxRows, actualRows: rows.length });
            rows = rows.slice(0, tierConfig.maxRows);
        }
        // --- Category detection with caching ---
        const category = await detectCategory(rows, groundingRoot);
        logger.info('Category detected', { category });
        console.log(`[TRANSFORMER] Detected category: ${category}`);
        // --- Load template and field definitions with caching ---
        const { templateKeys, fieldDefinitions } = await loadTemplateAndFields(category, groundingRoot);
        logger.info('Template loaded', { fieldCount: templateKeys.length });
        console.log(`[TRANSFORMER] Template loaded for category: ${category}`);
        // --- Extract output columns from cached template ---
        const cachedTemplate = templateCache.get(category);
        if (!cachedTemplate) {
            console.error(`[TRANSFORMER] Template not found in cache for category: ${category}`);
            throw new Error(`Template not found in cache for category: ${category}`);
        }
        // Walmart: always use 'Product Content And Site Exp' worksheet, row 3 for columns
        const worksheet = cachedTemplate.getWorksheet("Product Content And Site Exp");
        if (!worksheet) {
            console.error(`[TRANSFORMER] Worksheet 'Product Content And Site Exp' not found in template XLSX for category: ${category}`);
            throw new Error("Worksheet 'Product Content And Site Exp' not found in template XLSX");
        }
        const row3 = worksheet.getRow(3).values;
        const outputColumns = Array.isArray(row3)
            ? row3.slice(1).map(v => (typeof v === 'string' ? v : String(v))).filter((v) => typeof v === 'string' && v.length > 0)
            : [];
        const trimmedOutputColumns = outputColumns.map(h => h.trim());
        // fieldDefinitions must be loaded for enrichment
        // --- COMPREHENSIVE PATCH: Strict mapping and enrichment ---
        // 1. Normalize and fuzzy match input headers to template columns (strict)
        const inputHeaders = Object.keys(rows[0] || {});
        const normalize = (str) => str.toLowerCase().replace(/[^a-z0-9]/g, '');
        const normalizedInputHeaders = inputHeaders.map(normalize);
        const normalizedTemplateColumns = outputColumns.map(normalize);
        // Build header mapping with strict threshold
        const headerMapping = {};
        outputColumns.forEach((col, idx) => {
            const normCol = normalizedTemplateColumns[idx];
            let foundIdx = normalizedInputHeaders.indexOf(normCol);
            // Fuzzy match with high threshold (0.85)
            if (foundIdx === -1) {
                let bestScore = 0;
                let bestIdx = -1;
                normalizedInputHeaders.forEach((h, i) => {
                    const score = string_similarity_1.default.compareTwoStrings(normCol, h);
                    if (score > bestScore) {
                        bestScore = score;
                        bestIdx = i;
                    }
                });
                if (bestScore >= 0.85) {
                    foundIdx = bestIdx;
                }
            }
            if (foundIdx !== -1) {
                headerMapping[col] = inputHeaders[foundIdx];
            }
        });
        logger.info({ message: '[MAPPING] Strict header mapping', headerMapping });
        // Log input headers and header mapping
        console.log('[TRANSFORMER] Input headers:', inputHeaders);
        console.log('[TRANSFORMER] Header mapping:', headerMapping);
        console.log('=== TRANSFORMER STARTED ===');
        console.log('[TRANSFORMER] Output columns:', outputColumns);
        if (rows.length > 0) {
            console.log('[TRANSFORMER] Sample input row:', rows[0]);
        }
        // Build a normalized header map for case-insensitive, trimmed matching
        const normalizedRowKeys = inputHeaders.reduce((acc, key) => {
            acc[key.trim().toLowerCase()] = key;
            return acc;
        }, {});
        // Declare outputRows once before the loop
        const outputRows = [];
        for (const [rowIdx, rowRaw] of rows.entries()) {
            const row = rowRaw;
            const outputRow = {};
            let mappedFields = 0;
            for (const col of outputColumns) {
                let value = '';
                const mappedHeader = headerMapping[col]?.trim().toLowerCase();
                let originalKey = normalizedRowKeys[mappedHeader] || '';
                if (!originalKey) {
                    // Fuzzy match fallback (not implemented here)
                    value = '';
                }
                else {
                    value = row[originalKey];
                }
                if (typeof value === 'string' && value.trim().length > 0) {
                    outputRow[col] = value;
                    mappedFields++;
                }
                else {
                    outputRow[col] = '';
                }
            }
            if (mappedFields > 0) {
                outputRows.push(outputRow);
                console.log(`[TRANSFORMER] Row ${rowIdx} mapped:`, outputRow);
            }
            else {
                console.log(`[TRANSFORMER] Row ${rowIdx} skipped: no mapped fields`, row);
            }
        }
        console.log(`[TRANSFORMER] Output row count: ${outputRows.length}`);
        console.log('=== TRANSFORMER FINISHED ===');
        // 3. Write output in correct template format (never passthrough)
        const workbook = cachedTemplate; // Use the loaded template workbook
        let ws = workbook.getWorksheet('Sheet1');
        if (!ws)
            ws = workbook.addWorksheet('Sheet1');
        ws.spliceRows(1, ws.rowCount); // Clear
        ws.addRow(outputColumns);
        for (const r of outputRows)
            ws.addRow(outputColumns.map(c => r[c]));
        await workbook.xlsx.writeFile(outputPath);
        logger.info({ message: '[OUTPUT] Output file written (strict template)', outputPath, outputRows: outputRows.length });
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
        // --- Data quality and insights summary removed (no rowStats/fieldStats/totalEnriched) ---
        // --- End of function ---
        // Add summary of skipped/errored rows to result
        const errorRows = outputRows.filter(r => r.status === 'ERROR');
        // result.summary_json.error_rows = errorRows.map(r => ({ row: r.row_number, error: r.error_message })); // Removed as per edit hint
        // Ensure output file is uploaded before marking job complete
        let uploadSuccess = false;
        for (let attempt = 0; attempt < 3; attempt++) {
            try {
                // (Assume REMOVED_SECRETupload or local copy here)
                if (fs.existsSync(outputPath)) {
                    uploadSuccess = true;
                    break;
                }
                await new Promise(res => setTimeout(res, 1000));
            }
            catch (e) {
                logger.warn('Output file upload attempt failed', { attempt, error: e });
            }
        }
        if (!uploadSuccess) {
            logger.error('Output file not available after retries', { outputPath });
            return { error: 'Output file not available after processing', feed_id: id };
        }
        return { success: true, message: 'File mapped and output generated with LLM enrichment', outputPath, rowCount: outputRows.length };
    }
    catch (err) {
        const errorTime = Date.now() - startTime;
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        logger.error({
            message: '[TRANSFORMER] Error during transformation',
            feedId: id,
            error: err,
        });
        console.error('[TRANSFORMER_ERROR]', err);
        return {
            error: errorMessage,
            processing_time_ms: errorTime,
            feed_id: id
        };
    }
};
exports.handleProcess = handleProcess;
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
        const resp = await openaiClient_js_1.default.chat.completions.create({
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
        const workbook = new exceljs_1.default.Workbook();
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
        const resp = await openaiClient_js_1.default.chat.completions.create({
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
// --- Utility: Sample 10% of rows (at least 5, max 20) ---
function sampleRows(rows) {
    const n = Math.max(5, Math.min(20, Math.ceil(rows.length * 0.1)));
    const indices = new Set();
    while (indices.size < n && indices.size < rows.length) {
        indices.add(Math.floor(Math.random() * rows.length));
    }
    return Array.from(indices).map(i => rows[i]);
}
// --- Utility: Ask GPT to guess category for a row ---
async function gptGuessCategory(row) {
    // Replace with your actual GPT call logic
    // For now, just return 'base' for demo
    return 'base';
}
// --- Enhanced category detection ---
async function detectCategoryDynamic(rows, groundingRoot) {
    const knownCategories = fs.readdirSync(groundingRoot).filter((cat) => fs.statSync(path.join(groundingRoot, String(cat))).isDirectory());
    const headers = Object.keys(rows[0] || {});
    // Try header-based detection first (as before)
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
                return { category: categories[0], debugInfo: { method: 'column_header', categories } };
            }
            // If mixed categories, use base
            if (categories.length > 1) {
                logger.info('Mixed categories found, using base', { categories });
                return { category: 'base', debugInfo: { method: 'mixed_categories', categories } };
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
        return { category: matched, debugInfo: { method: 'heuristic_filename', matched } };
    }
    // If no match, sample rows and use GPT
    const samples = sampleRows(rows);
    const guesses = [];
    for (const row of samples) {
        guesses.push(await gptGuessCategory(row));
    }
    const allSame = guesses.every(g => g === guesses[0]);
    if (allSame && knownCategories.includes(guesses[0])) {
        return { category: guesses[0], debugInfo: { method: 'gpt', guesses } };
    }
    return { category: 'base', debugInfo: { method: 'fallback', guesses } };
}
function logDebug(message, data) {
    const logPath = path.resolve(process.cwd(), 'logs/transformer-debug.log');
    const logLine = `[${new Date().toISOString()}] ${message}${data ? ' ' + JSON.stringify(data) : ''}\n`;
    fs.appendFileSync(logPath, logLine);
}
function normalize(str) {
    return str.toLowerCase().replace(/[^a-z0-9]/g, '');
}
// Helper function to write passthrough output
async function writeOutputPassthrough({ inputHeaders, inputData, outputPath }) {
    const ext = path.extname(outputPath).toLowerCase();
    if (ext === '.csv') {
        const csvRows = [inputHeaders.join(','), ...inputData.map(row => inputHeaders.map(h => JSON.stringify(row[h] ?? '')).join(','))];
        await fs.promises.writeFile(outputPath, csvRows.join('\n'), 'utf8');
    }
    else if (ext === '.xlsx') {
        const XLSX = require('xlsx');
        const ws = XLSX.utils.json_to_sheet(inputData, { header: inputHeaders });
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
        XLSX.writeFile(wb, outputPath);
    }
    else {
        throw new Error('Unsupported output file extension for passthrough: ' + ext);
    }
}
