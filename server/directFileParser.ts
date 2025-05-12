/**
 * Ultra-simple and reliable CSV parser focused solely on accurate row counting
 * and 1:1 mapping between input and output files.
 */

import fs from 'fs';
import path from 'path';
import readline from 'readline';

interface RowCountResult {
  success: boolean;
  error?: string;
  totalLines?: number;
  nonEmptyLines?: number;
  headerRow?: string;
  dataRows?: number;
  columns?: string[];
}

/**
 * Count the exact number of rows in a CSV file
 * 
 * @param filePath - Path to the CSV file
 * @returns Object with row counts and details
 */
function countExactRows(filePath: string): RowCountResult {
  try {
    if (!fs.existsSync(filePath)) {
      return {
        success: false,
        error: 'File not found'
      };
    }

    // Read file contents synchronously for simplicity
    const fileContent = fs.readFileSync(filePath, 'utf8');
    
    // Split by newlines but handle different line endings
    const lines = fileContent.split(/\r?\n/);
    
    // Count non-empty rows
    const nonEmptyLines = lines.filter(line => line.trim().length > 0);
    
    // Assume first row is header
    const headerRow = nonEmptyLines.length > 0 ? nonEmptyLines[0] : '';
    const dataRows = nonEmptyLines.length > 0 ? nonEmptyLines.length - 1 : 0;
    
    return {
      success: true,
      totalLines: lines.length,
      nonEmptyLines: nonEmptyLines.length,
      headerRow,
      dataRows,
      columns: headerRow.split(',').map(col => col.trim())
    };
  } catch (error) {
    console.error('Error counting rows:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

interface TransformResult {
  success: boolean;
  error?: string;
  inputFile?: string;
  outputFile?: string;
  inputRows?: number;
  outputRows?: number;
  headerInputColumns?: number;
  headerOutputColumns?: number;
}

type TransformFunction = (line: string, index: number, isHeader: boolean) => string;

/**
 * Transform a CSV file with guaranteed 1:1 row mapping
 * 
 * @param inputPath - Path to input CSV file
 * @param outputPath - Path to output CSV file
 * @param transformFn - Optional function to transform each row
 * @returns Object with transformation results
 */
function transformWithExactMapping(
  inputPath: string, 
  outputPath: string, 
  transformFn: TransformFunction | null = null
): TransformResult {
  try {
    if (!fs.existsSync(inputPath)) {
      return {
        success: false,
        error: 'Input file not found'
      };
    }

    // Check if output directory exists
    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    // Get input row counts first
    const rowInfo = countExactRows(inputPath);
    if (!rowInfo.success) {
      return rowInfo; // Pass along the error
    }
    
    // Read input file and write to output file
    const fileContent = fs.readFileSync(inputPath, 'utf8');
    const lines = fileContent.split(/\r?\n/).filter(line => line.trim().length > 0);
    
    // Create output file content
    const outputLines = lines.map((line, index) => {
      // First line is header
      const isHeader = index === 0;
      
      // Apply transformation if provided
      if (transformFn) {
        return transformFn(line, index, isHeader);
      }
      
      // Default: pass through unchanged
      return line;
    });
    
    // Write output file
    fs.writeFileSync(outputPath, outputLines.join('\n'));
    
    // Count output rows
    const outputRowInfo = countExactRows(outputPath);
    
    return {
      success: true,
      inputFile: inputPath,
      outputFile: outputPath,
      inputRows: rowInfo.dataRows,
      outputRows: outputRowInfo.dataRows,
      headerInputColumns: rowInfo.columns.length,
      headerOutputColumns: outputRowInfo.columns.length
    };
  } catch (error) {
    console.error('Error transforming file:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

export {
  countExactRows,
  transformWithExactMapping
};