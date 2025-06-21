import fs from "fs";
import path from "path";
import Papa from "papaparse";
import ExcelJS from "exceljs";
import supabase from "../../supabaseClient";
import openai from "../../openaiClient";

// MAIN handler
export const handleProcess = async (req, res) => {
  const id = req.params.id;
  const uploadPath = path.join("temp_uploads", `${id}.csv`);
  const groundingRoot = "grounding/walmart";
  const templateRoot = "attached_assets/templates/walmart";
  const outputPath = path.join("outputs", `${id}_output.xlsx`);

  try {
    // Load CSV
    const csvData = fs.readFileSync(uploadPath, "utf8");
    const { data: rows } = Papa.parse(csvData, { header: true, skipEmptyLines: true });

    const knownCategories = fs.readdirSync(groundingRoot);
    const filename = uploadPath.toLowerCase();
    const headerGuess = Object.keys(rows[0]);

    // Heuristic 1: filename or headers
    let matched = knownCategories.find(cat => filename.includes(cat));
    if (!matched) {
      matched = knownCategories.find(cat => headerGuess.some(h => h.toLowerCase().includes(cat)));
    }

    // Heuristic 2: OpenAI check
    let category = "base";
    if (matched) {
      category = matched;
    } else {
      const resp = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: "Classify the product feed category." },
          { role: "user", content: `Columns: ${headerGuess}. First 3 rows: ${JSON.stringify(rows.slice(0, 3))}. Pick best match from [${knownCategories.join(", ")}]. If mixed, reply 'base'.` }
        ]
      });
      const detected = resp.choices[0].message.content.toLowerCase().trim();
      category = knownCategories.includes(detected) ? detected : "base";
    }

    console.log(`✅ Final Category: ${category}`);

    // Load template keys
    const fieldDefPath = path.join(groundingRoot, category, "field_definitions.json");
    if (!fs.existsSync(fieldDefPath)) throw new Error(`Missing field_definitions.json for ${category}`);
    const fieldDefs = JSON.parse(fs.readFileSync(fieldDefPath, "utf8"));
    const templateKeys = fieldDefs.keys || Object.keys(fieldDefs);

    // Transform rows
    const batchSize = 5;
    const batches = chunkArray(rows, batchSize);
    const results = [];

    for (const batch of batches) {
      const transformed = await retry(() => transformBatch(batch, templateKeys), 3, 1000);
      transformed.forEach((row, i) => {
        const rowIndex = rows.indexOf(batch[i]);
        results[rowIndex] = row;
      });
    }

    // Fill missing slots if any
    const finalRows = results.map((r, i) => r || { row_number: i+1, status: "ERROR", row_confidence: "red" });

    // Write XLSX output
    const templateXlsxPath = path.join(templateRoot, `${category}.xlsx`);
    if (!fs.existsSync(templateXlsxPath)) throw new Error(`Missing XLSX template for ${category}`);
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(templateXlsxPath);
    const ws = workbook.getWorksheet(1);

    ws.spliceRows(2, ws.rowCount - 1);
    finalRows.forEach(row => ws.addRow(row));
    await workbook.xlsx.writeFile(outputPath);

    // ✅ Respond with proper rows
    return res.json({
      file: `${id}_output.xlsx`,
      category,
      vendorFields: headerGuess,
      rows: finalRows
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
};

// Transform a batch strongly grounded
async function transformBatch(batch, templateKeys) {
  const prompt = `
You are a feed transformer. 
Given these rows, output ONLY a JSON array of ${batch.length} objects.
Use EXACTLY these keys: ${JSON.stringify(templateKeys)}.
If a field is missing, use "" or null.
NEVER write any explanation or text outside the JSON array.
Rows: ${JSON.stringify(batch)}
  `;
  const resp = await openai.chat.completions.create({
    model: "gpt-3.5-turbo",
    messages: [
      { role: "system", content: "Strict JSON transformer. No extra text." },
      { role: "user", content: prompt }
    ]
  });

  const raw = resp.choices[0].message.content;
  // Safe extract: get only from first [
  const clean = raw.slice(raw.indexOf("["));
  return JSON.parse(clean);
}


function chunkArray(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

async function retry(fn, times, delay) {
  for (let i = 0; i < times; i++) {
    try { return await fn(); }
    catch (err) {
      if (i === times - 1) throw err;
      await new Promise(r => setTimeout(r, delay));
    }
  }
}
