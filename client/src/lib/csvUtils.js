var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import Papa from 'papaparse';
/**
 * Parse a CSV file and return structured data
 * @param file The CSV file to parse
 * @param options Parsing options
 * @returns Promise with parsed CSV data
 */
export function parseCSV(file, options = {}) {
    const defaultOptions = {
        header: true,
        skipEmptyLines: true,
        dynamicTyping: true,
        delimiter: ',',
    };
    const parseOptions = Object.assign(Object.assign({}, defaultOptions), options);
    return new Promise((resolve, reject) => {
        Papa.parse(file, Object.assign(Object.assign({}, parseOptions), { complete: (results) => {
                resolve(results);
            }, error: (error) => {
                reject(error);
            } }));
    });
}
/**
 * Convert JavaScript data array to CSV string
 * @param data Array of objects to convert to CSV
 * @param options CSV stringify options
 * @returns CSV string
 */
export function dataToCSV(data, options = {}) {
    const defaultOptions = {
        header: true,
        delimiter: ',',
    };
    const stringifyOptions = Object.assign(Object.assign({}, defaultOptions), options);
    return Papa.unparse(data, stringifyOptions);
}
/**
 * Download data as a CSV file
 * @param data Array of objects to download
 * @param filename Name of the file to download
 * @param options CSV stringify options
 */
export function downloadCSV(data, filename, options = {}) {
    const csv = dataToCSV(data, options);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}
/**
 * Analyze CSV data for potential issues
 * @param data Parsed CSV data
 * @returns Array of data issues found
 */
export function analyzeCSVData(data) {
    const issues = [];
    const rows = data.length;
    if (rows === 0)
        return issues;
    // Sample keys from the first row
    const sample = data[0];
    const keys = Object.keys(sample);
    // Check for missing values
    const missingValuesByColumn = {};
    // Check for inconsistent values
    const uniqueValuesByColumn = {};
    // Check for price anomalies
    const priceColumns = [];
    keys.forEach(key => {
        const lowerKey = key.toLowerCase();
        if (lowerKey.includes('price') ||
            lowerKey.includes('cost') ||
            lowerKey.includes('value')) {
            priceColumns.push(key);
        }
        uniqueValuesByColumn[key] = new Set();
    });
    // Analyze each row
    data.forEach(row => {
        const record = row;
        // Check for missing values
        keys.forEach(key => {
            const value = record[key];
            if (value === null || value === undefined || value === '') {
                missingValuesByColumn[key] = (missingValuesByColumn[key] || 0) + 1;
            }
            else {
                uniqueValuesByColumn[key].add(String(value).toLowerCase());
            }
        });
    });
    // Add missing value issues
    let totalMissingFields = 0;
    Object.entries(missingValuesByColumn).forEach(([key, count]) => {
        if (count > 0) {
            totalMissingFields += count;
        }
    });
    if (totalMissingFields > 0) {
        issues.push({
            type: 'missing',
            count: totalMissingFields,
            description: `missing ${keys.filter(k => missingValuesByColumn[k] > 0).join(', ')} values`
        });
    }
    // Check for inconsistent categories if they exist
    const categoryKeys = keys.filter(k => k.toLowerCase().includes('category') ||
        k.toLowerCase().includes('type') ||
        k.toLowerCase().includes('department'));
    let inconsistentCategories = 0;
    categoryKeys.forEach(key => {
        const uniqueValues = uniqueValuesByColumn[key];
        // If we have too many unique values for what should be a limited set of categories
        if (uniqueValues.size > 5 && uniqueValues.size > (rows * 0.2)) {
            inconsistentCategories += 1;
        }
    });
    if (inconsistentCategories > 0) {
        issues.push({
            type: 'inconsistent',
            count: inconsistentCategories,
            description: 'with inconsistent category naming'
        });
    }
    // Check for price anomalies
    let priceAnomalies = 0;
    priceColumns.forEach(key => {
        const prices = data.map(row => {
            const value = row[key];
            // Clean the price value and convert to number
            if (typeof value === 'string') {
                const cleaned = value.replace(/[^0-9.]/g, '');
                return cleaned ? parseFloat(cleaned) : null;
            }
            return typeof value === 'number' ? value : null;
        }).filter(p => p !== null);
        if (prices.length > 0) {
            const avg = prices.reduce((sum, p) => sum + p, 0) / prices.length;
            const stdDev = Math.sqrt(prices.reduce((sum, p) => sum + Math.pow(p - avg, 2), 0) / prices.length);
            const threshold = avg + (3 * stdDev); // 3 standard deviations
            const anomalies = prices.filter(p => p > threshold).length;
            priceAnomalies += anomalies;
        }
    });
    if (priceAnomalies > 0) {
        issues.push({
            type: 'price',
            count: priceAnomalies,
            description: 'with unusually high prices (possible errors)'
        });
    }
    return issues;
}
/**
 * Preview data from a CSV file
 * @param file CSV file to preview
 * @param maxRows Maximum number of rows to preview
 * @returns Promise with preview data and any issues found
 */
export function previewCSV(file_1) {
    return __awaiter(this, arguments, void 0, function* (file, maxRows = 5) {
        const result = yield parseCSV(file, { preview: maxRows * 2 });
        // Get a slightly larger sample for analysis
        const analysisSample = result.data.slice(0, maxRows * 2);
        const issues = analyzeCSVData(analysisSample);
        // Return only the preview rows for display
        const previewData = result.data.slice(0, maxRows);
        const columns = result.meta.fields || [];
        return {
            data: previewData,
            columns,
            issues
        };
    });
}
