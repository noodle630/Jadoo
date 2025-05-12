/**
 * Exact, no-assumptions CSV parser that guarantees 1:1 row mapping
 * This is a bare-bones implementation focused on accurate row counting
 */

import fs from 'fs';
import path from 'path';

/**
 * Count exact number of rows in a CSV file with minimal assumptions
 * @param filePath Path to the CSV file
 * @returns The exact number of data rows (excluding header)
 */
export function countExactRows(filePath: string): {
  totalLines: number;
  dataRows: number;
  error?: string;
} {
  try {
    // Read file as UTF-8 text
    const fileContent = fs.readFileSync(filePath, 'utf8');
    
    // Normalize line endings for consistency
    const normalizedContent = fileContent
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n');
    
    // Split into lines
    const allLines = normalizedContent.split('\n');
    
    // Count non-empty lines
    const nonEmptyLines = allLines.filter(line => line.trim().length > 0);
    
    // Assume first line is header
    const dataRows = nonEmptyLines.length > 1 ? nonEmptyLines.length - 1 : 0;
    
    // Log detailed information
    console.log(`[exactParser] File: ${path.basename(filePath)}`);
    console.log(`[exactParser] Total lines (including empty): ${allLines.length}`);
    console.log(`[exactParser] Non-empty lines: ${nonEmptyLines.length}`);
    console.log(`[exactParser] Data rows (excluding header): ${dataRows}`);
    
    // Show first few rows for verification
    if (nonEmptyLines.length > 0) {
      console.log(`[exactParser] Header: ${nonEmptyLines[0]}`);
      
      if (nonEmptyLines.length > 1) {
        console.log(`[exactParser] First data row: ${nonEmptyLines[1]}`);
      }
    }
    
    return {
      totalLines: allLines.length,
      dataRows: dataRows,
    };
  } catch (error) {
    console.error('Error in exactParser:', error);
    return {
      totalLines: 0,
      dataRows: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Super simple function to write a CSV with exact row count guarantee
 * @param inputPath Original CSV file path
 * @param outputPath Output CSV file path
 * @param transform Optional function to transform each line
 * @returns Statistics about the operation with row counts
 */
export function transformWithExactRowMapping(
  inputPath: string, 
  outputPath: string,
  transform?: (line: string, index: number, isHeader: boolean) => string
): {
  sourceRows: number;
  outputRows: number;
  success: boolean;
  error?: string;
} {
  try {
    // Read source file
    const sourceContent = fs.readFileSync(inputPath, 'utf8');
    
    // Normalize line endings
    const normalizedContent = sourceContent
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n');
    
    // Split into lines
    const allLines = normalizedContent.split('\n');
    const nonEmptyLines = allLines.filter(line => line.trim().length > 0);
    
    // Process lines
    let outputLines: string[] = [];
    
    // Apply transformation with strict accounting
    nonEmptyLines.forEach((line, index) => {
      const isHeader = index === 0;
      
      // Either transform or keep original
      if (transform) {
        outputLines.push(transform(line, index, isHeader));
      } else {
        outputLines.push(line);
      }
    });
    
    // Guarantee row count matches
    if (outputLines.length !== nonEmptyLines.length) {
      throw new Error(`Row count mismatch! Source: ${nonEmptyLines.length}, Output: ${outputLines.length}`);
    }
    
    // Write to output file
    fs.writeFileSync(outputPath, outputLines.join('\n'));
    
    // Calculate row counts (header is included in nonEmptyLines)
    const sourceDataRows = nonEmptyLines.length > 1 ? nonEmptyLines.length - 1 : 0;
    const outputDataRows = outputLines.length > 1 ? outputLines.length - 1 : 0;
    
    // Log operation details
    console.log(`[exactParser] Transformed CSV with strict row mapping`);
    console.log(`[exactParser] Source: ${path.basename(inputPath)}, rows: ${sourceDataRows}`);
    console.log(`[exactParser] Output: ${path.basename(outputPath)}, rows: ${outputDataRows}`);
    
    return {
      sourceRows: sourceDataRows,
      outputRows: outputDataRows,
      success: sourceDataRows === outputDataRows,
    };
  } catch (error) {
    console.error('Error in transform with exact row mapping:', error);
    return {
      sourceRows: 0,
      outputRows: 0,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Read exact file into memory (with guaranteed row count)
 * @param filePath Path to CSV file
 * @returns Array of rows with a header property
 */
export function readExactFile(filePath: string): {
  rows: string[];
  header: string;
  rowCount: number;
} {
  // Read file
  const fileContent = fs.readFileSync(filePath, 'utf8');
  
  // Normalize line endings
  const normalizedContent = fileContent
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n');
  
  // Split into lines and filter empty lines
  const allRows = normalizedContent.split('\n').filter(line => line.trim().length > 0);
  
  // Get header and rows
  const header = allRows.length > 0 ? allRows[0] : '';
  const dataRows = allRows.length > 1 ? allRows.slice(1) : [];
  
  return {
    rows: allRows,
    header,
    rowCount: dataRows.length
  };
}

export default {
  countExactRows,
  transformWithExactRowMapping,
  readExactFile
};