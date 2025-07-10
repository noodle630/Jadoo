import * as fs from "fs";
import * as path from "path";
import Papa from "papaparse";
import ExcelJS from "exceljs";
import { Request, Response } from "express";
import supabase from "../../supabaseClient.js";
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

// --- UPDATED TIER-BASED ENRICHMENT CONFIGURATION WITH IMPORTANCE LOGIC ---
const TIER_CONFIG = {
  free: {
    maxRows: 100,
    importanceStrategy: {
      required: "fill_all",      // Fill all required fields
      recommended: "fill_basic", // Fill basic recommended fields only
      optional: "skip"           // Skip optional fields
    },
    model: "gpt-4o-mini",
    dataQuality: "basic", // Basic product info only
    features: ["Product Name", "Brand Name", "Price", "SKU", "Description"]
  },
  ultra: {
    maxRows: 5000,
    importanceStrategy: {
      required: "fill_all",        // Fill all required fields
      recommended: "fill_all",     // Fill all recommended fields
      optional: "fill_important"   // Fill important optional fields
    },
    model: "gpt-4o",
    dataQuality: "ultra", // Ultra optimization
    features: ["*"] // All fields
  },
  god_mode: {
    maxRows: 2000,
    importanceStrategy: {
      required: "fill_all",        // Fill all required fields
      recommended: "fill_all",     // Fill all recommended fields
      optional: "fill_all"         // Fill all optional fields
    },
    model: "gpt-4o",
    dataQuality: "enterprise", // Maximum optimization
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
    free: "Fill in basic product information only. Focus on essential fields like brand name and basic descriptions.",
    ultra: "Provide comprehensive product information with detailed descriptions and specifications.",
    god_mode: "Generate enterprise-level product data with maximum detail, accuracy, and compliance."
  };

  // Build field-specific instructions with metadata
  let fieldInstructions = "";
  fieldsToEnrich.forEach(field => {
    const fieldDef = fieldDefinitions[field];
    if (fieldDef) {
      fieldInstructions += `\n\n**${field}**:`;
      if (fieldDef.description) {
        fieldInstructions += `\nDescription: ${fieldDef.description}`;
      }
      if (fieldDef.examples && fieldDef.examples.length > 0) {
        fieldInstructions += `\nExamples: ${fieldDef.examples.join(', ')}`;
      }
      if (fieldDef.allowed_values && fieldDef.allowed_values.length > 0) {
        fieldInstructions += `\nAllowed values: ${fieldDef.allowed_values.join(', ')}`;
        fieldInstructions += `\nIMPORTANT: For this field, ONLY use one of the allowed values. If unsure, leave blank.`;
      }
      if (fieldDef.recommended_values) {
        fieldInstructions += `\nRecommended values: ${fieldDef.recommended_values}`;
      }
      if (fieldDef.min_characters || fieldDef.max_characters) {
        fieldInstructions += `\nCharacter limits: ${fieldDef.min_characters || 0}-${fieldDef.max_characters || 'unlimited'} characters`;
      }
      if (fieldDef.min_values || fieldDef.max_values) {
        fieldInstructions += `\nValue limits: ${fieldDef.min_values || 0}-${fieldDef.max_values || 'unlimited'} values`;
      }
    }
  });

  // Build sample vendor examples section
  let sampleExamples = "";
  if (groundingExamples && groundingExamples.length > 0) {
    sampleExamples = "\n\n**SAMPLE VENDOR EXAMPLES:**\n";
    // Show first 3 examples as reference
    groundingExamples.slice(0, 3).forEach((example, idx) => {
      sampleExamples += `\nExample ${idx + 1}:\n`;
      Object.entries(example).forEach(([key, value]) => {
        if (fieldsToEnrich.includes(key) && value) {
          sampleExamples += `  ${key}: ${value}\n`;
        }
      });
    });
    sampleExamples += "\nUse these examples as reference for similar products, but adapt to the specific product being processed.";
  }

  return `You are an expert product data specialist for ${category} products on Walmart marketplace. 

**TIER LEVEL:** ${tierConfig.dataQuality}
**INSTRUCTIONS:** ${tierSpecificInstructions[tierConfig.dataQuality as keyof typeof tierSpecificInstructions]}

**PRODUCT TO PROCESS:**
Product Name: ${productName}
Category: ${category}

**INPUT DATA:**
${JSON.stringify(row, null, 2)}

**FIELDS TO ENRICH:**
${fieldsToEnrich.join(', ')}

**FIELD-SPECIFIC INSTRUCTIONS:**${fieldInstructions}

**CRITICAL RULES:**
1. For fields with allowed values, ONLY use one of the allowed values. If unsure, leave blank.
2. Use the sample vendor examples as reference for similar products.
3. Ensure all values are accurate and realistic for the specific product.
4. Follow Walmart's data quality standards for ${category} products.
5. If a field requires specific formatting or validation, follow those requirements exactly.
6. For technical specifications, use industry-standard terminology.
7. For descriptions, be detailed but concise and accurate.

**OUTPUT FORMAT:**
Return a JSON object with only the fields that need enrichment. Use the exact field names provided.${sampleExamples}

**RESPONSE:**
Provide a JSON object with enriched values for the specified fields.`;
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

  // Log allowed values for each field to enrich
  fieldsToEnrich.forEach(field => {
    const def = fieldDefinitions[field] || {};
    if (def.allowed_values && def.allowed_values.length > 0) {
      console.log(`[LLM][ALLOWED_VALUES] Field: ${field}, Allowed: ${def.allowed_values.join(', ')}`);
    }
  });
  
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

// --- DYNAMIC FIELD SELECTION LOGIC WITH IMPORTANCE-BASED TIER STRATEGY ---
function getFieldsToEnrich(row: Record<string, any>, outputColumns: string[], tierConfig: any, headerInfo?: Array<{column: string, importance: string}>): string[] {
  // Build importance map for quick lookup
  const importanceMap: Record<string, string> = {};
  if (headerInfo) {
    headerInfo.forEach(h => {
      importanceMap[h.column] = h.importance.toLowerCase();
    });
  }

  // Always fill these critical fields if blank (regardless of template importance)
  const mustFill = ["Product Name", "Brand Name", "Price", "SKU"];
  
  // Find blank must-fill fields
  const blankMustFill = mustFill.filter(f => 
    outputColumns.includes(f) && (!row[f] || String(row[f]).trim() === "")
  );
  
  // Categorize other blank fields by importance
  const blankByImportance = {
    required: [] as string[],
    recommended: [] as string[],
    optional: [] as string[]
  };
  
  outputColumns.forEach(f => {
    if (!mustFill.includes(f) && (!row[f] || String(row[f]).trim() === "")) {
      const importance = importanceMap[f] || '';
      if (importance.includes('required')) {
        blankByImportance.required.push(f);
      } else if (importance.includes('recommended')) {
        blankByImportance.recommended.push(f);
      } else {
        blankByImportance.optional.push(f);
      }
    }
  });
  
  // Apply tier-specific importance strategy
  const strategy = tierConfig.importanceStrategy;
  const fieldsToEnrich: string[] = [...blankMustFill];
  
  // Handle required fields
  if (strategy.required === "fill_all") {
    fieldsToEnrich.push(...blankByImportance.required);
  }
  
  // Handle recommended fields
  if (strategy.recommended === "fill_all") {
    fieldsToEnrich.push(...blankByImportance.recommended);
  } else if (strategy.recommended === "fill_basic") {
    // For basic recommended fields, only fill the most important ones
    const basicRecommended = blankByImportance.recommended.filter(f => 
      f.toLowerCase().includes('description') || 
      f.toLowerCase().includes('image') || 
      f.toLowerCase().includes('color') ||
      f.toLowerCase().includes('condition')
    );
    fieldsToEnrich.push(...basicRecommended);
  }
  
  // Handle optional fields
  if (strategy.optional === "fill_all") {
    fieldsToEnrich.push(...blankByImportance.optional);
  } else if (strategy.optional === "fill_important") {
    // For important optional fields, only fill high-value ones
    const importantOptional = blankByImportance.optional.filter(f => 
      f.toLowerCase().includes('warranty') || 
      f.toLowerCase().includes('feature') || 
      f.toLowerCase().includes('specification') ||
      f.toLowerCase().includes('technology')
    );
    fieldsToEnrich.push(...importantOptional);
  }
  
  // Log importance-based strategy breakdown
  const requiredCount = fieldsToEnrich.filter(f => importanceMap[f]?.includes('required')).length;
  const recommendedCount = fieldsToEnrich.filter(f => importanceMap[f]?.includes('recommended')).length;
  const optionalCount = fieldsToEnrich.length - requiredCount - recommendedCount - blankMustFill.length;
  
  console.log(`[ENRICH] Tier strategy: ${tierConfig.dataQuality}`);
  console.log(`[ENRICH] Required fields: ${requiredCount}/${blankByImportance.required.length} (${strategy.required})`);
  console.log(`[ENRICH] Recommended fields: ${recommendedCount}/${blankByImportance.recommended.length} (${strategy.recommended})`);
  console.log(`[ENRICH] Optional fields: ${optionalCount}/${blankByImportance.optional.length} (${strategy.optional})`);
  console.log(`[ENRICH] Total fields to enrich: ${fieldsToEnrich.length}`);
  
  return fieldsToEnrich;
}

// --- OPTIMIZED FIELD SELECTION TO REDUCE LLM CALLS ---
function getFieldsToEnrichOptimized(row: Record<string, any>, outputColumns: string[], tierConfig: any, headerInfo?: Array<{column: string, importance: string}>): string[] {
  // Build importance map for quick lookup
  const importanceMap: Record<string, string> = {};
  if (headerInfo) {
    headerInfo.forEach(h => {
      importanceMap[h.column] = h.importance.toLowerCase();
    });
  }

  // Always fill these critical fields if blank (regardless of template importance)
  const mustFill = ["Product Name", "Brand Name", "Price", "SKU"];
  
  // Find blank must-fill fields
  const blankMustFill = mustFill.filter(f => 
    outputColumns.includes(f) && (!row[f] || String(row[f]).trim() === "")
  );
  
  // Categorize other blank fields by importance
  const blankByImportance = {
    required: [] as string[],
    recommended: [] as string[],
    optional: [] as string[]
  };
  
  outputColumns.forEach(f => {
    if (!mustFill.includes(f) && (!row[f] || String(row[f]).trim() === "")) {
      const importance = importanceMap[f] || '';
      if (importance.includes('required')) {
        blankByImportance.required.push(f);
      } else if (importance.includes('recommended')) {
        blankByImportance.recommended.push(f);
      } else {
        blankByImportance.optional.push(f);
      }
    }
  });

  // Apply tier-specific importance strategy with optimization
  const strategy = tierConfig.importanceStrategy;
  const fieldsToEnrich: string[] = [...blankMustFill];
  
  // Handle required fields
  if (strategy.required === "fill_all") {
    fieldsToEnrich.push(...blankByImportance.required);
  }
  
  // Handle recommended fields with optimization
  if (strategy.recommended === "fill_all") {
    // For performance, limit to top 30 most important recommended fields
    const topRecommended = blankByImportance.recommended
      .filter(f => 
        f.toLowerCase().includes('description') || 
        f.toLowerCase().includes('image') || 
        f.toLowerCase().includes('color') ||
        f.toLowerCase().includes('condition') ||
        f.toLowerCase().includes('brand') ||
        f.toLowerCase().includes('model') ||
        f.toLowerCase().includes('feature') ||
        f.toLowerCase().includes('specification')
      )
      .slice(0, 30);
    fieldsToEnrich.push(...topRecommended);
  } else if (strategy.recommended === "fill_basic") {
    // For basic recommended fields, only fill the most important ones
    const basicRecommended = blankByImportance.recommended.filter(f => 
      f.toLowerCase().includes('description') || 
      f.toLowerCase().includes('image') || 
      f.toLowerCase().includes('color') ||
      f.toLowerCase().includes('condition')
    );
    fieldsToEnrich.push(...basicRecommended);
  }
  
  // Handle optional fields with strict limits for performance
  if (strategy.optional === "fill_all") {
    // Limit optional fields to top 15 for performance
    const topOptional = blankByImportance.optional
      .filter(f => 
        f.toLowerCase().includes('warranty') || 
        f.toLowerCase().includes('feature') || 
        f.toLowerCase().includes('specification') ||
        f.toLowerCase().includes('technology')
      )
      .slice(0, 15);
    fieldsToEnrich.push(...topOptional);
  } else if (strategy.optional === "fill_important") {
    // For important optional fields, only fill high-value ones
    const importantOptional = blankByImportance.optional.filter(f => 
      f.toLowerCase().includes('warranty') || 
      f.toLowerCase().includes('feature') || 
      f.toLowerCase().includes('specification') ||
      f.toLowerCase().includes('technology')
    );
    fieldsToEnrich.push(...importantOptional);
  }
  
  // Performance optimization: Limit total fields to prevent massive LLM calls
  const maxFields = tierConfig.dataQuality === 'enterprise' ? 50 : 
                   tierConfig.dataQuality === 'ultra' ? 40 : 25;
  
  const optimizedFields = fieldsToEnrich.slice(0, maxFields);
  
  // Log importance-based strategy breakdown
  const requiredCount = optimizedFields.filter(f => importanceMap[f]?.includes('required')).length;
  const recommendedCount = optimizedFields.filter(f => importanceMap[f]?.includes('recommended')).length;
  const optionalCount = optimizedFields.length - requiredCount - recommendedCount - blankMustFill.length;
  
  console.log(`[ENRICH] Tier strategy: ${tierConfig.dataQuality}`);
  console.log(`[ENRICH] Required fields: ${requiredCount}/${blankByImportance.required.length} (${strategy.required})`);
  console.log(`[ENRICH] Recommended fields: ${recommendedCount}/${blankByImportance.recommended.length} (${strategy.recommended})`);
  console.log(`[ENRICH] Optional fields: ${optionalCount}/${blankByImportance.optional.length} (${strategy.optional})`);
  console.log(`[ENRICH] Total fields to enrich: ${optimizedFields.length} (limited from ${fieldsToEnrich.length} for performance)`);
  
  return optimizedFields;
}

// Helper: Try to find a matching example from sample_vendor_feed.xlsx for a given row and field
function findSampleVendorValue(row: Record<string, any>, field: string, groundingExamples: any[]): string | undefined {
  if (!groundingExamples || groundingExamples.length === 0) return undefined;
  // Try to match by SKU or Product Name (case-insensitive, partial ok)
  const inputSku = (row['SKU'] || row['sku'] || '').toString().toLowerCase();
  const inputName = (row['Product Name'] || row['productName'] || row['Title'] || '').toString().toLowerCase();
  for (const example of groundingExamples) {
    const exampleSku = (example['SKU'] || example['sku'] || '').toString().toLowerCase();
    const exampleName = (example['Product Name'] || example['productName'] || example['Title'] || '').toString().toLowerCase();
    if ((inputSku && exampleSku && inputSku === exampleSku) ||
        (inputName && exampleName && inputName && exampleName && inputName.includes(exampleName))) {
      if (example[field] && String(example[field]).trim().length > 0) {
        return String(example[field]);
      }
    }
  }
  return undefined;
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
  const validTiers = ['free', 'ultra', 'god_mode'];
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

    // Log first five lines of raw CSV for debugging
    let csvRaw = fs.readFileSync(uploadPath, "utf8");
    // Strip BOM if present
    if (csvRaw.charCodeAt(0) === 0xFEFF) {
      csvRaw = csvRaw.slice(1);
      console.log('[CSV][DEBUG] BOM detected and removed');
    }
    const csvLines = csvRaw.split(/\r?\n/);
    for (let i = 0; i < Math.min(5, csvLines.length); i++) {
      const chars = csvLines[i].split('').map(c => c.charCodeAt(0)).join(',');
      console.log(`[CSV][DEBUG] Line ${i + 1}:`, csvLines[i]);
      console.log(`[CSV][DEBUG] Line ${i + 1} char codes:`, chars);
    }

    // Try auto-detect delimiter, fallback to comma, then tab, then semicolon
    let parseResult = Papa.parse(csvRaw, {
      header: true,
      skipEmptyLines: true,
      delimiter: '', // auto-detect
      transformHeader: (header: string) => header.trim()
    });
    let rows = parseResult.data;
    let parseErrors = parseResult.errors;
    let inputHeaders = rows.length > 0 ? Object.keys(rows[0] || {}) : [];
    console.log('[DEBUG][CSV_PARSE] Parsed rows count:', rows.length);
    if (rows.length > 0) {
      console.log('[DEBUG][CSV_PARSE] First row:', rows[0]);
      console.log('[DEBUG][CSV_PARSE] Input headers:', inputHeaders);
    } else {
      console.log('[DEBUG][CSV_PARSE] No rows parsed!');
    }
    if (inputHeaders.length === 1) {
      // Try comma
      parseResult = Papa.parse(csvRaw, { header: true, skipEmptyLines: true, delimiter: ',', transformHeader: (h: string) => h.trim() });
      rows = parseResult.data;
      parseErrors = parseResult.errors;
      const inputHeadersComma = rows.length > 0 ? Object.keys(rows[0] || {}) : [];
      if (inputHeadersComma.length > 1) {
        inputHeaders = inputHeadersComma;
      }
    }
    console.log('[DEBUG][PARSE_ERRORS] Delimiter:', parseResult.meta.delimiter, 'Errors:', parseErrors);
    if (inputHeaders.length === 1) {
      // Try tab
      parseResult = Papa.parse(csvRaw, { header: true, skipEmptyLines: true, delimiter: '\t', transformHeader: (h: string) => h.trim() });
      rows = parseResult.data;
      parseErrors = parseResult.errors;
      const inputHeadersTab = rows.length > 0 ? Object.keys(rows[0] || {}) : [];
      if (inputHeadersTab.length > 1) {
        inputHeaders = inputHeadersTab;
      }
    }
    console.log('[DEBUG][PARSE_ERRORS] Delimiter:', parseResult.meta.delimiter, 'Errors:', parseErrors);
    if (inputHeaders.length === 1) {
      // Try semicolon
      parseResult = Papa.parse(csvRaw, { header: true, skipEmptyLines: true, delimiter: ';', transformHeader: (h: string) => h.trim() });
      rows = parseResult.data;
      parseErrors = parseResult.errors;
      const inputHeadersSemicolon = rows.length > 0 ? Object.keys(rows[0] || {}) : [];
      if (inputHeadersSemicolon.length > 1) {
        inputHeaders = inputHeadersSemicolon;
      }
    }
    console.log('[DEBUG][PARSE_ERRORS] Delimiter:', parseResult.meta.delimiter, 'Errors:', parseErrors);
    if (inputHeaders.length === 1) {
      console.error('[CSV][ERROR] Header could not be split into columns. Raw header line:', csvLines[0]);
      throw new Error('CSV header could not be split into columns. Please check the file encoding and delimiter.');
    }
    if (parseErrors.length > 0) {
      logger.warn('[CSV][DEBUG] Parse errors', { parseErrors });
    }
    console.log('[DEBUG][PARSE_ERRORS] Delimiter:', parseResult.meta.delimiter, 'Errors:', parseErrors);

    // Category detectiona
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

    // Extract output columns from template using multi-row analysis
    const cachedTemplate = templateCache.get(category);
    if (!cachedTemplate) {
      throw new Error(`Template not found in cache for category: ${category}`);
    }

    const worksheet = cachedTemplate.getWorksheet("Product Content And Site Exp");
    if (!worksheet) {
      throw new Error("Worksheet 'Product Content And Site Exp' not found in template XLSX");
    }

    // Read rows 1-5 for comprehensive header analysis
    const row1 = worksheet.getRow(1).values; // Walmart importance indicators
    const row2 = worksheet.getRow(2).values; // Additional header info
    const row3 = worksheet.getRow(3).values; // Main headers (current logic)
    const row4 = worksheet.getRow(4).values; // Final headers (where we write data)
    const row5 = worksheet.getRow(5).values; // Data starts here

    // Build comprehensive header information
    const headerInfo: Array<{
      column: string,
      importance: string, // From row 1: "Required", "Recommended", etc.
      header2: string,    // From row 2
      header3: string,    // From row 3  
      header4: string,    // From row 4 (final header)
      index: number
    }> = [];

    // Process each column (skip first column which is often empty or merged)
    for (let i = 1; i < Math.max(row1.length, row2.length, row3.length, row4.length); i++) {
      const importance = String(row1[i] || '').trim();
      const header2 = String(row2[i] || '').trim();
      const header3 = String(row3[i] || '').trim();
      const header4 = String(row4[i] || '').trim();
      
      // Use row 4 as the primary header (where data is written)
      const primaryHeader = header4 || header3 || header2;
      
      if (primaryHeader && primaryHeader.length > 0) {
        headerInfo.push({
          column: primaryHeader,
          importance,
          header2,
          header3,
          header4,
          index: i
        });
      }
    }

    // Extract final output columns (from row 4, which is where data is written)
    const outputColumns: string[] = headerInfo.map(h => h.column);

    // Log header analysis for debugging
    console.log('[TRANSFORMER][HEADER_ANALYSIS] Multi-row header extraction:');
    console.log(`[TRANSFORMER][HEADER_ANALYSIS] Found ${outputColumns.length} columns`);
    console.log('[TRANSFORMER][HEADER_ANALYSIS] Sample headers with importance:');
    headerInfo.slice(0, 5).forEach(h => {
      console.log(`  "${h.column}" (${h.importance})`);
    });

    console.log('[TRANSFORMER][LOG] Input headers:', Object.keys(rows[0] || {}));
    console.log('[TRANSFORMER][LOG] Output columns:', outputColumns);

    // Build header mapping
    const normalize = (str: string) => String(str).toLowerCase().replace(/[^a-z0-9]/g, '');
    
    const COMMON_ALIASES: Record<string, string[]> = {
      'Product Name': ['productname', 'title', 'name', 'product name'],
      'Brand Name': ['brand', 'brandname', 'brand name'],
      'SKU': ['sku', 'itemsku', 'productsku', 'identifier', 'your sku'],
      'Price': ['price', 'sellingprice', 'retailprice', 'min price'],
      'Site Description': ['description', 'sitedescription', 'shortdescription'],
      'Color': ['color', 'colorfinish'],
      'Storage': ['storage', 'memoryoption'],
      'Qty': ['qty', 'quantity', 'unitcount'],
      'Weight': ['weight'],
      'Material': ['material'],
      'SKU Condition': ['condition', 'sku condition'],
      'SKU Battery Health': ['battery', 'battery health', 'sku battery health'],
    };

    const normalizedInputHeaders = inputHeaders.map(normalize);
    const normalizedTemplateColumns = outputColumns.map(normalize);

    // Build header mapping
    const headerMapping: Record<string, string> = {};
    for (const col of outputColumns) {
      const normCol = normalize(col);
      let mapped = false;
      // Try direct match
      for (let i = 0; i < inputHeaders.length; i++) {
        const normInput = normalize(inputHeaders[i]);
        if (normCol === normInput) {
          headerMapping[col] = inputHeaders[i];
          mapped = true;
          console.log(`[HEADER_MAPPING][DIRECT] "${col}" -> "${inputHeaders[i]}"`);
          break;
        }
      }
      // Try alias match
      if (!mapped) {
        for (const [alias, aliasList] of Object.entries(COMMON_ALIASES)) {
          if (alias === col && aliasList) {
            for (const aliasName of aliasList) {
              for (let i = 0; i < inputHeaders.length; i++) {
                if (normalize(inputHeaders[i]) === aliasName) {
          headerMapping[col] = inputHeaders[i];
          mapped = true;
                  console.log(`[HEADER_MAPPING][ALIAS] "${col}" -> "${inputHeaders[i]}"`);
          break;
        }
      }
              if (mapped) break;
            }
          }
          if (mapped) break;
        }
      }
      // Try fuzzy match
      if (!mapped) {
        const best = stringSimilarity.findBestMatch(normCol, inputHeaders.map(normalize));
        if (best.bestMatch.rating > 0.7) {
          headerMapping[col] = inputHeaders[best.bestMatchIndex];
          mapped = true;
          console.log(`[HEADER_MAPPING][FUZZY] "${col}" -> "${inputHeaders[best.bestMatchIndex]}" (score: ${best.bestMatch.rating})`);
      }
    }
      // Fallback: substring
      if (!mapped) {
        for (const inputHeader of inputHeaders) {
          if (inputHeader.toLowerCase().includes(col.toLowerCase()) || col.toLowerCase().includes(inputHeader.toLowerCase())) {
            headerMapping[col] = inputHeader;
            mapped = true;
            console.log(`[HEADER_MAPPING][SUBSTRING] "${col}" -> "${inputHeader}"`);
            break;
          }
        }
      }
      if (!mapped) {
        console.log(`[HEADER_MAPPING][FAIL] No mapping for "${col}"`);
      }
    }
    console.log('[DEBUG][HEADER_MAPPING] headerMapping:', headerMapping);
    console.log('[DEBUG][HEADER_MAPPING] Input headers:', inputHeaders);
    console.log('[DEBUG][HEADER_MAPPING] Output columns:', outputColumns);

    // --- ADVANCED ROW PROCESSING WITH PERFORMANCE OPTIMIZATIONS ---
    const outputRows: any[] = [];
    let totalMapped = 0, totalEnriched = 0, totalLLMCalls = 0, totalErrors = 0;
    let cacheHits = 0;

    // Performance optimization: Increase batch size and parallel processing
    const batchSize = Math.min(20, Math.max(5, Math.floor(rows.length / 2))); // Larger batches, more parallel
    const batches = chunkArray(rows, batchSize);
    
    console.log(`[DEBUG][BATCH_PROCESS] Entering batch processing with ${rows.length} rows, ${batches.length} batches of size ${batchSize}`);

    for (const [batchIndex, batch] of batches.entries()) {
      const batchStartTime = Date.now();
      console.log(`[TRANSFORMER] Processing batch ${batchIndex + 1}/${batches.length} (${batch.length} rows)`);
      
      const batchPromises = batch.map(async (rowRaw, batchRowIndex) => {
        const rowStartTime = Date.now();
        const row = rowRaw as Record<string, any>;
        const globalRowIndex = batchIndex * batchSize + batchRowIndex;
        const outputRow: Record<string, any> = {};
        
        console.log(`[DEBUG][ROW_START] Processing row ${globalRowIndex}:`, Object.keys(row).slice(0, 5));
        
        // 1. Map vendor fields first (use input data)
        for (const col of outputColumns) {
          let value = '';
          // 1. Try to map from input data
          if (headerMapping[col] && row[headerMapping[col]] != null) {
            const candidate = row[headerMapping[col]];
            if (typeof candidate === 'string' && candidate.trim().length >= 2) {
              value = candidate;
              totalMapped++;
            } else if (typeof candidate === 'number' && candidate > 0) {
              value = String(candidate);
              totalMapped++;
            }
          }
          // 2. If still blank, try to map from sample_vendor_feed.xlsx
          if (!value && groundingExamples && groundingExamples.length > 0) {
            const sampleValue = findSampleVendorValue(row, col, groundingExamples);
            if (sampleValue) {
              value = sampleValue;
              // Optionally log this mapping for debug
              console.log(`[SAMPLE_VENDOR] Row ${globalRowIndex}: Used sample_vendor_feed.xlsx for field '${col}' value: ${value}`);
            }
          }
          outputRow[col] = value;
        }
        console.log(`[DEBUG][ROW_MAPPED] Row ${globalRowIndex}:`, outputRow);
        
        if (globalRowIndex < 3) {
          console.log(`[DEBUG][OUTPUT_ROW_BEFORE_FILTER] Row ${globalRowIndex}:`, outputRow);
        }
        
        // 2. Always set specProductType from field definitions if available
        if (fieldDefinitions && fieldDefinitions['specProductType'] && fieldDefinitions['specProductType'].product_type) {
          outputRow['specProductType'] = fieldDefinitions['specProductType'].product_type;
          console.log(`[MAP] Row ${globalRowIndex}: Set specProductType to "${fieldDefinitions['specProductType'].product_type}" from field definitions`);
        } else if (fieldDefinitions && fieldDefinitions['Spec Product Type'] && fieldDefinitions['Spec Product Type'].product_type) {
          // Try alternative field name
          outputRow['Spec Product Type'] = fieldDefinitions['Spec Product Type'].product_type;
          console.log(`[MAP] Row ${globalRowIndex}: Set Spec Product Type to "${fieldDefinitions['Spec Product Type'].product_type}" from field definitions`);
        } else {
          // Fallback: Use category name with proper Walmart casing
          const categoryToProductType: Record<string, string> = {
            'cell_phones': 'Cell Phones',
            'laptop_computers': 'Laptop Computers', 
            'desktop_computers': 'Desktop Computers',
            'tablet_computers': 'Tablet Computers',
            'computer_monitors': 'Computer Monitors',
            'televisions': 'Televisions',
            'headphones': 'Headphones',
            'portable_speakers': 'Portable Speakers',
            'sound_bars': 'Sound Bars',
            'smart_watches': 'Smart Watches',
            'video_game_consoles': 'Video Game Consoles'
          };
          
          const productType = categoryToProductType[category] || category.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
          
          // Try both field name variations
          if (outputColumns.includes('specProductType')) {
            outputRow['specProductType'] = productType;
          } else if (outputColumns.includes('Spec Product Type')) {
            outputRow['Spec Product Type'] = productType;
          }
          
          console.log(`[MAP] Row ${globalRowIndex}: Set product type to "${productType}" from category fallback`);
        }
        
        // 3. Strict validation for productIdType and product ID fields
        const validateAndSetProductIdFields = (fieldName: string, value: any) => {
          if (!fieldDefinitions[fieldName]) return value;
          
          const fieldDef = fieldDefinitions[fieldName];
          if (fieldDef.allowed_values && fieldDef.allowed_values.length > 0) {
            // Check if value is in allowed values
            const normalizedValue = String(value).toLowerCase().trim();
            const allowedValues = fieldDef.allowed_values.map((v: string) => String(v).toLowerCase().trim());
            
            if (allowedValues.includes(normalizedValue)) {
              return value; // Valid value, keep it
            } else {
              console.log(`[VALIDATION] Row ${globalRowIndex}: Invalid value "${value}" for field "${fieldName}". Allowed: ${fieldDef.allowed_values.join(', ')}`);
              return ''; // Invalid value, clear it
            }
          }
          return value; // No restrictions, keep value
        };
        
        // Apply validation to product ID related fields
        ['productIdType', 'Product ID Type', 'productId', 'Product ID'].forEach(fieldName => {
          if (outputColumns.includes(fieldName) && outputRow[fieldName]) {
            outputRow[fieldName] = validateAndSetProductIdFields(fieldName, outputRow[fieldName]);
          }
        });
        
        // Log mapping results for debugging (only first 3 rows)
        if (globalRowIndex < 3) {
          console.log(`[MAP] Row ${globalRowIndex}: Mapped ${Object.values(outputRow).filter(v => v && v !== '').length}/${outputColumns.length} fields`);
          console.log(`[MAP] Row ${globalRowIndex}: SKU=${outputRow['sku']}, Price=${outputRow['price']}, Product Name=${outputRow['productName']}`);
        }

        // 3. Only enrich fields that are truly missing
        const fieldsToEnrich = getFieldsToEnrichOptimized(outputRow, outputColumns, tierConfig, headerInfo);
        
        if (fieldsToEnrich.length > 0) {
          try {
            // Performance optimization: Check cache first
            const cacheKey = generateCacheKey(
              row['Product Name'] || 'Unknown', 
              fieldsToEnrich.join(',') + tierConfig.dataQuality
            );
            let enrichResult = getCachedResult(cacheKey);
            
            if (enrichResult) {
              console.log(`[CACHE] Row ${globalRowIndex}: Cache hit for similar product`);
              cacheHits++;
            } else {
              console.log(`[ENRICH] Row ${globalRowIndex}: Enriching ${fieldsToEnrich.length} fields: ${fieldsToEnrich.slice(0, 5).join(', ')}${fieldsToEnrich.length > 5 ? '...' : ''}`);
              
              const enrichStartTime = Date.now();
              enrichResult = await enrichRowWithLLMEnhanced(
              row, 
              fieldsToEnrich, 
              category,
              tierConfig,
              groundingExamples,
              fieldDefinitions
            );
              
              // Cache the result for future similar products
              setCachedResult(cacheKey, enrichResult);
              
              const enrichTime = Date.now() - enrichStartTime;
              console.log(`[PERFORMANCE] Row ${globalRowIndex}: LLM enrichment took ${enrichTime}ms`);
            }
            
            // Apply enriched results
            let enrichedCount = 0;
            for (const field of fieldsToEnrich) {
              if (enrichResult && enrichResult[field] && enrichResult[field] !== 'AI_FILL') {
                outputRow[field] = enrichResult[field];
                totalEnriched++;
                enrichedCount++;
              }
            }
            
            console.log(`[ENRICH] Row ${globalRowIndex}: Successfully enriched ${enrichedCount}/${fieldsToEnrich.length} fields`);
            totalLLMCalls++;
          } catch (e) {
            logger.error({ message: '[ENRICH] LLM error', globalRowIndex, error: e });
            totalErrors++;
            console.log(`[ENRICH] Row ${globalRowIndex}: LLM enrichment failed: ${e}`);
          }
        } else {
          console.log(`[ENRICH] Row ${globalRowIndex}: No fields need enrichment`);
        }

        // 4. Log missing required fields for quality tracking
        const missingRequiredFields: string[] = [];
        if (headerInfo) {
          headerInfo.forEach(h => {
            if (h.importance.toLowerCase().includes('required') && 
                (!outputRow[h.column] || String(outputRow[h.column]).trim() === '')) {
              missingRequiredFields.push(h.column);
            }
          });
        }
        
        if (missingRequiredFields.length > 0) {
          console.warn(`[QUALITY] Row ${globalRowIndex}: Missing required fields: ${missingRequiredFields.join(', ')}`);
          warnings.push(`Row ${globalRowIndex + 1}: Missing required fields: ${missingRequiredFields.join(', ')}`);
        }

        const rowTime = Date.now() - rowStartTime;
        if (globalRowIndex < 3) {
          console.log(`[PERFORMANCE] Row ${globalRowIndex}: Total processing time ${rowTime}ms`);
        }

        // 4. Only include rows with actual data
        const hasData = Object.values(outputRow).some(v => v && v !== 'AI_FILL');
        const filledFields = Object.values(outputRow).filter(v => v && v !== '').length;
        const totalFields = Object.values(outputRow).length;
        
        console.log(`[DEBUG][ROW_FILTER] Row ${globalRowIndex}: Has data = ${hasData}, filled fields = ${filledFields}/${totalFields}`);
        console.log(`[DEBUG][ROW_FILTER] Row ${globalRowIndex}: Sample values:`, Object.values(outputRow).slice(0, 5));
        
        // Less strict filtering: accept rows with at least one non-empty field
        const hasAnyData = Object.values(outputRow).some(v => v && v !== '' && v !== 'AI_FILL');
        
        if (hasAnyData) {
          console.log(`[DEBUG][ROW_ACCEPTED] Row ${globalRowIndex}: Accepted for output`);
          return outputRow;
        } else {
          console.log(`[DEBUG][ROW_REJECTED] Row ${globalRowIndex}: Rejected - no data`);
        return null;
        }
      });

      const batchResults = await Promise.all(batchPromises);
      const acceptedRows = batchResults.filter(r => r !== null);
      console.log(`[DEBUG][BATCH_RESULTS] Batch ${batchIndex + 1}: ${acceptedRows.length}/${batch.length} rows accepted`);
      outputRows.push(...acceptedRows);
      
      const batchTime = Date.now() - batchStartTime;
      console.log(`[PERFORMANCE] Batch ${batchIndex + 1}: Completed in ${batchTime}ms (${batchTime / batch.length}ms per row)`);
    }

    console.log(`[DEBUG][FINAL_OUTPUT] Total outputRows collected: ${outputRows.length}`);
    if (outputRows.length > 0) {
      console.log(`[DEBUG][FINAL_OUTPUT] Sample output row keys:`, Object.keys(outputRows[0]));
      console.log(`[DEBUG][FINAL_OUTPUT] Sample output row values:`, Object.values(outputRows[0]).slice(0, 5));
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
    console.log(`[TRANSFORMER] Summary: ${outputRows.length} rows processed, ${totalMapped} fields mapped, ${totalEnriched} fields enriched, ${totalLLMCalls} LLM calls, ${totalErrors} errors`);
    console.log(`[TRANSFORMER] Category: ${category}, Tier: ${tierKey}`);
    
    // Log sample of output data for verification
    if (outputRows.length > 0) {
      const sampleRow = outputRows[0];
      console.log(`[TRANSFORMER] Sample output row: SKU=${sampleRow['SKU']}, Price=${sampleRow['Price']}, Product Name=${sampleRow['Product Name']}`);
    }

    // Write output file
    if (outputRows.length === 0) {
      throw new Error('No output rows mapped. Check header mapping and input data.');
    }

    // Ensure freshWorkbook is defined and loaded from template
    const templatePath = path.join(templateRoot, `${category}.xlsx`);
    const baseTemplatePath = path.join(templateRoot, "base.xlsx");
    const xlsxToUse = fs.existsSync(templatePath) ? templatePath : baseTemplatePath;
    console.log(`[TRANSFORMER][WORKBOOK] Loading fresh template from: ${xlsxToUse}`);
    const freshWorkbook = new ExcelJS.Workbook();
    await freshWorkbook.xlsx.readFile(xlsxToUse);

    // Define constants for header and data start rows
    const HEADER_ROW_IDX = 5;
    const DATA_START_ROW = 6;

    // --- NEW WORKBOOK PER OUTPUT ---
    // Load template workbook and worksheet
    const templateWorkbook = new ExcelJS.Workbook();
    await templateWorkbook.xlsx.readFile(xlsxToUse);
    const templateWs = templateWorkbook.getWorksheet('Product Content And Site Exp');
    // Create a new workbook and worksheet for output
    const outputWorkbook = new ExcelJS.Workbook();
    const outputSheetName = 'Product Content And Site Exp';
    const outputWs = outputWorkbook.addWorksheet(outputSheetName);
    // Copy header rows (1-5) from template
    let headerOrder: string[] = [];
    if (templateWs) {
      for (let i = 1; i <= 5; i++) {
        const templateRow = templateWs.getRow(i);
        const values = templateRow.values;
        outputWs.getRow(i).values = values;
        if (i === 5) {
          // Row 5 is the main header row
          headerOrder = Array.isArray(values) ? values.slice(1).filter((v): v is string => typeof v === 'string') : [];
          console.log(`[DEBUG][HEADER_EXTRACTION] Row 5 values:`, values);
          console.log(`[DEBUG][HEADER_EXTRACTION] Extracted headerOrder:`, headerOrder);
        }
      }
    }
    // Explicitly set columns to match header order
    outputWs.columns = headerOrder.map(h => ({ header: h, key: h, width: 20 }));
    // Log outputRows length and sample
    console.log(`[TRANSFORMER][DEBUG] outputRows.length: ${outputRows.length}`);
    if (outputRows.length > 0) {
      console.log('[TRANSFORMER][DEBUG] Sample output row:', outputRows[0]);
    }

    console.log(`[DEBUG][WORKSHEET] Header order length: ${headerOrder.length}`);
    console.log(`[DEBUG][WORKSHEET] Header order sample:`, headerOrder.slice(0, 5));
    
    // Write new data rows using addRow (guaranteed compact)
    for (let i = 0; i < outputRows.length; i++) {
      const rowData = outputRows[i];
      // Convert rowData to array matching header order
      const rowArray = headerOrder.map(h => rowData[h]);
      console.log(`[DEBUG][WORKSHEET] Adding row ${i}:`, rowArray.slice(0, 5));
      outputWs.addRow(rowArray);
    }
    
    console.log(`[DEBUG][WORKSHEET] After adding rows, worksheet row count: ${outputWs.rowCount}`);
    console.log(`[DEBUG][WORKSHEET] After adding rows, worksheet actual row count: ${outputWs.actualRowCount}`);
    // Save output file
    await outputWorkbook.xlsx.writeFile(outputPath);
    console.log(`[TRANSFORMER][OUTPUT] Output file written with new workbook: ${outputPath}`);
    // Validate row count using actualRowCount
    const verifyWorkbook = new ExcelJS.Workbook();
    await verifyWorkbook.xlsx.readFile(outputPath);
    const verifyWs = verifyWorkbook.getWorksheet(outputSheetName);
    const verifyRowCount = verifyWs ? verifyWs.actualRowCount : -1;
    console.log(`[TRANSFORMER][OUTPUT] Verified output file actual row count: ${verifyRowCount}`);
    // Log last 5 rows to confirm they are not empty
    if (verifyWs) {
      for (let i = Math.max(1, verifyRowCount - 4); i <= verifyRowCount; i++) {
        console.log(`[TRANSFORMER][DEBUG] Output row ${i}:`, verifyWs.getRow(i).values);
      }
    }

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
        totalErrors,
        cacheHits
      },
      // Enhanced stats for frontend display
      summary: {
        total_rows: rows.length,
        processed_rows: outputRows.length,
        rowCount: outputRows.length,
        category: category,
        tier: tierKey,
        stats: {
          totalMapped,
          totalEnriched,
          totalLLMCalls,
          totalErrors,
          cacheHits
        },
        // Quality metrics
        fillRate: Math.round((totalMapped + totalEnriched) / (outputRows.length * outputColumns.length) * 100),
        requiredFieldsFilled: outputRows.length * (headerInfo?.filter(h => h.importance.toLowerCase().includes('required')).length || 0) - warnings.filter(w => w.includes('Missing required fields')).length,
        totalRequiredFields: outputRows.length * (headerInfo?.filter(h => h.importance.toLowerCase().includes('required')).length || 0),
        warnings: warnings,
        missingRequiredFields: warnings.filter(w => w.includes('Missing required fields')),
        processingTime: Date.now() - startTime,
        transformTime: Date.now() - startTime
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

// Generic category detection with AI fallback
async function detectCategory(rows: any[], groundingRoot: string): Promise<string> {
  logger.info('Starting generic category detection');
  
  const knownCategories = fs.readdirSync(groundingRoot).filter((cat: string) => 
    fs.statSync(path.join(groundingRoot, String(cat))).isDirectory()
  );
  logger.info('Available categories', { categories: knownCategories });

  // Step 1: Check for explicit category column
  if (rows.length > 0) {
    const firstRow = rows[0];
    const categoryColumn = Object.keys(firstRow).find(key => 
      key.toLowerCase().includes('category') || key.toLowerCase().includes('type') || key.toLowerCase().includes('product_type')
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

  // Step 2: Fast heuristics (cached, no LLM)
  const fastMatch = await detectCategoryFast(rows, knownCategories);
  if (fastMatch) {
    return fastMatch;
  }

  // Step 3: AI-powered category detection
  return await detectCategoryWithAI(rows, knownCategories);
}

// Fast heuristics for category detection (cached, no LLM)
async function detectCategoryFast(rows: any[], knownCategories: string[]): Promise<string | null> {
  if (rows.length === 0) return null;

  // Check filename
  const filename = path.basename(rows[0]?.filename || "").toLowerCase();
  let matched = knownCategories.find((cat: string) => filename.includes(cat));
  if (matched) {
    logger.info('Category detected via filename', { category: matched });
    return matched;
  }

  // Check headers for category hints
  const headerGuess = Object.keys(rows[0] || {});
    matched = knownCategories.find((cat: string) => 
      headerGuess.some(h => h.toLowerCase().includes(cat))
    );
  if (matched) {
    logger.info('Category detected via headers', { category: matched });
    return matched;
  }

  // Check for common field patterns that suggest categories
  const fieldPatterns: Record<string, string[]> = {
    'cell_phones': ['carrier', 'battery health', 'sim', 'storage', 'ram'],
    'laptop_computers': ['processor', 'ram', 'storage', 'gpu', 'battery'],
    'headphones': ['driver size', 'frequency response', 'noise cancellation', 'bluetooth'],
    'smart_watches': ['battery life', 'heart rate', 'gps', 'water resistance'],
    'televisions': ['screen size', 'resolution', 'refresh rate', 'hdr'],
    'computer_monitors': ['screen size', 'resolution', 'refresh rate', 'panel type']
  };

  for (const [category, patterns] of Object.entries(fieldPatterns)) {
    if (knownCategories.includes(category)) {
      const patternMatches = patterns.filter(pattern => 
        headerGuess.some(h => h.toLowerCase().includes(pattern))
      );
      
      if (patternMatches.length >= 2) { // At least 2 pattern matches
        logger.info('Category detected via field patterns', { category, patterns: patternMatches });
        return category;
      }
    }
  }

  return null; // No fast match found
}

// AI-powered category detection
async function detectCategoryWithAI(rows: any[], knownCategories: string[]): Promise<string> {
  logger.info('Using AI for category detection');
  
  try {
    // Sample 10% of rows (min 3, max 10)
    const sampleSize = Math.max(3, Math.min(10, Math.floor(rows.length * 0.1)));
    const sampleRows = rows.slice(0, sampleSize);
    
    // Find product name field
    const productNameField = Object.keys(sampleRows[0] || {}).find(key => 
      key.toLowerCase().includes('product') || key.toLowerCase().includes('name') || key.toLowerCase().includes('title')
    );
    
    if (!productNameField) {
      logger.info('No product name field found, using base');
  return "base";
    }

    // Extract product names
    const productNames = sampleRows.map(row => String(row[productNameField] || '')).filter(name => name.length > 0);
    
    if (productNames.length === 0) {
      logger.info('No product names found, using base');
      return "base";
    }

    // Check cache first
    const cacheKey = generateCacheKey(productNames.join('|'), 'category_detection');
    const cachedResult = getCachedResult(cacheKey);
    if (cachedResult) {
      logger.info('Category detection cache hit', { category: cachedResult });
      return cachedResult;
    }

    // Create AI prompt for category detection
    const prompt = `You are an expert at categorizing products for e-commerce marketplaces.

Available categories: ${knownCategories.join(', ')}

Product names to analyze:
${productNames.map((name, i) => `${i + 1}. ${name}`).join('\n')}

Instructions:
1. Determine if ALL products belong to the same category
2. If yes, return the exact category name from the available list
3. If no, or if unsure, return "base"
4. Return ONLY the category name, no explanation

Available categories: ${knownCategories.join(', ')}

Response (category name only):`;

    console.log('[AI][CATEGORY] Calling OpenAI for category detection...');
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are a product categorization expert. Respond with only the category name."
        },
        {
          role: "user", 
          content: prompt
        }
      ],
      temperature: 0.1,
      max_tokens: 50
    });

    const response = completion.choices[0]?.message?.content?.trim();
    console.log('[AI][CATEGORY] Response:', response);
    
    if (!response) {
      logger.warn('Empty AI response for category detection, using base');
      return "base";
    }

    // Clean and validate response
    const detectedCategory = response.toLowerCase().replace(/[^a-z_]/g, '');
    
    if (knownCategories.includes(detectedCategory)) {
      logger.info('Category detected via AI', { 
        category: detectedCategory, 
        sampleSize: productNames.length,
        sampleNames: productNames.slice(0, 3)
      });
      // Cache the result
      setCachedResult(cacheKey, detectedCategory);
      return detectedCategory;
    } else {
      logger.warn('AI returned invalid category, using base', { 
        aiResponse: response, 
        detectedCategory,
        validCategories: knownCategories 
      });
      // Cache the result
      setCachedResult(cacheKey, 'base');
      return "base";
    }

  } catch (error) {
    logger.error('AI category detection failed, using base', { error });
    console.error('[AI][CATEGORY] Error:', error);
    return "base";
  }
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

// --- REAL PRODUCT DATA EXTRACTION VIA LLM WEB BROWSING ---
async function extractRealProductData(productName: string, brand?: string): Promise<Record<string, any> | null> {
  try {
    console.log(`[REAL_DATA] Searching for real product data: ${productName} ${brand ? `(${brand})` : ''}`);
    
    const searchPrompt = `Search for the product "${productName}" ${brand ? `by ${brand}` : ''} on Walmart.com and extract the following information in JSON format:

1. Product specifications (storage, color, condition, etc.)
2. Key features and capabilities
3. Technical specifications (screen size, camera, battery, etc.)
4. Product description
5. Brand information
6. Model number/part number
7. Any warranty information
8. Product images (main and secondary URLs)

Search strategy:
1. Go to walmart.com
2. Search for "${productName}" ${brand ? `by ${brand}` : ''}
3. Find the most relevant product listing
4. Extract all available product information
5. Return as JSON with field names that match our output schema

Focus on accuracy and completeness. If multiple products match, choose the one that best matches the description.`;

    const response = await callLLM(searchPrompt, {}, 'enterprise');
    
    if (response && typeof response === 'object') {
      console.log(`[REAL_DATA] Successfully extracted real product data for: ${productName}`);
      console.log(`[REAL_DATA] Extracted fields: ${Object.keys(response).join(', ')}`);
      return response;
    } else {
      console.log(`[REAL_DATA] No valid product data extracted for: ${productName}`);
      return null;
    }
  } catch (error) {
    console.error(`[REAL_DATA] Error extracting real product data for ${productName}:`, error);
    return null;
  }
}

// --- DIRECT WEB SCRAPING FOR PRODUCT DATA ---
async function scrapeWalmartProductData(productName: string, brand?: string): Promise<Record<string, any> | null> {
  try {
    console.log(`[SCRAPE] Attempting to scrape Walmart for: ${productName} ${brand ? `(${brand})` : ''}`);
    
    // For now, we'll use a simplified approach that constructs search URLs
    // In a full implementation, you'd use Puppeteer or Playwright
    
    const searchQuery = encodeURIComponent(`${brand ? brand + ' ' : ''}${productName}`);
    const searchUrl = `https://www.walmart.com/search?q=${searchQuery}`;
    
    console.log(`[SCRAPE] Search URL: ${searchUrl}`);
    
    // This is a placeholder for actual scraping logic
    // In production, you would:
    // 1. Use Puppeteer to navigate to the search URL
    // 2. Find the most relevant product
    // 3. Navigate to the product page
    // 4. Extract structured data using selectors
    
    // For now, return null to indicate scraping is not implemented
    // This will fall back to LLM web browsing
    console.log(`[SCRAPE] Direct scraping not implemented, falling back to LLM web browsing`);
    return null;
    
  } catch (error) {
    console.error(`[SCRAPE] Error scraping Walmart for ${productName}:`, error);
    return null;
  }
}

// --- HYBRID APPROACH: LLM + SCRAPING ---
async function extractRealProductDataHybrid(productName: string, brand?: string): Promise<Record<string, any> | null> {
  try {
    console.log(`[HYBRID] Using hybrid approach for: ${productName} ${brand ? `(${brand})` : ''}`);
    
    // Step 1: Try direct scraping first (faster if available)
    let scrapedData = await scrapeWalmartProductData(productName, brand);
    
    if (scrapedData) {
      console.log(`[HYBRID] Successfully scraped data for: ${productName}`);
      return scrapedData;
    }
    
    // Step 2: Fall back to LLM web browsing
    console.log(`[HYBRID] Falling back to LLM web browsing for: ${productName}`);
    return await extractRealProductData(productName, brand);
    
  } catch (error) {
    console.error(`[HYBRID] Error in hybrid approach for ${productName}:`, error);
    return null;
  }
}

// --- ENHANCED ENRICHMENT WITH REAL PRODUCT DATA ---
async function enrichRowWithLLMEnhanced(
  row: Record<string, any>, 
  fieldsToEnrich: string[], 
  category: string,
  tierConfig: any,
  groundingExamples: any[],
  fieldDefinitions: any
): Promise<any> {
  try {
    // Step 1: Extract real product data first
    const productName = row['Product Name'] || row['productName'] || 'Unknown Product';
    const brand = row['Brand'] || row['brand'] || row['Brand Name'] || row['brandName'];
    
    let realProductData: Record<string, any> | null = null;
    
    // Only extract real data for higher tiers to avoid excessive API calls
    if (tierConfig.dataQuality === 'enterprise' || tierConfig.dataQuality === 'ultra') {
      realProductData = await extractRealProductDataHybrid(productName, brand);
    }
    
    // Step 2: Generate enhanced prompt with real data
    const prompt = generateAdvancedPromptWithRealData(
      tierConfig,
      productName,
      category,
      fieldsToEnrich,
      row,
      groundingExamples,
      fieldDefinitions,
      realProductData
    );
    
    // Step 3: Call LLM with enhanced context
    const result = await callLLM(prompt, row, tierConfig.dataQuality);
    
    // Step 4: Merge real data with LLM results
    const enrichedData: Record<string, any> = {};
    
    // First, use real product data where available
    if (realProductData) {
      for (const field of fieldsToEnrich) {
        if (realProductData[field] && realProductData[field] !== '') {
          enrichedData[field] = realProductData[field];
        }
      }
    }
    
    // Then, use LLM results to fill remaining gaps
    if (result && typeof result === 'object') {
      for (const field of fieldsToEnrich) {
        if (!enrichedData[field] && result[field] && result[field] !== '') {
          enrichedData[field] = result[field];
        }
      }
    }
    
    return enrichedData;
  } catch (error) {
    console.error('[ENRICH_ENHANCED] Error during enhanced enrichment:', error);
    // Fallback to regular enrichment
    return await enrichRowWithLLM(row, fieldsToEnrich, category, tierConfig, groundingExamples, fieldDefinitions);
  }
}

// --- ENHANCED PROMPT WITH REAL PRODUCT DATA ---
function generateAdvancedPromptWithRealData(
  tierConfig: any, 
  productName: string, 
  category: string, 
  fieldsToEnrich: string[], 
  row: Record<string, any>,
  groundingExamples: any[],
  fieldDefinitions: any,
  realProductData?: Record<string, any> | null
): string {
  const basePrompt = generateAdvancedPrompt(tierConfig, productName, category, fieldsToEnrich, row, groundingExamples, fieldDefinitions);
  
  if (!realProductData) {
    return basePrompt;
  }
  
  // Add real product data section to the prompt
  const realDataSection = `

**REAL PRODUCT DATA FROM WALMART:**
The following information was extracted from the actual product listing on Walmart.com:
${JSON.stringify(realProductData, null, 2)}

**INSTRUCTIONS FOR USING REAL DATA:**
1. Use the real product data above as the primary source for field values
2. Only use LLM-generated values if the real data doesn't contain the specific field
3. Ensure all values are accurate and match the real product specifications
4. For any discrepancies, prefer the real product data over generated content
5. Maintain consistency with the actual product listing

`;
  
  return basePrompt.replace('**RESPONSE:**', realDataSection + '**RESPONSE:**');
}

// CLI entrypoint for ad-hoc testing
if (require.main === module) {
  const [,, csvPath, categoryArg, tierArg] = process.argv;
  if (!csvPath) {
    console.error('Usage: tsx server/utils/transformer.ts <csv_path> <category> <tier>');
    process.exit(1);
  }
  const fs = require('fs');
  const path = require('path');
  const Papa = require('papaparse');
  const xlsx = require('xlsx');
  // Read only first 5 rows for quick test
  let csvData = fs.readFileSync(csvPath, 'utf8');
  let parsed = Papa.parse(csvData, { header: true });
  let first5 = parsed.data.slice(0, 5);
  // Write temp file for processing
  let tempCsvPath = path.join('temp_uploads', 'quicktest_input.csv');
  fs.writeFileSync(tempCsvPath, Papa.unparse(first5));
  // Use 'as any' to satisfy handleProcess signature
  const req = {
    params: { id: path.basename(tempCsvPath, path.extname(tempCsvPath)) },
    body: { category: categoryArg, tier: tierArg },
    headers: {},
    query: { category: categoryArg, tier: tierArg },
    file: { path: tempCsvPath, originalname: path.basename(tempCsvPath) }
  } as any;
  handleProcess(req).then(async result => {
    if (result && result.outputPath) {
      console.log(`\n[CLI] Output written to: ${result.outputPath}`);
      // === Data Quality Scoring ===
      try {
        let wb = xlsx.readFile(result.outputPath);
        let ws = wb.Sheets[wb.SheetNames[0]];
        let outputRows: any[] = xlsx.utils.sheet_to_json(ws, { defval: '', range: 5 }); // Start from row 6 (index 5)
        let headers: string[] = (xlsx.utils.sheet_to_json(ws, { header: 1, defval: '' })[3] || []) as string[]; // Row 4 (index 3) for headers
        // Try to load field definitions for the category
        let fieldDefs: Record<string, any> = {};
        if (categoryArg) {
          let fdPath = path.join('grounding', 'walmart', categoryArg, 'field_definitions.json');
          console.log(`[QUALITY_SCORE] Looking for field definitions at: ${fdPath}`);
          if (fs.existsSync(fdPath)) {
            fieldDefs = JSON.parse(fs.readFileSync(fdPath, 'utf8'));
            console.log(`[QUALITY_SCORE] Loaded field definitions with ${Object.keys(fieldDefs).length} fields`);
            // Log a few sample fields to verify structure
            const sampleFields = Object.keys(fieldDefs).slice(0, 3);
            sampleFields.forEach(field => {
              console.log(`[QUALITY_SCORE] Field "${field}":`, JSON.stringify(fieldDefs[field], null, 2));
            });
          } else {
            console.log(`[QUALITY_SCORE] Field definitions file not found at: ${fdPath}`);
          }
        } else {
          console.log(`[QUALITY_SCORE] No category provided, skipping field definitions`);
        }
        // Build normalized field definition map for matching
        const normalizeHeader = (str: string) => String(str).toLowerCase().replace(/\+/g, '').trim();
        const normFieldDefs: Record<string, any> = {};
        Object.keys(fieldDefs).forEach(key => {
          normFieldDefs[normalizeHeader(key)] = fieldDefs[key];
        });
        // Compute quality metrics
        let totalFields = 0, filledFields = 0, requiredFields = 0, requiredFilled = 0, allowedViolations = 0;
        let allowedViolationsList = [];
        for (let row of outputRows) {
          for (let h of headers) {
            if (!h) continue;
            totalFields++;
            let val = row[h];
            // Normalize header for matching
            let normH = normalizeHeader(h);
            let def = (normFieldDefs && typeof normFieldDefs === 'object' && normH in normFieldDefs) ? normFieldDefs[normH] : {};
            if (val && val.toString().trim() !== '') filledFields++;
            // Check if field is required (min_values > 0 or description contains "required")
            let isRequired = false;
            if (def) {
              isRequired = (def.min_values && def.min_values > 0) || 
                          (def.description && def.description.toLowerCase().includes('required'));
            }
            if (isRequired) {
              requiredFields++;
              if (val && val.toString().trim() !== '') requiredFilled++;
            }
            if (def && def.allowed_values && Array.isArray(def.allowed_values) && val && val.toString().trim() !== '') {
              if (!def.allowed_values.includes(val)) {
                allowedViolations++;
                allowedViolationsList.push({ row, field: h, value: val });
              }
            }
          }
        }
        let fillPct = ((filledFields / totalFields) * 100).toFixed(1);
        let reqFillPct = requiredFields ? ((requiredFilled / requiredFields) * 100).toFixed(1) : 'N/A';
        let allowedOkPct = (allowedViolations === 0 && filledFields > 0) ? '100' : ((1 - allowedViolations / filledFields) * 100).toFixed(1);
        console.log(`\n[QUALITY SCORE]`);
        console.log(`  Total fields: ${totalFields}`);
        console.log(`  Filled fields: ${filledFields} (${fillPct}%)`);
        console.log(`  Required fields: ${requiredFields}`);
        console.log(`  Required filled: ${requiredFilled} (${reqFillPct}%)`);
        console.log(`  Allowed value violations: ${allowedViolations}`);
        if (allowedViolationsList.length > 0) {
          console.log('  Violations:', allowedViolationsList.slice(0, 5));
        }
        let score = Math.round((parseFloat(fillPct) + (reqFillPct === 'N/A' ? 100 : parseFloat(reqFillPct)) + parseFloat(allowedOkPct)) / 3);
        console.log(`  === Data Quality Score: ${score}/100 ===`);
      } catch (e) {
        console.error('[QUALITY SCORE] Error:', e);
      }
      if (typeof result === 'object' && result !== null) {
        if ('stats' in result) {
          console.log(`[CLI] Stats:`, (result as any).stats);
        } else if ('summary' in result) {
          console.log(`[CLI] Summary:`, (result as any).summary);
        } else {
          console.log(`[CLI] Result:`, result);
        }
      } else {
        console.log(`[CLI] Result:`, result);
      }
    } else {
      console.error('[CLI] No output produced:', result);
    }
    process.exit(0);
  }).catch(err => {
    console.error('[CLI] Error:', err);
    process.exit(1);
  });
}


