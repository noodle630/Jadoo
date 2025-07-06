/**
 * Simple, reliable file parser utilities
 * Provides basic functions to read files and count rows without any complex logic
 */

import * as fs from 'fs';
import * as path from 'path';
import Papa from 'papaparse';

/**
 * Count rows in a CSV file - extremely simple approach
 * @param filePath Path to the CSV file
 * @returns Object with counts and validation info
 */
export function countCsvRows(filePath: string): {
  totalRows: number;
  dataRows: number;
  hasHeader: boolean;
  isValid: boolean;
  fileSize: number;
} {
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
  } catch (error) {
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
export function parseCsvFile(filePath: string): { 
  data: any[]; 
  fields: string[];
  rowCount: number;
  error?: string;
} {
  try {
    const fileContent = fs.readFileSync(filePath, 'utf8');
    
    const parseResult = Papa.parse<string[]>(fileContent, {
      header: true,
      skipEmptyLines: true,
    }) as Papa.ParseResult<any>;
    
    // Log detailed parsing information
    console.log(`CSV Parse Results: \n  Rows: ${parseResult.data.length}\n  Fields: ${parseResult.meta.fields?.length || 0}\n  Errors: ${parseResult.errors.length}`);

    if (parseResult.errors.length > 0) {
      console.warn('CSV parsing errors:', parseResult.errors);
    }

    return {
      data: parseResult.data,
      fields: parseResult.meta.fields || [],
      rowCount: parseResult.data.length,
      error: parseResult.errors.length > 0 ? parseResult.errors[0].message : undefined
    };
  } catch (error) {
    console.error('Error parsing CSV file:', error);
    return {
      data: [],
      fields: [],
      rowCount: 0,
      error: error instanceof Error ? error.message : 'An error occurred'
    };
  }
}