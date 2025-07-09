import * as fs from "fs";
import * as path from "path";
import Papa from "papaparse";
import ExcelJS from "exceljs";
import { Request, Response } from "express";
import REMOVED_SECRETfrom "../../supabaseClient.js";
import openai from "../../openaiClient.js";
import * as winston from "winston";
import stringSimilarity from "string-similarity";
import * as crypto from "crypto";
// @ts-ignore
import llmCache from "./llm-cache.js";
// @ts-ignore
import { logPerformance, logLLMCall, logError } from "../logger.js";

// Configure structured logging with reduced verbosity
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'transformer' },
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(({ timestamp, level, message, ...meta }) => {
          const msg = typeof message === 'string' ? message : String(message);
          // Only log important messages to console, reduce noise
          if (level === 'error' || level === 'warn' || 
              msg.includes('Starting') || msg.includes('completed') || 
              msg.includes('failed') || msg.includes('cache')) {
            return `${timestamp} [${level}]: ${msg} ${Object.keys(meta).length ? JSON.stringify(meta) : ''}`;
          }
          return '';
        })
      )
    })
  ]
});

// Ensure logs directory exists
if (!fs.existsSync('logs')) {
  fs.mkdirSync('logs');
}

// ===== CACHING SYSTEM =====
// In-memory cache for LLM results
const llmCacheMemory = new Map<string, any>();
const templateCache = new Map<string, any>();
const groundingCache = new Map<string, any>();
const headerMappingCache = new Map<string, any>();
const enrichmentCache = new Map<string, any>();

// Cache key generator for LLM calls
function generateCacheKey(input: string | undefined, context: string | undefined): string {
  return crypto.createHash('md5').update(`${input || ''}:${context || ''}`).digest('hex');
}

// Cache management
function getCachedResult(key: string): any | null {
  return llmCacheMemory.get(key) || null;
}

function setCachedResult(key: string, result: any): void {
  llmCacheMemory.set(key, result);
  // Limit cache size to prevent memory issues
  if (llmCacheMemory.size > 1000) {
    const firstKey = llmCacheMemory.keys().next().value;
    llmCacheMemory.delete(firstKey || '');
  }
}

// Preload static data at startup
async function preloadStaticData(groundingRoot: string, templateRoot?: string) {
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
    const categories = fs.readdirSync(groundingRoot).filter((cat: string) => 
      fs.statSync(path.join(groundingRoot, String(cat))).isDirectory()
    );
    
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
  } catch (error) {
    logger.warn('Static data preloading failed', { error: error instanceof Error ? error.message : error });
  }
}

// Types for better type safety
interface TransformRow {
  row_number: number;
  status: "SUCCESS" | "ERROR" | "PARTIAL" | "FALLBACK";
  row_confidence: "green" | "yellow" | "red";
  original_data: any;
  transformed_data: any;
  error_message?: string;
  processing_time_ms: number;
  retry_count: number;
  raw_gpt_response?: string;
}

interface TransformResult {
  file: string;
  category: string;
  vendorFields: string[];
  rows: TransformRow[];
  summary: {
    total: number;
    green: number;
    yellow: number;
    red: number;
    fallback: number;
    processing_time_ms: number;
  };
  warnings: string[];
  logs: {
    category_detection: string;
    grounding_examples_loaded: number;
    batches_processed: number;
    gpt_calls: number;
  };
}

// TODO: Cache template header mappings for each template file to avoid recomputing every time.
function normalizeHeader(header: string): string {
  return header.replace(/[_\s]/g, '').toLowerCase();
}

// --- Attribute extraction utility ---
function extractAttributes(row: Record<string, any>): Record<string, string> {
  const attrs: Record<string, string> = {};
  const title = row['Product Name'] || row['productName'] || row['Title'] || '';
  // Color
  const colorMatch = title.match(/\b(Black|White|Green|Blue|Red|Yellow|Pink|Gold|Silver|Gray|Jade)\b/i);
  if (colorMatch) attrs['Color'] = colorMatch[0];
  // Storage
  const storageMatch = title.match(/(\d{2,4}GB|\d{1,2}TB)/i);
  if (storageMatch) attrs['Storage Capacity'] = storageMatch[0];
  // Carrier
  const carrierMatch = title.match(/(T-Mobile|Verizon|AT&T|Unlocked|Sprint)/i);
  if (carrierMatch) attrs['Carrier'] = carrierMatch[0];
  // Condition
  const condMatch = title.match(/(Excellent|Good|Premium|Acceptable|New|Refurbished|Used)/i);
  if (condMatch) attrs['Condition'] = condMatch[0];
  // Model Name
  const modelMatch = title.match(/Galaxy S\d{2,}/i);
  if (modelMatch) attrs['Model Name'] = modelMatch[0];
  // Model Number (if present)
  if (row['Model Number']) attrs['Model Number'] = row['Model Number'];
  // Quantity
  if (row['Quantity']) attrs['Quantity'] = row['Quantity'];
  return attrs;
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
  },
  god_mode: {
    maxRows: 2000,
    fillPercentage: 1.0, // 100% of fields filled
    model: "gpt-4o",
    dataQuality: "enterprise", // Maximum optimization
    features: ["*"] // All fields
  },
  ultra: {
    maxRows: 5000,
    fillPercentage: 1.0, // 100% of fields filled
    model: "gpt-4o",
    dataQuality: "ultra", // Ultra optimization
    features: ["*"] // All fields
  }
};

// --- ADVANCED PROMPT GENERATION WITH GROUNDING ---
function generateAdvancedPrompt(
  tierConfig: any, 
  productName: string, 
  category: string, 
  fieldsToEnrich: string[], 
  row: Record<string, any>,
  groundingExamples: any[],
  fieldDefinitions: any
): string {
  const tierSpecificInstructions = {
    free: "Fill in basic product information only. Focus on essential fields like brand name and basic description.",
    basic: "Provide comprehensive product details with marketplace optimization. Include key features and specifications.",
    premium: "Create SEO-optimized, branded content that maximizes discoverability and conversion. Include detailed specifications, SEO keywords, and category-specific optimizations.",
    enterprise: "Create enterprise-grade, highly optimized content with maximum detail and accuracy. Include all specifications, compliance info, and advanced SEO.",
    ultra: "Create ultra-optimized content with maximum detail, accuracy, and marketplace performance. Include all possible specifications and optimizations."
  };

  const tierInstruction = tierSpecificInstructions[tierConfig.dataQuality as keyof typeof tierSpecificInstructions] || tierSpecificInstructions.basic;

  // Build field context with definitions and examples
  const fieldContexts = fieldsToEnrich.map(field => {
    const def = fieldDefinitions[field] || {};
    const examples = def.examples || [];
    const exampleText = examples.length > 0 ? `Examples: ${examples.slice(0, 3).join(", ")}` : "";
    return `Field: ${field}\nDefinition: ${def.description || "Product information field"}\n${exampleText}`;
  }).join("\n\n");

  // Include grounding examples
  const groundingText = groundingExamples.length > 0 
    ? `\n\nReference Examples:\n${JSON.stringify(groundingExamples.slice(0, 3), null, 2)}`
    : "";

  return `You are an expert at preparing product feeds for the ${category} category on the target marketplace. 

${tierInstruction}

Product: ${productName}
Category: ${category}
Tier: ${tierConfig.dataQuality}

Fields to enrich:
${fieldContexts}

Available product data:
${JSON.stringify(row, null, 2)}${groundingText}

Instructions:
1. Use the available product data first - do not overwrite existing good data
2. Only enrich fields that are truly missing or low quality
3. Provide accurate, marketplace-optimized content
4. Follow the reference examples for format and style
5. Return JSON only with the enriched fields

Response (JSON only, no explanation, no markdown, no code block):`;
}

// --- PARALLEL PROCESSING WITH BATCHING ---
async function processRowsInParallel(rows: any[], processor: Function, concurrency = 4): Promise<any[]> {
  const results: any[] = [];
  const chunks = chunkArray(rows, Math.ceil(rows.length / concurrency));
  
  const chunkPromises = chunks.map(async (chunk, chunkIndex) => {
    const chunkResults: any[] = [];
    for (const [rowIndex, row] of chunk.entries()) {
      const globalIndex = chunkIndex * chunks[0].length + rowIndex;
      try {
        const result = await processor(row, globalIndex);
        chunkResults.push(result);
      } catch (error) {
        logger.error('Row processing error', { globalIndex, error });
        chunkResults.push({ error: true, rowIndex: globalIndex });
      }
    }
    return chunkResults;
  });
  
  const chunkResults = await Promise.all(chunkPromises);
  return chunkResults.flat();
}

// --- ADVANCED LLM CALL WITH CACHING ---
async function callLLM(prompt: string, row: Record<string, any>, tier: string): Promise<any> {
  const cacheKey = generateCacheKey(JSON.stringify(row), prompt);
  const cached = getCachedResult(cacheKey);
  if (cached) {
    console.log('[LLM][CACHE_HIT] Returning cached result');
    return cached;
  }

  const tierConfig = TIER_CONFIG[tier as keyof typeof TIER_CONFIG] || TIER_CONFIG['free'];
  
  try {
    console.log('[LLM][CALL] Calling OpenAI API...');
    const completion = await openai.chat.completions.create({
      model: tierConfig.model,
      messages: [
        {
          role: "system",
          content: "You are an expert product feed processor. Always respond with valid JSON only."
        },
        {
          role: "user", 
          content: prompt
        }
      ],
      temperature: 0.1,
      max_tokens: 2000
    });

    const response = completion.choices[0]?.message?.content;
    console.log('[LLM][RESPONSE] Raw:', response);
    
    if (!response) {
      throw new Error('Empty response from OpenAI');
    }

    // Parse JSON response
    const cleanedResponse = response.replace(/```json\n?|\n?```/g, '').trim();
    const result = JSON.parse(cleanedResponse);
    
    setCachedResult(cacheKey, result);
    return result;
  } catch (error) {
    console.error('[LLM][ERROR] OpenAI call failed:', error);
    throw error;
  }
}

// --- ADVANCED ROW ENRICHMENT WITH GROUNDING ---
async function enrichRowWithLLM(
  row: Record<string, any>, 
  fieldsToEnrich: string[], 
  category: string,
  tierConfig: any,
  groundingExamples: any[],
  fieldDefinitions: any
): Promise<any> {
  const productName = row['Product Name'] || row['Title'] || row['productName'] || 'Unknown Product';
  
  const prompt = generateAdvancedPrompt(
    tierConfig, 
    productName, 
    category, 
    fieldsToEnrich, 
    row,
    groundingExamples,
    fieldDefinitions
  );

  console.log('[LLM][ENRICH] Calling LLM for enrichment...');
  const result = await callLLM(prompt, row, tierConfig.dataQuality);
  console.log('[LLM][ENRICH] LLM result:', result);
  
  return result;
}

// --- DYNAMIC FIELD SELECTION LOGIC ---
function getFieldsToEnrich(row: Record<string, any>, outputColumns: string[], tierConfig: any): string[] {
  // Always fill these fields if blank
  const mustFill = ["Product Name", "Brand Name", "Price", "SKU"];
  
  // Find blank must-fill fields
  const blankMustFill = mustFill.filter(f => 
    outputColumns.includes(f) && (!row[f] || row[f].trim() === "")
  );
  
  // Find other blank fields, sorted by importance
  const otherBlank = outputColumns.filter(f => 
    !mustFill.includes(f) && (!row[f] || row[f].trim() === "")
  );
  
  // Fill up to fillPercentage of all fields, prioritizing mustFill
  const totalToFill = Math.ceil(outputColumns.length * tierConfig.fillPercentage);
  const fieldsToEnrich = [...blankMustFill, ...otherBlank].slice(0, totalToFill);
  
  return fieldsToEnrich;
}

// --- MAIN TRANSFORMER FUNCTION ---
export const handleProcess = async (req: Request, res?: Response) => {
  console.log('[DEBUG] handleProcess CALLED');
  const startTime = Date.now();
  const params = req && req.params ? req.params : {};
  const body = req && req.body ? req.body : {};
  const headers = req && req.headers ? req.headers : {};
  const id = params.id || null;
  const uploadPath = path.join("temp_uploads", String(id) + ".csv");
  const groundingRoot = "grounding/walmart";
  const templateRoot = "attached_assets/templates/walmart";
  const outputPath = path.join("outputs", `${id}_output.xlsx`);

  logger.info('handleProcess called', { requestId: headers['x-request-id'] || null, time: new Date().toISOString(), id, uploadPath });
  console.log(`[TRANSFORMER] handleProcess called for id: ${id}, uploadPath: ${uploadPath}`);

  // --- Log received processing mode ---
  const processingMode = body?.tier || body?.mode || 'unknown';
  console.log(`[TRANSFORMER][MODE] Processing mode: ${processingMode}`);

  // Ensure tier is always defined and available
  const tier = (body && body.tier) || (req.query && req.query.tier) || "free";
  const validTiers = ['free', 'basic', 'premium', 'god_mode', 'ultra'];
  const tierKey = validTiers.includes(tier) ? tier : 'free';
  const tierConfig = TIER_CONFIG[tierKey as keyof typeof TIER_CONFIG] || TIER_CONFIG['free'];

  console.log(`[TRANSFORMER][TIER] Using tier: ${tierKey}, config:`, tierConfig);

  const warnings: string[] = [];
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

    // Parse CSV
    const csvData = fs.readFileSync(uploadPath, "utf8");
    let { data: rows, errors: parseErrors } = Papa.parse(csvData, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header: string) => header.trim()
    });

    if (parseErrors.length > 0) {
      logger.warn('[CSV][DEBUG] Parse errors', { parseErrors });
    }

    // Category detection
    let category: string | undefined = (body && body.category && body.category !== 'auto' && body.category !== 'Auto-detect with AI') ? body.category : undefined;
    if (!category) {
      category = await detectCategory(rows, groundingRoot);
      logger.info('Category auto-detected', { category });
    } else {
      logger.info('Category provided by FE', { category });
    }

    // Load template and field definitions
    const { templateKeys, fieldDefinitions } = await loadTemplateAndFields(category, groundingRoot);
    logger.info('Template loaded', { fieldCount: templateKeys.length });

    // Load grounding examples
    const groundingExamples = await loadGroundingExamples(category, groundingRoot);
    logger.info('Grounding examples loaded', { count: groundingExamples.length });

    // Extract output columns from template
    const cachedTemplate = templateCache.get(category);
    if (!cachedTemplate) {
      throw new Error(`Template not found in cache for category: ${category}`);
    }

    const worksheet = cachedTemplate.getWorksheet("Product Content And Site Exp");
    if (!worksheet) {
      throw new Error("Worksheet 'Product Content And Site Exp' not found in template XLSX");
    }

    const row3 = worksheet.getRow(3).values;
    const outputColumns: string[] = Array.isArray(row3)
      ? row3.slice(1).map(v => (typeof v === 'string' ? v : String(v))).filter((v: string) => typeof v === 'string' && v.length > 0)
      : [];

    console.log('[TRANSFORMER][LOG] Input headers:', Object.keys(rows[0] || {}));
    console.log('[TRANSFORMER][LOG] Output columns:', outputColumns);

    // Build header mapping
    const inputHeaders: string[] = Object.keys(rows[0] || {});
    const normalize = (str: string) => String(str).toLowerCase().replace(/[^a-z0-9]/g, '');
    
    const COMMON_ALIASES: Record<string, string[]> = {
      'Product Name': ['productname', 'title', 'name'],
      'Brand Name': ['brand', 'brandname'],
      'SKU': ['sku', 'itemsku', 'productsku', 'identifier'],
      'Price': ['price', 'sellingprice', 'retailprice'],
      'Site Description': ['description', 'sitedescription', 'shortdescription'],
      'Color': ['color', 'colorfinish'],
      'Storage': ['storage', 'memoryoption'],
      'Qty': ['qty', 'quantity', 'unitcount'],
      'Weight': ['weight'],
      'Material': ['material'],
    };

    const normalizedInputHeaders = inputHeaders.map(normalize);
    const normalizedTemplateColumns = outputColumns.map(normalize);

    // Build header mapping
    const headerMapping: Record<string, string> = {};
    for (const col of outputColumns) {
      const normCol = normalize(col);
      let mapped = false;
      
      for (let i = 0; i < inputHeaders.length; i++) {
        const normInput = normalizedInputHeaders[i];
        if (normCol === normInput) {
          headerMapping[col] = inputHeaders[i];
          mapped = true;
          break;
        }
        
        // Alias match
        if (COMMON_ALIASES[col] && COMMON_ALIASES[col].includes(normInput)) {
          headerMapping[col] = inputHeaders[i];
          mapped = true;
          break;
        }
      }
      
      if (!mapped) {
        // Fuzzy match
        const best = stringSimilarity.findBestMatch(normCol, normalizedInputHeaders);
        if (best.bestMatch.rating > 0.8) {
          headerMapping[col] = inputHeaders[best.bestMatchIndex];
        }
      }
    }

    // --- ADVANCED ROW PROCESSING WITH BATCHING ---
    const outputRows: any[] = [];
    let totalMapped = 0, totalEnriched = 0, totalLLMCalls = 0, totalErrors = 0;

    // Process rows in batches for efficiency
    const batchSize = Math.min(10, Math.max(1, Math.floor(rows.length / 4)));
    const batches = chunkArray(rows, batchSize);

    for (const [batchIndex, batch] of batches.entries()) {
      console.log(`[TRANSFORMER] Processing batch ${batchIndex + 1}/${batches.length} (${batch.length} rows)`);
      
      const batchPromises = batch.map(async (rowRaw, batchRowIndex) => {
        const row = rowRaw as Record<string, any>;
        const globalRowIndex = batchIndex * batchSize + batchRowIndex;
        const outputRow: Record<string, any> = {};
        
        // 1. Map vendor fields first (use input data)
        for (const col of outputColumns) {
          let value = '';
          if (headerMapping[col] && row[headerMapping[col]] != null) {
            const candidate = row[headerMapping[col]];
            if (typeof candidate === 'string' && candidate.trim().length >= 2) {
              value = candidate;
              totalMapped++;
            }
          }
          outputRow[col] = value;
        }

        // 2. Only enrich fields that are truly missing
        const fieldsToEnrich = getFieldsToEnrich(outputRow, outputColumns, tierConfig);
        
        if (fieldsToEnrich.length > 0) {
          try {
            const enrichResult = await enrichRowWithLLM(
              row, 
              fieldsToEnrich, 
              category,
              tierConfig,
              groundingExamples,
              fieldDefinitions
            );
            
            // Apply enriched results
            for (const field of fieldsToEnrich) {
              if (enrichResult && enrichResult[field] && enrichResult[field] !== 'AI_FILL') {
                outputRow[field] = enrichResult[field];
                totalEnriched++;
              }
            }
            totalLLMCalls++;
          } catch (e) {
            logger.error({ message: '[ENRICH] LLM error', globalRowIndex, error: e });
            totalErrors++;
          }
        }

        // 3. Only include rows with actual data
        if (Object.values(outputRow).some(v => v && v !== 'AI_FILL')) {
          return outputRow;
        }
        return null;
      });

      const batchResults = await Promise.all(batchPromises);
      outputRows.push(...batchResults.filter(r => r !== null));
    }

    // --- ANALYTICS AND LOGGING ---
    logger.info({ 
      message: '[SUMMARY] Advanced transformer complete', 
      totalRows: outputRows.length, 
      totalMapped, 
      totalEnriched, 
      totalLLMCalls, 
      totalErrors,
      tier: tierKey,
      category
    });

    console.log(`[TRANSFORMER] Output row count: ${outputRows.length}`);

    // Write output file
    if (outputRows.length === 0) {
      throw new Error('No output rows mapped. Check header mapping and input data.');
    }

    const workbook = cachedTemplate;
    let ws = workbook.getWorksheet('Product Content And Site Exp');
    if (!ws) ws = workbook.addWorksheet('Product Content And Site Exp');

    const DATA_START_ROW = 6;
    const HEADER_ROW_IDX = 5;

    // Clear existing data rows
    if (ws.rowCount >= DATA_START_ROW) {
      ws.spliceRows(DATA_START_ROW, ws.rowCount - DATA_START_ROW + 1);
    }

    // Write new data
    const rowArrays = outputRows.map(row => outputColumns.map((col: string) => row[col]));
    rowArrays.forEach((rowArr, idx) => {
      ws.insertRow(DATA_START_ROW + idx, rowArr);
    });

    await workbook.xlsx.writeFile(outputPath);
    logger.info({ message: '[OUTPUT] Output file written', outputPath, outputRows: outputRows.length });

    return { 
      success: true, 
      message: 'File processed with advanced transformer', 
      outputPath, 
      rowCount: outputRows.length,
      tier: tierKey,
      category,
      stats: {
        totalMapped,
        totalEnriched,
        totalLLMCalls,
        totalErrors
      }
    };

  } catch (err: unknown) {
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

// --- UTILITY FUNCTIONS ---

function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

function getRandomSample<T>(array: T[], size: number): T[] {
  const shuffled = [...array].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, size);
}

// Category detection with random sampling and better prompts
async function detectCategory(rows: any[], groundingRoot: string): Promise<string> {
  logger.info('Starting category detection');
  
  const knownCategories = fs.readdirSync(groundingRoot).filter((cat: string) => 
    fs.statSync(path.join(groundingRoot, String(cat))).isDirectory()
  );
  logger.info('Available categories', { categories: knownCategories });

  // Heuristic 1: Check for category column
  if (rows.length > 0) {
    const firstRow = rows[0];
    const categoryColumn = Object.keys(firstRow).find(key => 
      key.toLowerCase().includes('category') || key.toLowerCase().includes('type')
    );
    
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

  let matched = knownCategories.find((cat: string) => filename.includes(cat));
  if (!matched) {
    matched = knownCategories.find((cat: string) => 
      headerGuess.some(h => h.toLowerCase().includes(cat))
    );
  }

  if (matched) {
    logger.info('Category detected via heuristics', { category: matched });
    return matched;
  }

  // Default to base
  logger.info('No category detected, using base');
  return "base";
}

// Load template and field definitions
async function loadTemplateAndFields(category: string | undefined, groundingRoot: string) {
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

type GroundingExample = Record<string, any>;

async function loadGroundingExamples(category: string | undefined, groundingRoot: string, maxRows = 5): Promise<GroundingExample[]> {
  try {
    const xlsxPath = path.join(groundingRoot, String(category || "base"), "sample_vendor_feed.xlsx");
    const baseXlsxPath = path.join(groundingRoot, "base", "sample_vendor_feed.xlsx");
    let fileToRead: string = "";
    
    if (fs.existsSync(xlsxPath)) {
      fileToRead = xlsxPath;
    } else if (fs.existsSync(baseXlsxPath)) {
      fileToRead = baseXlsxPath;
      logger.warn('No sample_vendor_feed.xlsx for category, using base', { 
        requestedCategory: category 
      });
    } else {
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
    const headerRow: string[] = Array.isArray(headerRaw)
      ? headerRaw.map(v => v === undefined || v === null ? '' : String(v))
      : [];
    const examples: GroundingExample[] = [];
    
    for (let i = 2; i <= Math.min(worksheet.rowCount, (headerRow.length > 0 ? maxRows : 0) + 1); i++) {
      const rowRaw = worksheet.getRow(i).values;
      const row: string[] = Array.isArray(rowRaw)
        ? rowRaw.map(v => v === undefined || v === null ? '' : String(v))
        : [];
      if (!row.length) continue;
      
      const obj: Record<string, any> = {};
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
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.warn('Failed to load grounding examples, proceeding without them', { 
      category, 
      error: errorMessage 
    });
    return [];
  }
}

// Analytics placeholder
function pushAnalyticsAndFlyLogs(_data: any) { 
  // Analytics can be restored here if needed
}


