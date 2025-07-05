import fs from "fs";
import path from "path";
import Papa from "papaparse";
import ExcelJS from "exceljs";
import { Request, Response } from "express";
import REMOVED_SECRETfrom "../../supabaseClient";
import openai from "../../openaiClient";
import winston from "winston";
import stringSimilarity from "string-similarity";
import crypto from "crypto";

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
const llmCache = new Map<string, any>();
const templateCache = new Map<string, any>();
const groundingCache = new Map<string, any>();
const headerMappingCache = new Map<string, any>();

// Cache key generator for LLM calls
function generateCacheKey(input: string | undefined, context: string | undefined): string {
  return crypto.createHash('md5').update(`${input || ''}:${context || ''}`).digest('hex');
}

// Cache management
function getCachedResult(key: string): any | null {
  return llmCache.get(key) || null;
}

function setCachedResult(key: string, result: any): void {
  llmCache.set(key, result);
  // Limit cache size to prevent memory issues
  if (llmCache.size > 1000) {
    const firstKey = llmCache.keys().next().value;
    llmCache.delete(firstKey);
  }
}

// Preload static data at startup
async function preloadStaticData(groundingRoot: string, templateRoot: string) {
  logger.info('Preloading static data for caching');
  
  try {
    // Cache all template files
    const categories = fs.readdirSync(groundingRoot).filter((cat: string) => 
      fs.statSync(path.join(groundingRoot, String(cat))).isDirectory()
    );
    
    for (const category of categories) {
      // Cache template
      const safeCategory = typeof category === 'string' ? category : '';
      const safeTemplateRoot = templateRoot || "attached_assets/templates/walmart";
      const templatePath = path.join(safeTemplateRoot, `${safeCategory}.xlsx`);
      const baseTemplatePath = path.join(safeTemplateRoot, "base.xlsx");
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
  // Brand
  if (row['Brand Name']) attrs['Brand Name'] = row['Brand Name'];
  // SKU
  if (row['SKU']) attrs['SKU'] = row['SKU'];
  return attrs;
}

// Enhanced LLM call with caching
async function cachedLLMCall(prompt: string, context: string, options: any = {}) {
  const cacheKey = generateCacheKey(prompt, context);
  const cached = getCachedResult(cacheKey);
  
  if (cached) {
    logger.info('LLM cache hit', { context });
    return cached;
  }
  
  logger.info('LLM cache miss, making API call', { context, prompt });
  try {
    const result = await openai.chat.completions.create({
      model: options.model || "gpt-4o-mini",
      messages: [
        { role: "system", content: options.systemPrompt || "You are a product feed enrichment expert." },
        { role: "user", content: prompt }
      ],
      temperature: options.temperature || 0.3,
      max_tokens: options.maxTokens || 2000,
      response_format: options.responseFormat || { type: "json_object" }
    });
    const response = result.choices[0].message.content;
    logger.info('LLM API call result', { context, response });
    setCachedResult(cacheKey, response);
    return response;
  } catch (err) {
    logger.warn('LLM API call failed', { context, error: err instanceof Error ? err.message : err });
    return '';
  }
}

// Parallel batch processing with better error handling
async function processBatchInParallel(batches: any[], processor: Function, concurrency = 3) {
  const results: any[] = [];
  const errors: any[] = [];
  
  for (let i = 0; i < batches.length; i += concurrency) {
    const batch = batches.slice(i, i + concurrency);
    const batchPromises = batch.map(async (item, index) => {
      try {
        return await processor(item, i + index);
      } catch (error) {
        logger.warn('Batch item processing failed', { 
          batchIndex: i + index, 
          error: error instanceof Error ? error.message : error 
        });
        return { error: error instanceof Error ? error.message : error };
      }
    });
    
    const batchResults = await Promise.allSettled(batchPromises);
    batchResults.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        results.push(result.value);
      } else {
        errors.push({ index: i + index, error: result.reason });
      }
    });
  }
  
  return { results, errors };
}

// Walmart transformer: robust, .xlsx-only, future-proof
// NOTE: For Walmart, we require .xlsx templates and a specific worksheet/row structure.
// If generalizing for other platforms, detect template extension and structure dynamically.
export const handleProcess = async (req: Request, res: Response) => {
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
      transformHeader: (header: string) => header.trim()
    });

    if (parseErrors.length > 0) {
      logger.warn('CSV parse warnings', { errors: parseErrors });
    }

    // Robust CSV parsing: check for single-string header
    if (rows.length > 0 && typeof Object.keys(rows[0] as Record<string, any>)[0] === 'string' && Object.keys(rows[0] as Record<string, any>).length === 1) {
      logger.warn('CSV parsed as single column, attempting manual split');
      // Try to re-parse with header: false
      const { data: rawRows } = Papa.parse(csvData, { header: false, skipEmptyLines: true });
      if (Array.isArray(rawRows) && rawRows.length > 1 && Array.isArray(rawRows[0])) {
        const headerLine = (rawRows[0] as string[])[0];
        const headers = headerLine.split(",").map((h: string) => h.trim());
        rows = (rawRows.slice(1) as string[][]).map((row: string[]) => {
          const values = (row[0] || '').split(",");
          const obj: Record<string, string> = {};
          headers.forEach((h: string, i: number) => { obj[h] = values[i] || ""; });
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
    if (!worksheet) throw new Error("Worksheet 'Product Content And Site Exp' not found in template XLSX");
    let outputColumns: string[] = [];
    const row3 = worksheet.getRow(3).values;
    if (Array.isArray(row3)) {
      outputColumns = row3
        .slice(1)
        .map((v: any) => (v === undefined || v === null ? '' : String(v).trim()));
    } else {
      throw new Error('Template row 3 is not an array');
    }

    // --- LLM-driven key seller data detection with caching ---
    const inputHeaders = Object.keys(rows[0] || {});
    const sampleRows = rows.slice(0, 10) as Record<string, any>[];
    const keySellerDataPrompt = `Given the following input headers and sample rows, classify each column as either 'key seller data' (must be preserved as-is) or 'optimizable' (can be AI-enriched for the target marketplace). For each, provide a confidence score (0-1) and a short reason. Return a JSON object with two arrays: keySellerData and optimizableData, each with objects {column, confidence, reason}.\n\nHeaders: ${JSON.stringify(inputHeaders)}\nSample rows: ${JSON.stringify(sampleRows.slice(0, 5))}`;
    const keySellerDataResp = await cachedLLMCall(
      keySellerDataPrompt,
      'key_seller_data_detection',
      { model: 'gpt-4o', systemPrompt: 'You are a product data transformation expert.' }
    );
    let keySellerDataResult: any = {};
    try {
      keySellerDataResult = JSON.parse(keySellerDataResp);
    } catch (e) {
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
    const headerMapping: Record<string, string> = {};
    trimmedOutputColumns.forEach((col: string, idx: number) => {
      const normCol = normalizedOutputColumns[idx];
      // 1. Direct match
      let inputIdx = trimmedInputHeaders.indexOf(col);
      if (inputIdx !== -1) {
        headerMapping[col] = trimmedInputHeaders[inputIdx];
        logger.info(`Header mapping [direct]: '${col}' -> '${trimmedInputHeaders[inputIdx]}'`);
        return;
      }
      // 2. Normalized match
      inputIdx = normalizedInputHeaders.indexOf(normCol);
      if (inputIdx !== -1) {
        headerMapping[col] = trimmedInputHeaders[inputIdx];
        logger.info(`Header mapping [normalized]: '${col}' -> '${trimmedInputHeaders[inputIdx]}'`);
        return;
      }
      // 3. Fuzzy match (string similarity)
      const { bestMatch } = stringSimilarity.findBestMatch(col, trimmedInputHeaders);
      if (bestMatch.rating > 0.7) {
        headerMapping[col] = bestMatch.target;
        logger.info(`Header mapping [fuzzy]: '${col}' -> '${bestMatch.target}' (score: ${bestMatch.rating})`);
        return;
      }
      // 4. No match
      headerMapping[col] = '';
      logger.warn(`Header mapping [unmapped]: '${col}' -> ''`);
    });
    logger.info('Final header mapping:', { headerMapping });

    // --- Initialize output rows with mapped data ---
    const outputRows: Record<string, any>[] = (rows as Record<string, any>[]).map((row: Record<string, any>, index: number) => {
      const outputRow: Record<string, any> = {};
      trimmedOutputColumns.forEach((col: string) => {
        const mappedInputCol = headerMapping[col];
        if (mappedInputCol && row[mappedInputCol]) {
          outputRow[col] = row[mappedInputCol];
        } else {
          outputRow[col] = "";
        }
      });
      return outputRow;
    });
    logger.info('Sample output row:', { row: outputRows[0] });
    logger.info('All output rows:', { outputRows });
    // Do NOT abort if some columns are unmapped—always produce output

    // --- OPTIMIZED: Single Batch LLM Call Per Row ---
    // This replaces the old per-field and batch enrichment with ONE call per row
    // Reduces LLM calls from 1000+ to 20 for a 20-row file with 50 fields
    
    logger.info('Starting optimized batch LLM enrichment', { 
      totalRows: outputRows.length,
      totalFields: outputColumns.length
    });

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

    let totalEnriched = 0;
    let totalErrors = 0;
    const fieldStats: Record<string, { mapped: number; enriched: number; blank: number; errors: number }> = {};
    const rowStats: Array<{ row: number; confidence: number; blanks: string[] }> = [];

    // Process each row with ONE LLM call per row
    for (let i = 0; i < outputRows.length; i++) {
      const row = outputRows[i];
      const rowStartTime = Date.now();
      
      // Find all blank fields that need enrichment
      const blankFields = outputColumns.filter(field =>
        !NON_ENRICHABLE_FIELDS.includes(field) && 
        (!row[field] || (typeof row[field] === 'string' && row[field].trim() === ""))
      );

      if (blankFields.length === 0) {
        // Row is complete, just calculate stats
        let rowConfidence = 0;
        let rowFields = 0;
        for (const field of outputColumns) {
          if (row[field] && typeof row[field] === 'string' && row[field].trim() !== "") {
            rowConfidence += 1.0;
            fieldStats[field] = fieldStats[field] || { mapped: 0, enriched: 0, blank: 0, errors: 0 };
            fieldStats[field].mapped++;
          }
          rowFields++;
        }
        rowStats.push({
          row: i + 1,
          confidence: rowFields ? rowConfidence / rowFields : 0,
          blanks: []
        });
        continue;
      }

      // Build comprehensive field context for this row
      const fieldContexts = blankFields.map(field => {
        const def = fieldDefinitions[field] || {};
        const examples = def.examples || [];
        const exampleText = examples.length > 0 ? `Examples: ${examples.slice(0, 3).join(", ")}` : "";
        return `Field: ${field}\nDefinition: ${def.description || "Product information field"}\nProduct Type: ${def.product_type || "General"}\n${exampleText}`;
      }).join("\n\n");

      // Create smart prompt with product context
      const productName = row['Product Name'] || row['productName'] || row['name'] || 'Unknown Product';
      const productType = row['Product Type'] || row['productType'] || row['type'] || 'General';
      
      const prompt = `You are an expert at preparing product feeds for ${category} marketplace.

Category: ${category}
Product: ${productName}
Product Type: ${productType}

Fill in the missing fields for this product using the field definitions below. 
If you cannot determine a value with high confidence, leave it blank.
Respond with ONLY a valid JSON object containing the field names and values.

Fields to fill:
${fieldContexts}

Product data: ${JSON.stringify(row, null, 2)}

Response (JSON only):`;

      try {
        const enrichedJson = await cachedLLMCall(
          prompt, 
          `row_${i}_${category}_${Date.now()}`,
          { maxTokens: 2000 }
        );

        let enriched: Record<string, any> = {};
        try {
          enriched = JSON.parse(enrichedJson);
        } catch (parseError) {
          logger.warn('Failed to parse LLM response', { 
            row: i, 
            error: parseError instanceof Error ? parseError.message : parseError,
            response: enrichedJson?.substring(0, 200) 
          });
          // Mark all fields as errors
          for (const field of blankFields) {
            totalErrors++;
            fieldStats[field] = fieldStats[field] || { mapped: 0, enriched: 0, blank: 0, errors: 0 };
            fieldStats[field].errors++;
          }
          continue;
        }

        // Apply enriched data and track stats
        let rowConfidence = 0;
        let rowFields = 0;
        const rowBlanks: string[] = [];

        for (const field of outputColumns) {
          if (NON_ENRICHABLE_FIELDS.includes(field)) {
            // Skip system fields
            rowFields++;
            continue;
          }

          if (row[field] && typeof row[field] === 'string' && row[field].trim() !== "") {
            // Already has value
            rowConfidence += 1.0;
            fieldStats[field] = fieldStats[field] || { mapped: 0, enriched: 0, blank: 0, errors: 0 };
            fieldStats[field].mapped++;
          } else if (blankFields.includes(field) && enriched[field]) {
            // LLM provided value
            const enrichedValue = enriched[field];
            if (typeof enrichedValue === 'string' && enrichedValue.trim() !== "") {
              row[field] = enrichedValue;
              rowConfidence += 0.8; // Slightly lower confidence for AI-generated
              totalEnriched++;
              fieldStats[field] = fieldStats[field] || { mapped: 0, enriched: 0, blank: 0, errors: 0 };
              fieldStats[field].enriched++;
            } else {
              rowBlanks.push(field);
              fieldStats[field] = fieldStats[field] || { mapped: 0, enriched: 0, blank: 0, errors: 0 };
              fieldStats[field].blank++;
            }
          } else {
            // Still blank
            rowBlanks.push(field);
            fieldStats[field] = fieldStats[field] || { mapped: 0, enriched: 0, blank: 0, errors: 0 };
            fieldStats[field].blank++;
          }
          rowFields++;
        }

        rowStats.push({
          row: i + 1,
          confidence: rowFields ? rowConfidence / rowFields : 0,
          blanks: rowBlanks
        });

        logger.debug('Row enrichment completed', { 
          row: i + 1, 
          enrichedFields: Object.keys(enriched).length,
          processingTime: Date.now() - rowStartTime
        });

      } catch (error) {
        logger.warn('Row LLM enrichment failed', { 
          row: i, 
          error: error instanceof Error ? error.message : error 
        });
        
        // Mark all blank fields as errors
        for (const field of blankFields) {
          totalErrors++;
          fieldStats[field] = fieldStats[field] || { mapped: 0, enriched: 0, blank: 0, errors: 0 };
          fieldStats[field].errors++;
        }

        rowStats.push({
          row: i + 1,
          confidence: 0,
          blanks: blankFields
        });
      }
    }

    logger.info('Optimized batch LLM enrichment completed', { 
      totalRows: outputRows.length,
      totalEnriched,
      totalErrors,
      avgProcessingTime: (Date.now() - startTime) / outputRows.length
    });
    // --- Write output directly to cells, starting at row 6 ---
    const rowsToDelete = worksheet.rowCount - 5;
    if (rowsToDelete > 0) {
      worksheet.spliceRows(6, rowsToDelete);
    }
    outputRows.forEach((row: Record<string, any>, i: number) => {
      (outputColumns as string[]).forEach((col: string, j: number) => {
        worksheet.getRow(i + 6).getCell(j + 1).value = row[col] || "";
      });
    });
    await cachedTemplate.xlsx.writeFile(outputPath);
    logger.info('Output file written successfully', { path: outputPath, outputRows: outputRows.length });

    // --- Data quality and insights summary ---
    // Use Set for unique SKUs, filter out undefined
    const uniqueSkus = new Set<string>(outputRows.map(r => typeof r['SKU'] === 'string' ? r['SKU'] : '').filter(Boolean));
    const productTypes = new Set<string>();
    rows.forEach((row: any) => {
      if (row['SKU'] || row['sku']) uniqueSkus.add(row['SKU'] || row['sku']);
      if (row['Product Name'] || row['productName']) productTypes.add(row['Product Name'] || row['productName']);
    });

    // Aggregate stats from the optimized enrichment
    const avgConfidence = rowStats.length ? rowStats.reduce((a, b) => a + b.confidence, 0) / rowStats.length : 0;
    const totalMapped = Object.values(fieldStats).reduce((sum, stat) => sum + stat.mapped, 0);
    const totalBlank = Object.values(fieldStats).reduce((sum, stat) => sum + stat.blank, 0);
    const successRate = (totalMapped + totalEnriched) / (outputRows.length * outputColumns.length);
    
    const warnings: string[] = [];
    const suggestions: string[] = [];
    
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
    const field_definitions_summary: Record<string, any> = {};
    for (const col of outputColumns as string[]) {
      field_definitions_summary[col] = fieldDefinitions[col] || {};
    }
    (summary as any).field_definitions = field_definitions_summary;

    // Compose result object with detailed summary
    const result: TransformResult & { summary_json: any } = {
      file: `${id}_output.xlsx`,
      category,
      vendorFields: inputHeaders,
      rows: outputRows as any,
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
        gpt_calls: llmCache.size
      },
      summary_json: summary
    };
    logger.info('Transformation completed successfully', { 
      id, 
      processingTime: result.summary.processing_time_ms,
      outputRows: outputRows.length,
      cacheHits: llmCache.size,
      summary: result.summary_json
    });
    return res.json(result);
  } catch (err: unknown) {
    const errorTime = Date.now() - startTime;
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    logger.error('Transformation failed', { 
      id, 
      error: errorMessage, 
      processingTime: errorTime
    });
    return res.status(500).json({ 
      error: errorMessage,
      processing_time_ms: errorTime,
      feed_id: id
    });
  }
};

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
  } catch (error: unknown) {
    logger.warn('AI classification failed, defaulting to base', { 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
    return "base";
  }
}

// Helper function to get random sample
function getRandomSample<T>(array: T[], size: number): T[] {
  const shuffled = [...array].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, size);
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

// Helper to load grounding examples from sample_vendor_feed.xlsx
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
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.warn('Failed to load grounding examples, proceeding without them', { 
      category, 
      error: errorMessage 
    });
    return [];
  }
}

// Save logs to database
async function saveLogsToDatabase(feedId: string, transformResults: TransformRow[]) {
  try {
    const logs = transformResults.map(result => ({
      feed_id: feedId,
      row_number: result.row_number,
      status: result.status,
      confidence: result.row_confidence,
      original_data: result.original_data,
      transformed_data: result.transformed_data,
      error_message: result.error_message,
      processing_time_ms: result.processing_time_ms,
      retry_count: result.retry_count,
      created_at: new Date().toISOString()
    }));

    const { error } = await supabase.from("logs").insert(logs);
    
    if (error) {
      logger.warn('Failed to save logs to database', { error: error.message });
    } else {
      logger.info('Saved logs to database', { logCount: logs.length });
    }
  } catch (error: unknown) {
    logger.warn('Database logging failed', { 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
}

// Utility functions
function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

// Use OpenAI to map input headers to template field names
async function mapHeadersWithOpenAI(inputHeaders: string[], outputColumns: string[]): Promise<Record<string, string>> {
  const headerMapping: Record<string, string> = {};

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
    } else {
      logger.warn('No valid mapping found');
      return {};
    }
  } catch (error: unknown) {
    logger.warn('Failed to map headers with OpenAI', { 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
    return {};
  }
}
