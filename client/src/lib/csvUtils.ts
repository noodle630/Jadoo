import Papa from 'papaparse';

/**
 * Interface representing CSV parsing options
 */
interface CSVParseOptions {
  header?: boolean;
  skipEmptyLines?: boolean;
  dynamicTyping?: boolean;
  delimiter?: string;
  preview?: number;
  transformHeader?: (header: string) => string;
}

/**
 * Interface representing CSV parsing results
 */
export interface CSVParseResult<T> {
  data: T[];
  errors: Papa.ParseError[];
  meta: Papa.ParseMeta;
}

/**
 * Interface representing data validation issue
 */
export interface DataIssue {
  type: string;
  count: number;
  description: string;
}

/**
 * Parse a CSV file and return structured data
 * @param file The CSV file to parse
 * @param options Parsing options
 * @returns Promise with parsed CSV data
 */
export function parseCSV<T>(file: File, options: CSVParseOptions = {}): Promise<CSVParseResult<T>> {
  const defaultOptions: CSVParseOptions = {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: true,
    delimiter: ',',
  };

  const parseOptions = { ...defaultOptions, ...options };

  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      ...parseOptions,
      complete: (results) => {
        resolve(results as CSVParseResult<T>);
      },
      error: (error) => {
        reject(error);
      }
    });
  });
}

/**
 * Convert JavaScript data array to CSV string
 * @param data Array of objects to convert to CSV
 * @param options CSV stringify options
 * @returns CSV string
 */
export function dataToCSV<T>(data: T[], options: Papa.UnparseConfig = {}): string {
  const defaultOptions = {
    header: true,
    delimiter: ',',
  };

  const stringifyOptions = { ...defaultOptions, ...options };
  return Papa.unparse(data, stringifyOptions);
}

/**
 * Download data as a CSV file
 * @param data Array of objects to download
 * @param filename Name of the file to download
 * @param options CSV stringify options
 */
export function downloadCSV<T>(data: T[], filename: string, options: Papa.UnparseConfig = {}): void {
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
export function analyzeCSVData<T>(data: T[]): DataIssue[] {
  const issues: DataIssue[] = [];
  const rows = data.length;
  if (rows === 0) return issues;
  
  // Sample keys from the first row
  const sample = data[0] as Record<string, any>;
  const keys = Object.keys(sample);
  
  // Check for missing values
  const missingValuesByColumn: Record<string, number> = {};
  
  // Check for inconsistent values
  const uniqueValuesByColumn: Record<string, Set<string>> = {};
  
  // Check for price anomalies
  const priceColumns: string[] = [];
  keys.forEach(key => {
    const lowerKey = key.toLowerCase();
    if (
      lowerKey.includes('price') || 
      lowerKey.includes('cost') || 
      lowerKey.includes('value')
    ) {
      priceColumns.push(key);
    }
    
    uniqueValuesByColumn[key] = new Set();
  });
  
  // Analyze each row
  data.forEach(row => {
    const record = row as Record<string, any>;
    
    // Check for missing values
    keys.forEach(key => {
      const value = record[key];
      if (value === null || value === undefined || value === '') {
        missingValuesByColumn[key] = (missingValuesByColumn[key] || 0) + 1;
      } else {
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
  const categoryKeys = keys.filter(k => 
    k.toLowerCase().includes('category') || 
    k.toLowerCase().includes('type') || 
    k.toLowerCase().includes('department')
  );
  
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
      const value = (row as Record<string, any>)[key];
      // Clean the price value and convert to number
      if (typeof value === 'string') {
        const cleaned = value.replace(/[^0-9.]/g, '');
        return cleaned ? parseFloat(cleaned) : null;
      }
      return typeof value === 'number' ? value : null;
    }).filter(p => p !== null) as number[];
    
    if (prices.length > 0) {
      const avg = prices.reduce((sum, p) => sum + p, 0) / prices.length;
      const stdDev = Math.sqrt(
        prices.reduce((sum, p) => sum + Math.pow(p - avg, 2), 0) / prices.length
      );
      
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
export async function previewCSV<T>(
  file: File, 
  maxRows: number = 5
): Promise<{ data: T[], columns: string[], issues: DataIssue[] }> {
  const result = await parseCSV<T>(file, { preview: maxRows * 2 });
  
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
}
