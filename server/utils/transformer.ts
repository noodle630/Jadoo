import fs from "fs";
import path from "path";
import Papa from "papaparse";
import ExcelJS from "exceljs";
import { Request, Response } from "express";
import supabase from "../../supabaseClient";
import openai from "../../openaiClient";
import winston from "winston";
import stringSimilarity from "string-similarity";

// Configure structured logging
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
        winston.format.simple()
      )
    })
  ]
});

// Ensure logs directory exists
if (!fs.existsSync('logs')) {
  fs.mkdirSync('logs');
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

// MAIN handler with comprehensive logging
export const handleProcess = async (req: Request, res: Response) => {
  const startTime = Date.now();
  const id = req.params.id;
  const uploadPath = path.join("temp_uploads", String(id) + ".csv");
  const groundingRoot = "grounding/walmart";
  const templateRoot = "attached_assets/templates/walmart";
  const outputPath = path.join("outputs", `${id}_output.xlsx`);

  logger.info('Starting transformation', { id, uploadPath });

  try {
    // Validate input file exists
    if (!fs.existsSync(uploadPath)) {
      throw new Error(`Input file not found: ${uploadPath}`);
    }

    // Load and parse CSV
    logger.info('Loading CSV file', { path: uploadPath });
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
      logger.warn('CSV parsed as single column, attempting manual split', { firstRow: rows[0] });
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
        logger.info('Manual CSV split complete', { headers, rowCount: rows.length });
      }
    }

    logger.info('CSV loaded successfully', { 
      rowCount: rows.length, 
      headers: Object.keys(rows[0] || {}) 
    });
    logger.info('Sample input rows', { sample: rows.slice(0, 2) });

    // --- Category detection ---
    const category = await detectCategory(rows, groundingRoot);
    logger.info('Category detected', { category });

    // --- Load template and field definitions ---
    const { templateKeys, fieldDefinitions } = await loadTemplateAndFields(category, groundingRoot);
    logger.info('Template loaded', { fieldCount: templateKeys.length });

    // --- Extract output columns from row 3 of the template (real field names) ---
    const templateXlsxPath = path.join(templateRoot, `${category}.xlsx`);
    const baseTemplatePath = path.join(templateRoot, "base.xlsx");
    const xlsxToUse = fs.existsSync(templateXlsxPath) ? templateXlsxPath : baseTemplatePath;
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(xlsxToUse);
    const worksheet = workbook.getWorksheet("Product Content And Site Exp");
    if (!worksheet) throw new Error("Worksheet 'Product Content And Site Exp' not found in template XLSX");
    let outputColumns: string[] = [];
    const row3 = worksheet.getRow(3).values;
    if (Array.isArray(row3)) {
      outputColumns = row3
        .slice(1)
        .map((v: any) => (v === undefined || v === null ? '' : String(v).trim()));
    } else {
      logger.error('Row 3 of template worksheet is not an array', { row3 });
      throw new Error('Template row 3 is not an array');
    }
    logger.info('Extracted output columns from template row 3 (field names)', { outputColumns });

    // --- LLM-driven key seller data detection (moved here to fix ReferenceError) ---
    const inputHeaders = Object.keys(rows[0] || {});
    const sampleRows = rows.slice(0, 10) as Record<string, any>[];
    const keySellerDataPrompt = `Given the following input headers and sample rows, classify each column as either 'key seller data' (must be preserved as-is) or 'optimizable' (can be AI-enriched for the target marketplace). For each, provide a confidence score (0-1) and a short reason. Return a JSON object with two arrays: keySellerData and optimizableData, each with objects {column, confidence, reason}.\n\nHeaders: ${JSON.stringify(inputHeaders)}\nSample rows: ${JSON.stringify(sampleRows.slice(0, 5))}`;
    const keySellerDataResp = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'system', content: 'You are a product data transformation expert.' }, { role: 'user', content: keySellerDataPrompt }],
      response_format: { type: 'json_object' },
      temperature: 0.2,
    });
    let keySellerDataResult: any = {};
    try {
      keySellerDataResult = JSON.parse(keySellerDataResp.choices[0].message.content || '{}');
    } catch (e) {
      logger.warn('Failed to parse keySellerData LLM response', { error: e, raw: keySellerDataResp.choices[0].message.content });
      keySellerDataResult = { keySellerData: [], optimizableData: [] };
    }
    logger.info('LLM key/optimizable field classification', { keySellerDataResult });
    const keyFields = (keySellerDataResult.keySellerData || []).map((c: any) => c.column);
    const aiFillColumns = (keySellerDataResult.optimizableData || [])
      .map((c: any) => c.column)
      .filter((col: string) => outputColumns.includes(col) && !keyFields.includes(col));
    if (aiFillColumns.length === 0) {
      logger.warn('No optimizable fields to enrich; skipping AI enrichment.');
    }

    // --- Use OpenAI to map input headers to template field names ---
    const headerMapping = await mapHeadersWithOpenAI(inputHeaders, outputColumns);
    logger.info('Input-to-template mapping table', { headerMapping });

    // --- Clean header mapping: trim whitespace from keys and values ---
    const cleanedHeaderMapping: Record<string, string> = {};
    Object.entries(headerMapping).forEach(([inputHeader, outputCol]) => {
      if (outputCol && outputCol.trim() && outputColumns.includes(outputCol.trim())) {
        cleanedHeaderMapping[inputHeader.trim()] = outputCol.trim();
      }
    });
    logger.info('Cleaned input-to-template mapping table', { cleanedHeaderMapping });

    // --- Transform rows ---
    const outputRows = rows.map((rowRaw: unknown, idx: number) => {
      const row = rowRaw as Record<string, any>;
      const out: Record<string, any> = {};
      Object.entries(cleanedHeaderMapping).forEach(([inputHeader, outputCol]: [string, string]) => {
        out[outputCol] = row[inputHeader];
      });
      outputColumns.forEach((col: string) => {
        if (out[col] === undefined) out[col] = "";
      });
      return out;
    });
    logger.info('Sample output rows (template-mapped)', { sample: outputRows.slice(0, 2) });

    // --- AI enrichment batching for optimizable fields ---
    // For each batch, send all optimizable fields to OpenAI for enrichment, with full row context
    // Instruct OpenAI to return a JSON array of objects, each with only the enriched fields, each with a value and confidence
    // Log all enrichment actions, original vs. AI values, and confidence scores
    // 2. Group rows into batches (default: 10 rows per batch)
    const batchSize = 10;
    const concurrency = 5;
    const batches: Array<Array<{ row: Record<string, any>; idx: number }>> = [];
    for (let i = 0; i < outputRows.length; i += batchSize) {
      batches.push(outputRows.slice(i, i + batchSize).map((row, idx) => ({ row, idx: i + idx })));
    }
    // For each batch, always enrich all aiFillColumns (not just empty fields)
    for (const batch of batches) {
      const fieldsToFill = aiFillColumns; // Always enrich all optimizable fields
      logger.info('AI enrichment batch fieldsToFill', { fieldsToFill, aiFillColumns });
      // Build field definitions for only those fields
      const defs = fieldsToFill.map((col: string) => `- ${col}: ${fieldDefinitions[col] || ''}`).join('\n');
      // Build prompt: instruct GPT to optimize/enrich the fields, not just fill if empty
      const prompt = `For each product row below, optimize and enrich the following fields using the provided field definitions. For each field, return a new value that is more marketplace-ready, descriptive, or appealing. Respond in JSON, one object per row, with only the enriched fields.\n\nField definitions:\n${defs}\n\nRows:\n${JSON.stringify(batch.map(({ row }) => row), null, 2)}\n\nResponse:`;
      logger.info('Sending AI enrichment batch', { batchSize: batch.length, fieldsToFill, promptLength: prompt.length });
      try {
        const resp = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: "You are a product feed enrichment engine. Respond ONLY with a JSON array, one object per row, with only the enriched fields. The array length must match the number of rows provided." },
            { role: "user", content: prompt }
          ],
          temperature: 0.2,
          max_tokens: 2000,
          response_format: { type: "json_object" }
        });
        const content = resp.choices[0].message.content;
        let aiResults: Array<Record<string, any>> = [];
        if (content) {
          try {
            let parsed = JSON.parse(content);
            // If it's a single object, wrap in array
            if (!Array.isArray(parsed)) {
              if (typeof parsed === 'object' && parsed !== null) {
                parsed = [parsed];
              } else if (typeof parsed === 'string') {
                parsed = JSON.parse(parsed);
                if (!Array.isArray(parsed)) parsed = [parsed];
              }
            }
            aiResults = parsed;
          } catch (e) {
            logger.warn('Failed to parse AI JSON response', { error: e, content });
            // Log raw response for debugging
            aiResults = [];
          }
        } else {
          logger.warn('AI response content is null', {});
          aiResults = [];
        }
        // Fallback: if aiResults is not an array of correct length, fill with empty objects
        if (!Array.isArray(aiResults) || aiResults.length !== batch.length) {
          logger.warn('AI response array length mismatch or invalid, falling back to empty objects', { aiResultsLength: aiResults.length, batchLength: batch.length });
          aiResults = Array(batch.length).fill({});
        }
        // Update outputRows in memory and log before/after
        aiResults.forEach((filled: Record<string, any>, i: number) => {
          const rowIdx = batch[i].idx;
          Object.entries(filled).forEach(([col, val]) => {
            logger.info('AI enrichment result', {
              row: rowIdx,
              field: col,
              before: outputRows[rowIdx][col],
              after: val
            });
            outputRows[rowIdx][col] = val;
          });
        });
        logger.info('AI enrichment batch completed', { batchRows: batch.length, aiResults: aiResults.length });
      } catch (error: unknown) {
        logger.warn('AI enrichment batch failed', { error: error instanceof Error ? (error as Error).message : error });
      }
    }
    logger.info('All AI enrichment batches completed', { totalBatches: batches.length });

    // --- Write output directly to cells, starting at row 6 ---
    // This avoids issues with merged cells, formatting, and ensures data is visible in Excel.
    const rowsToDelete = worksheet.rowCount - 5;
    if (rowsToDelete > 0) {
      worksheet.spliceRows(6, rowsToDelete);
      logger.info('Cleared existing rows from row 6 onward', { rowsDeleted: rowsToDelete });
    }
    outputRows.forEach((row: Record<string, any>, i: number) => {
      outputColumns.forEach((col, j) => {
        worksheet.getRow(i + 6).getCell(j + 1).value = row[col] || "";
      });
    });
    logger.info('Wrote output rows directly to worksheet cells', { startRow: 6, rowCount: outputRows.length });
    await workbook.xlsx.writeFile(outputPath);
    logger.info('Output file written successfully', { path: outputPath, outputRows: outputRows.length });

    // Compose result object (no summary/groundingExamples)
    const result: TransformResult = {
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
      warnings: [],
      logs: {
        category_detection: category,
        grounding_examples_loaded: 0,
        batches_processed: 0,
        gpt_calls: 0
      }
    };

    logger.info('Transformation completed successfully', { 
      id, 
      processingTime: result.summary.processing_time_ms,
      outputRows: outputRows.length
    });
    
    return res.json(result);

  } catch (err: unknown) {
    const errorTime = Date.now() - startTime;
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    logger.error('Transformation failed', { 
      id, 
      error: errorMessage, 
      processingTime: errorTime,
      stack: err instanceof Error ? err.stack : undefined
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
