// File: server/utils/transformer.ts

import dotenv from "dotenv";
dotenv.config();
import fs from "fs";
import path from "path";
import { parse } from "csv-parse/sync";
import { stringify } from "csv-stringify/sync";
import { OpenAI } from "openai";
import { v4 as uuidv4 } from "uuid";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

function getTemplateHeaders(marketplace: string): string[] {
  const basePath = path.resolve(__dirname, "../../attached_assets/templates", marketplace, "base.csv");
  if (!fs.existsSync(basePath)) throw new Error("🛑 Template file not found: " + basePath);
  const raw = fs.readFileSync(basePath, "utf-8");
  const [headers] = parse(raw, { to_line: 1 });
  return headers.map((h: string) => h.trim());
}

function loadReferenceSamples(): string {
  const files = [
    "dpa_product_catalog_sample_feed.csv",
    "amazon_test_3.csv",
    "Premium upload (1).csv",
    "Premium upload.csv"
  ];
  const dir = path.resolve(__dirname, "../../attached_assets");
  let examples = [];
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.existsSync(fullPath)) {
      const raw = fs.readFileSync(fullPath, "utf-8");
      const records = parse(raw, { columns: true, skip_empty_lines: true });
      examples.push(...records.slice(0, 2));
    }
  }
  return examples.map(r => JSON.stringify(r)).join("\n");
}

export async function transform_csv_with_openai(inputPath: string, marketplace: string = "amazon") {
  const raw = fs.readFileSync(inputPath, "utf-8");
  const records = parse(raw, { columns: true, skip_empty_lines: true });
  const outputHeaders = getTemplateHeaders(marketplace);
  const referenceBlock = loadReferenceSamples();

  const output: any[] = [];
  const logs: any[] = [];
  let filledCount = 0;

  const systemPrompt = `You are a product feed transformer for marketplace uploads. Your job is to map raw messy vendor data to a clean template.
Instructions:
- Always output a row with all columns defined in the OUTPUT TEMPLATE.
- Never drop rows or leave fields blank without reason.
- If unsure, put "NA" or use vendor clues like title, price, brand.
- Improve: title, description, bullet_points, brand, model_number.
- Use these references as clues:\n${referenceBlock}`;

  for (let i = 0; i < records.length; i++) {
    const row = records[i];
    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-3.5-turbo-1106",
        temperature: 0.3,
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: `INPUT:\n${JSON.stringify(row, null, 2)}\n\nOUTPUT TEMPLATE:\n${outputHeaders.join(", ")}`
          }
        ],
        functions: [{
          name: "fill_template",
          description: "Fill the product template",
          parameters: {
            type: "object",
            properties: Object.fromEntries(outputHeaders.map(field => [field, { type: "string" }])),
            required: []
          }
        }],
        function_call: { name: "fill_template" }
      });

      const rawResponse = completion.choices?.[0]?.message?.function_call?.arguments ?? "{}";
      const parsed = JSON.parse(rawResponse);
      const rowOut: Record<string, string> = {};
      outputHeaders.forEach(field => {
        rowOut[field] = parsed[field] ?? "NA";
      });

      const filled = Object.entries(rowOut).filter(([_, v]) => v && v !== "NA").map(([k]) => k);
      if (filled.length) filledCount++;

      output.push(rowOut);
      logs.push({ row: i + 1, filledFields: filled });
    } catch (err: any) {
      console.error(`❌ Row ${i + 1} failed:`, err?.message || err);
      const emptyRow = Object.fromEntries(outputHeaders.map(f => [f, "NA"]));
      output.push(emptyRow);
      logs.push({ row: i + 1, error: true, message: err?.message || String(err) });
    }
  }

  const uploadsDir = path.join("temp_uploads");
  if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

  const outputFile = path.join(uploadsDir, `transformed_${uuidv4()}.csv`);
  fs.writeFileSync(outputFile, stringify(output, { header: true }), "utf-8");

  const logFile = outputFile.replace(".csv", ".log.json");
  fs.writeFileSync(logFile, JSON.stringify(logs, null, 2), "utf-8");

  return {
    output_path: outputFile,
    log_path: logFile,
    row_count: output.length,
    summary: {
      filledRows: filledCount,
      emptyRows: output.length - filledCount,
      totalRows: output.length,
    }
  };
}
