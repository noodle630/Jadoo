/**
 * Simple, reliable file parser utilities
 * Provides basic functions to read files and count rows without any complex logic
 */
import fs from 'fs';
import Papa from 'papaparse';
/**
 * Count rows in a CSV file - extremely simple approach
 * @param filePath Path to the CSV file
 * @returns Object with counts and validation info
 */
export function countCsvRows(filePath) {
    try {
        // Get basic file stats
        const stats = fs.statSync(filePath);
        const fileSize = stats.size;
        // Read the file as plain text
        const fileContent = fs.readFileSync(filePath, 'utf8');
        // Normalize line endings for consistent handling
        const normalizedContent = fileContent.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
        // Split into lines and count non-empty ones
        const allLines = normalizedContent.split('\n');
        const nonEmptyLines = allLines.filter(line => line.trim().length > 0);
        // Assume there's a header if more than one line and first line has field names
        const hasHeader = nonEmptyLines.length > 1;
        // Data rows = all non-empty rows minus header (if present)
        const dataRows = hasHeader ? nonEmptyLines.length - 1 : nonEmptyLines.length;
        // Check if this looks like a valid CSV (simply by seeing if there are commas in a consistent pattern)
        const firstFewLines = nonEmptyLines.slice(0, Math.min(5, nonEmptyLines.length));
        const commaPattern = firstFewLines.map(line => (line.match(/,/g) || []).length);
        const isConsistent = commaPattern.every((count, _, array) => Math.abs(count - array[0]) <= 1);
        // A file is valid if all checks pass
        const isValid = nonEmptyLines.length > 0 && isConsistent;
        return {
            totalRows: nonEmptyLines.length,
            dataRows: dataRows,
            hasHeader: hasHeader,
            isValid: isValid,
            fileSize: fileSize
        };
    }
    catch (error) {
        console.error('Error counting CSV rows:', error);
        return {
            totalRows: 0,
            dataRows: 0,
            hasHeader: false,
            isValid: false,
            fileSize: 0
        };
    }
}
/**
 * Parse a CSV file using PapaParse for more accurate parsing
 * @param filePath Path to the CSV file
 * @returns Parsed CSV data with header and rows
 */
export function parseCsvFile(filePath) {
    var _a;
    try {
        const fileContent = fs.readFileSync(filePath, 'utf8');
        const parseResult = Papa.parse(fileContent, {
            header: true,
            skipEmptyLines: true,
            trimHeaders: true,
        });
        // Log detailed parsing information
        console.log(`CSV Parse Results: 
      Rows: ${parseResult.data.length}
      Fields: ${((_a = parseResult.meta.fields) === null || _a === void 0 ? void 0 : _a.length) || 0}
      Errors: ${parseResult.errors.length}
    `);
        if (parseResult.errors.length > 0) {
            console.warn('CSV parsing errors:', parseResult.errors);
        }
        return {
            data: parseResult.data,
            fields: parseResult.meta.fields || [],
            rowCount: parseResult.data.length,
            error: parseResult.errors.length > 0 ? parseResult.errors[0].message : undefined
        };
    }
    catch (error) {
        console.error('Error parsing CSV file:', error);
        return {
            data: [],
            fields: [],
            rowCount: 0,
            error: error instanceof Error ? error.message : 'Unknown error parsing CSV'
        };
    }
}
/**
 * Simple file size-based row count estimator
 * Use only as a last resort if direct counting methods fail
 * @param filePath Path to the CSV file
 * @param avgRowSizeBytes Average size of a row in bytes (default: 200)
 * @returns Estimated row count
 */
export function estimateRowCount(filePath, avgRowSizeBytes = 200) {
    try {
        const stats = fs.statSync(filePath);
        const fileSize = stats.size;
        // Subtract ~500 bytes for header and file overhead
        const dataSize = Math.max(0, fileSize - 500);
        // Estimate row count based on average row size
        const estimatedRows = Math.ceil(dataSize / avgRowSizeBytes);
        console.log(`File size: ${fileSize} bytes, estimated rows: ${estimatedRows}`);
        return estimatedRows;
    }
    catch (error) {
        console.error('Error estimating row count:', error);
        return 0;
    }
}
/**
 * Read the first N rows of a CSV file
 * @param filePath Path to the CSV file
 * @param maxRows Maximum number of rows to read (default: 10)
 * @returns Array of data rows
 */
export function readCsvSample(filePath, maxRows = 10) {
    try {
        const fileContent = fs.readFileSync(filePath, 'utf8');
        const parseResult = Papa.parse(fileContent, {
            header: true,
            skipEmptyLines: true,
            preview: maxRows,
        });
        return parseResult.data;
    }
    catch (error) {
        console.error('Error reading CSV sample:', error);
        return [];
    }
}
export default {
    countCsvRows,
    parseCsvFile,
    estimateRowCount,
    readCsvSample
};
