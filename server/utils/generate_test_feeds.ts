// NOTE: This file expects the TypeScript compiler option `module` to be set to 'esnext' or 'node16' for import.meta compatibility.
import { fileURLToPath } from 'url';
import path from 'path';
import * as fs from 'fs';
import { stringify } from 'csv-stringify/sync';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CATEGORIES = [
  'cell_phones',
  'headphones',
  'sound_bars',
  'base',
  'computer_monitors',
  'desktop_computers',
  'laptop_computers',
  'portable_speakers',
  'smart_watches',
  'tablet_computers',
  'televisions',
  'video_game_consoles',
];
const ROW_COUNTS = [50, 100, 500, 1000];
const GROUNDING_ROOT = path.join(__dirname, '../../grounding/walmart');
const OUTPUT_DIR = path.join(__dirname, '../../attached_assets/test_feeds');

function randomFromArray(arr: any[]) {
  if (!arr || arr.length === 0) return '';
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomString(len: number) {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 ';
  let str = '';
  for (let i = 0; i < len; i++) str += chars[Math.floor(Math.random() * chars.length)];
  return str.trim();
}

function randomValue(def: any) {
  if (def.allowed_values) return randomFromArray(def.allowed_values);
  if (def.examples && def.examples.length > 0 && def.examples[0] !== 'nan') return randomFromArray(def.examples);
  if (def.min_characters && def.max_characters) {
    const len = Math.floor(Math.random() * (def.max_characters - def.min_characters + 1)) + def.min_characters;
    return randomString(Math.max(1, len));
  }
  return randomString(8);
}

function generateRow(fields: string[], defs: Record<string, any>): Record<string, any> {
  const row: Record<string, any> = {};
  for (const field of fields) {
    row[field] = randomValue(defs[field] || {});
  }
  return row;
}

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

async function main() {
  ensureDir(OUTPUT_DIR);
  for (const category of CATEGORIES) {
    const defPath = path.join(GROUNDING_ROOT, category, 'field_definitions.json');
    if (!fs.existsSync(defPath)) continue;
    const defs = JSON.parse(fs.readFileSync(defPath, 'utf-8'));
    const fields = Object.keys(defs);
    for (const rowCount of ROW_COUNTS) {
      const rows = [];
      for (let i = 0; i < rowCount; i++) {
        rows.push(generateRow(fields, defs));
      }
      const csv = stringify(rows, { header: true, columns: fields });
      const outPath = path.join(OUTPUT_DIR, `${category}_${rowCount}rows.csv`);
      fs.writeFileSync(outPath, csv);
      console.log(`✅ Generated ${outPath}`);
    }
  }
}

main().catch(e => { console.error(e); process.exit(1); }); 