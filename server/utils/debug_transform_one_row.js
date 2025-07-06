var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';
import { stringify } from 'csv-stringify/sync';
// import { transformRowWithGPT } from './transformer'; // TODO: Uncomment if implemented
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const templatePath = path.join(__dirname, '../../attached_assets/templates/amazon/base.csv');
const testDataPath = path.join(__dirname, '../../attached_assets/test_vendor_input.csv');
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        // 1. Load the column template
        const templateCsv = fs.readFileSync(templatePath, 'utf-8');
        const [templateHeaders] = parse(templateCsv, { to_line: 1 });
        // 2. Load 1 row of input data
        const inputCsv = fs.readFileSync(testDataPath, 'utf-8');
        const inputRows = parse(inputCsv, { columns: true });
        const testRow = inputRows[0]; // just the first row
        // 3. Run through GPT-based row transformer
        // const transformedRow = await transformRowWithGPT(testRow, templateHeaders); // <-- this needs to match your function
        // 4. Ensure all fields exist
        const filledRow = templateHeaders.map((field) => { var _a; return (_a = testRow[field]) !== null && _a !== void 0 ? _a : ''; });
        // 5. Save result
        const outCsv = stringify([filledRow], { header: true, columns: templateHeaders });
        fs.writeFileSync('./test_output.csv', outCsv);
        console.log('✅ Transformed row saved as test_output.csv');
        console.log('🔍 Missing fields:', templateHeaders.filter((f) => !testRow[f]));
    });
}
main().catch(console.error);
