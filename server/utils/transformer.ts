
// File: server/utils/transformer.ts

import fs from "fs";
import path from "path";
import { parse } from "csv-parse/sync";
import Excel from "exceljs";
import { v4 as uuidv4 } from "uuid";
import dotenv from "dotenv";
dotenv.config();
import { OpenAI } from "openai";
import { fileURLToPath } from "url";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const templateRoot = path.join(__dirname, "../../attached_assets/templates");
const groundingRoot = path.join(__dirname, "../../grounding");

function listCategories(marketplace: string): string[] {
  const dir = path.join(templateRoot, marketplace.toLowerCase());
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter((f) => f.endsWith(".xlsx"))
    .map((f) => path.basename(f, ".xlsx"));
}

function guessCategory(inputPath: string, rows: any[], marketplace: string): string {
  const categories = listCategories(marketplace);
  const lowerFileName = inputPath.toLowerCase();
  const titleField = (rows[0]?.title || rows[0]?.Title || "").toLowerCase();

  console.log("🔍 Available categories:", categories);
  console.log("📄 File name:", lowerFileName);
  console.log("🪪 First row title:", titleField);

  for (const cat of categories) {
    const compact = cat.replace(/_/g, "").toLowerCase();
    if (lowerFileName.includes(compact) || titleField.includes(compact)) {
      console.log(`[Category Guess ✅] Matched: ${cat}`);
      return cat;
    }
  }

  console.warn(`[Category Guess ❌] No match found. Falling back to 'base'.`);
  return "base";
}

function loadFieldDefinitions(marketplace: string, category: string): Record<string, any> {
  const defPath = path.join(groundingRoot, marketplace.toLowerCase(), category, "field_definitions.json");
  return fs.existsSync(defPath) ? JSON.parse(fs.readFileSync(defPath, "utf-8")) : {};
}

async function callOpenAI(prompt: string, headers: string[]): Promise<Record<string, string>> {
  const completion = await openai.chat.completions.create({
    model: "gpt-3.5-turbo-1106",
    temperature: 0.2,
    messages: [
      {
        role: "system",
        content: "You are a product feed transformer. Use provided definitions and fill each field clearly. Return 'NA' if uncertain.",
      },
      { role: "user", content: prompt },
    ],
    functions: [
      {
        name: "fill_template",
        parameters: {
          type: "object",
          properties: Object.fromEntries(
            headers.map((h) => [h, { type: "string" }])
          ),
        },
      },
    ],
    function_call: { name: "fill_template" },
  });

  const args = completion.choices?.[0]?.message?.function_call?.arguments ?? "{}";
  try {
    return JSON.parse(args);
  } catch {
    console.error("❌ Failed to parse OpenAI function response:", args);
    return {};
  }
}

export async function transformCSVWithOpenAI(inputPath: string, marketplace: string): Promise<string> {
  const raw = fs.readFileSync(inputPath, "utf-8");
  const records = parse(raw, { columns: true, skip_empty_lines: true });
  const normalizedMarketplace = marketplace.toLowerCase();

  const category = guessCategory(inputPath, records, normalizedMarketplace);
  const templatePath = path.join(templateRoot, normalizedMarketplace, `${category}.xlsx`);
  if (!fs.existsSync(templatePath)) {
    throw new Error(`❌ Template not found for ${normalizedMarketplace}/${category}. Looked in: ${templatePath}`);
  }

  const definitions = loadFieldDefinitions(normalizedMarketplace, category);

  const workbook = new Excel.Workbook();
  await workbook.xlsx.readFile(templatePath);
  const sheet = workbook.getWorksheet("Product Content And Site Exp");
  if (!sheet) throw new Error("Missing 'Product Content And Site Exp' sheet");

  const headerRow = sheet.getRow(5); // Actual field names
  const headers = headerRow.values.slice(1).map((v) => String(v).trim());

  const logs: any[] = [];

  for (let i = 0; i < records.length; i++) {
    const row = records[i];
    const logEntry: any = { row: i + 1, filled: true, missingFields: [] };

    try {
      const prompt = `Here is the raw product:
${JSON.stringify(row, null, 2)}

Use these field definitions:
${JSON.stringify(definitions, null, 2)}

Target headers: ${headers.join(", ")}`;
      const result = await callOpenAI(prompt, headers);

      const outputRow = sheet.getRow(i + 7); // Write SKUs from row 7 onward
      headers.forEach((header, colIdx) => {
        const val = result[header] ?? "NA";
        if (val === "NA") logEntry.missingFields.push(header);
        outputRow.getCell(colIdx + 1).value = typeof val === "string" ? val : String(val ?? "NA");
      });

      outputRow.commit();
    } catch (err: any) {
      logEntry.filled = false;
      logEntry.error = err.message || String(err);
    }

    logs.push(logEntry);
  }

  const outputFile = path.join("temp_uploads", `output_${category}_${uuidv4()}.xlsx`);
  await workbook.xlsx.writeFile(outputFile);

  const logPath = outputFile.replace(".xlsx", ".log.json");
  fs.writeFileSync(logPath, JSON.stringify(logs, null, 2), "utf-8");

  return outputFile;
}
