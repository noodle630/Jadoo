/**
 * Ultra-reliable CSV parser that guarantees 1:1 row mapping between input and output files.
 * This is a minimalist implementation focused on correctness rather than features.
 */
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __asyncValues = (this && this.__asyncValues) || function (o) {
    if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
    var m = o[Symbol.asyncIterator], i;
    return m ? m.call(o) : (o = typeof __values === "function" ? __values(o) : o[Symbol.iterator](), i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function () { return this; }, i);
    function verb(n) { i[n] = o[n] && function (v) { return new Promise(function (resolve, reject) { v = o[n](v), settle(resolve, reject, v.done, v.value); }); }; }
    function settle(resolve, reject, d, v) { Promise.resolve(v).then(function(v) { resolve({ value: v, done: d }); }, reject); }
};
import * as fs from 'fs';
import { createReadStream, createWriteStream } from 'fs';
import { createInterface } from 'readline';
/**
 * Count the exact number of rows in a CSV file
 *
 * @param filePath - Path to the CSV file
 * @returns Object with row counts and details
 */
function countExactRows(filePath) {
    try {
        const content = fs.readFileSync(filePath, 'utf8');
        const lines = content.split('\n');
        // Count total lines
        const totalLines = lines.length;
        // Count non-empty lines
        const nonEmptyLines = lines.filter(line => line.trim().length > 0).length;
        // Get header row and columns
        const headerRow = lines[0];
        const columns = headerRow.split(',').map(col => col.trim());
        // Count data rows (non-empty rows excluding header)
        const dataRows = nonEmptyLines - 1;
        return {
            success: true,
            totalLines,
            nonEmptyLines,
            headerRow,
            dataRows,
            columns
        };
    }
    catch (error) {
        return {
            success: false,
            error: error.message || 'Unknown error counting rows'
        };
    }
}
/**
 * Transform a CSV file with guaranteed 1:1 row mapping
 *
 * @param inputPath - Path to input CSV file
 * @param outputPath - Path to output CSV file
 * @param transformFn - Optional function to transform each row
 * @returns Object with transformation results
 */
function transformWithExactMapping(inputPath, outputPath, transformFn) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, e_1, _b, _c;
        var _d, _e;
        try {
            // Get input row info first
            const rowInfo = countExactRows(inputPath);
            if (!rowInfo.success) {
                return {
                    success: false,
                    error: rowInfo.error
                };
            }
            // Create read stream and interface
            const fileStream = createReadStream(inputPath);
            const rl = createInterface({
                input: fileStream,
                crlfDelay: Infinity
            });
            // Create write stream for output
            const output = createWriteStream(outputPath);
            let lineCount = 0;
            try {
                // Process line by line
                for (var _f = true, rl_1 = __asyncValues(rl), rl_1_1; rl_1_1 = yield rl_1.next(), _a = rl_1_1.done, !_a; _f = true) {
                    _c = rl_1_1.value;
                    _f = false;
                    let line = _c;
                    // Apply transformation if provided
                    if (transformFn) {
                        line = transformFn(line, lineCount, lineCount === 0);
                    }
                    // Write with newline (except for last line)
                    if (lineCount < rowInfo.totalLines - 1) {
                        output.write(line + '\n');
                    }
                    else {
                        output.write(line);
                    }
                    lineCount++;
                }
            }
            catch (e_1_1) { e_1 = { error: e_1_1 }; }
            finally {
                try {
                    if (!_f && !_a && (_b = rl_1.return)) yield _b.call(rl_1);
                }
                finally { if (e_1) throw e_1.error; }
            }
            // Close output stream
            output.end();
            // Verify output row count
            const outputRowInfo = countExactRows(outputPath);
            if (!outputRowInfo.success) {
                return {
                    success: false,
                    error: `Failed to verify output: ${outputRowInfo.error}`
                };
            }
            // Verify row count matches
            if (rowInfo.dataRows !== outputRowInfo.dataRows) {
                return {
                    success: false,
                    error: `Row count mismatch: Input has ${rowInfo.dataRows} rows, output has ${outputRowInfo.dataRows} rows`
                };
            }
            // Success
            return {
                success: true,
                inputFile: inputPath,
                outputFile: outputPath,
                inputRows: rowInfo.dataRows,
                outputRows: outputRowInfo.dataRows,
                headerInputColumns: ((_d = rowInfo.columns) === null || _d === void 0 ? void 0 : _d.length) || 0,
                headerOutputColumns: ((_e = outputRowInfo.columns) === null || _e === void 0 ? void 0 : _e.length) || 0
            };
        }
        catch (error) {
            console.error('Error transforming file:', error);
            return {
                success: false,
                error: error.message || 'Unknown error during file transformation'
            };
        }
    });
}
const exactParser = {
    countExactRows,
    transformWithExactMapping
};
export default exactParser;
