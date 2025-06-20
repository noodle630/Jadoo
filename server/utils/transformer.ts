// transformer.ts
import OpenAI from "openai";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import Papa from "papaparse";
import ExcelJS from "exceljs";
import pLimit from "p-limit";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEMPLATE_DIR = path.join(process.cwd(), "attached_assets", "templates", "walmart");
const GROUNDING_DIR = path.join(process.cwd(), "grounding", "walmart");

export const handleProcess = async (id) => {
  const csvPath = path.join(process.cwd(), "temp_uploads", `${id}.csv`);
  if (!fs.existsSync(csvPath)) throw new Error(`No CSV for ${id}`);
  const csvContent = fs.readFileSync(csvPath, "utf8");
  const parsed = Papa.parse(csvContent, { header: true });
  const rows = parsed.data;

  if (!rows.length) throw new Error(`No rows found`);

  // Detect category
  const knownCategories = fs.readdirSync(TEMPLATE_DIR)
    .filter(f => f.endsWith(".xlsx") && f !== "base.xlsx")
    .map(f => f.replace(".xlsx", "").toLowerCase());
  knownCategories.push("base");

  let detectedCategory = "base";
  const fileName = csvPath.toLowerCase();
  const fileNameMatch = knownCategories.find(c => fileName.includes(c));
  if (fileNameMatch) detectedCategory = fileNameMatch;

  console.log(`✅ Detected category: ${detectedCategory}`);

  // Load template & grounding
  const templatePath = path.join(TEMPLATE_DIR, `${detectedCategory}.xlsx`);
  const groundingPath = path.join(GROUNDING_DIR, detectedCategory, "field_definitions.json");
  const groundingDefs = JSON.parse(fs.readFileSync(groundingPath, "utf8"));

  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(templatePath);

  const targetSheet = wb.getWorksheet("Product Content And Site Exp");
  if (!targetSheet) throw new Error(`Target sheet not found`);

  const headers = [];
  targetSheet.getRow(5).eachCell(cell => headers.push((cell.value || "").toString().trim()));

  console.log(`✅ Working on sheet: ${targetSheet.name}`);

  // Concurrency limit
  const limit = pLimit(3); // safe for gpt-3.5

  const finalRows = await Promise.all(rows.map(row =>
    limit(async () => {
      const keep = {};
      ["sku", "price", "quantity", "condition"].forEach(k => {
        if (row[k]) keep[k] = row[k];
      });

      let filled = {};
      try {
        const ai = await openai.chat.completions.create({
          model: "gpt-3.5-turbo",
          messages: [
            {
              role: "system",
              content: `You are a JSON transformer. Return ONLY a valid JSON object matching these headers: ${JSON.stringify(headers)}. Fill missing fields with "I am dumb".`
            },
            {
              role: "user",
              content: `Row: ${JSON.stringify(row)}\nField definitions: ${JSON.stringify(groundingDefs)}`
            }
          ],
        });

        filled = JSON.parse(ai.choices[0].message.content);
      } catch (err) {
        console.error("⚠️ OpenAI JSON fail, fallback to dummy:", err.message);
        headers.forEach(h => { filled[h] = "I am dumb"; });
      }

      Object.assign(filled, keep);
      return filled;
    })
  ));

  // Insert starting from row 6
  let rowIdx = 6;
  for (const row of finalRows) {
    const arr = headers.map(h => row[h] || "I am dumb");
    targetSheet.insertRow(rowIdx++, arr);
  }

  const outputDir = path.join(process.cwd(), "outputs");
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
  const outputPath = path.join(outputDir, `${id}.xlsx`);
  await wb.xlsx.writeFile(outputPath);

  console.log(`✅ Final file saved: ${outputPath}`);
  return `${id}.xlsx`;
};
