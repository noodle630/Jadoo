// File: server/utils/transformer.ts
import dotenv from "dotenv";
dotenv.config();
import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';
import { stringify } from 'csv-stringify/sync';
import { OpenAI } from 'openai';
import { v4 as uuidv4 } from 'uuid';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

interface TransformationLog {
  rowNumber: number;
  originalTitle: string;
  filledFields: string[];
  missingFields: string[];
  notes?: string;
}

function getTemplateHeaders(marketplace: string): string[] {
  const templatePath = path.resolve(__dirname, "../../attached_assets/templates", marketplace, "base.csv");

  if (!fs.existsSync(templatePath)) {
    throw new Error(`❌ Template missing: ${templatePath}`);
  }

  const raw = fs.readFileSync(templatePath, "utf-8");
  const [firstLine] = raw.split(/\r?\n/);
  const headers = firstLine.split(",").map(h => h.trim());

  if (!headers.length) {
    throw new Error(`❌ Template file is empty or malformed: ${templatePath}`);
  }

  return headers;
}

export async function transformCSVWithOpenAI(inputPath: string, marketplace: string = "amazon") {
  const raw = fs.readFileSync(inputPath, "utf-8");
  const records = parse(raw, { columns: true, skip_empty_lines: true });
  const outputHeaders = getTemplateHeaders(marketplace);
  const output: any[] = [];
  const logs: TransformationLog[] = [];

  for (let i = 0; i < records.length; i++) {
    const row = records[i];
    const title = row['title'] || row['name'] || '';
    const price = row['price'] || '';

    const systemPrompt = `You are a structured data transformation agent for marketplace product listings. Your job is to:
- Identify the product from the provided JSON (title + price are strong cues).
- Transform and fill as many fields as you can based on your knowledge, common marketplace practices, and hints from the raw data.
- Enrich the row to be suitable for listing on a modern marketplace.

Instructions:
- Always output one valid CSV row, matching the provided template structure exactly.
- Leave any unknown field empty, but keep its column.
- Auto-fill SKU if missing using format AUTO-XXXX (e.g. AUTO-AB12).
- Log what you filled, skipped, or guessed.
- Never skip a row or include explanations before the row.
`;

    const userPrompt = `Given the following product data, return:
1. One single CSV line of ${outputHeaders.length} comma-separated values (no header).
2. One line starting with LOG: to describe what fields were confidently filled, skipped, or guessed.

Output format:
<csv row>
LOG: filled: [], guessed: [], missing: [], notes: ...

CSV Columns:
${outputHeaders.join(',')}

Product Input:
${JSON.stringify(row, null, 2)}
`.trim();

    let transformedRow: any = {};
    let filled: string[] = [];
    let missing: string[] = [];

    try {
      const res = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        temperature: 0.2
      });

      const content = res.choices?.[0]?.message?.content?.trim() || '';
      const [csvLine] = content.split(/\n/);
      const cleanedLine = csvLine.replace(/^```csv\n?|```$/g, '').replace(/"/g, '').trim();
      const values = cleanedLine.split(',').map(v => v.trim());

      if (values.length !== outputHeaders.length) {
        console.warn(`⚠️ GPT responded with malformed row:\n${csvLine}`);
        throw new Error(`❌ Malformed row: expected ${outputHeaders.length} columns, got ${values.length}`);
      }

      outputHeaders.forEach((field, idx) => {
        const val = values[idx] || '';
        transformedRow[field] = val;
        (val ? filled : missing).push(field);
      });

      if (!transformedRow['SKU']) {
        transformedRow['SKU'] = `AUTO-${uuidv4().slice(0, 8)}`;
        filled.push('SKU');
        missing = missing.filter(f => f !== 'SKU');
      }
    } catch (err) {
      console.warn(`❌ Row ${i + 1} failed:`, err?.message || err);
      transformedRow = {};
      outputHeaders.forEach(field => (transformedRow[field] = ''));
      missing = [...outputHeaders];
    }

    output.push(transformedRow);
    logs.push({
      rowNumber: i + 1,
      originalTitle: title,
      filledFields: filled,
      missingFields: missing
    });
  }

  const outputFile = path.join("temp_uploads", `transformed_${uuidv4()}.csv`);
  fs.writeFileSync(outputFile, stringify(output, { header: true }), "utf-8");

  const logFile = outputFile.replace(".csv", ".log.json");
  fs.writeFileSync(logFile, JSON.stringify(logs, null, 2), "utf-8");

  return {
    output_file: outputFile,
    output_rows: output.length,
    aiChanges: {
      titleOptimized: logs.filter(l => l.filledFields.includes("Title")).length,
      descriptionEnhanced: logs.filter(l => l.filledFields.includes("Description")).length,
      categoryCorrected: logs.filter(l => l.filledFields.includes("Category")).length,
      errorsCorrected: logs.filter(l => l.missingFields.length > 0).length
    }
  };
}
