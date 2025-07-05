/**
 * Ultra-reliable CSV parser that guarantees 1:1 row mapping between input and output files.
 * This is a minimalist implementation focused on correctness rather than features.
 */

import * as fs from 'fs';
import * as path from 'path';
import { createReadStream, createWriteStream } from 'fs';
import { createInterface } from 'readline';

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
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Unknown error counting rows'
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
async function transformWithExactMapping(
  inputPath: string,
  outputPath: string,
  transformFn?: TransformFunction
): Promise<TransformResult> {
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
    
    // Process line by line
    for await (let line of rl) {
      // Apply transformation if provided
      if (transformFn) {
        line = transformFn(line, lineCount, lineCount === 0);
      }
      
      // Write with newline (except for last line)
      if (lineCount < rowInfo.totalLines! - 1) {
        output.write(line + '\n');
      } else {
        output.write(line);
      }
      
      lineCount++;
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
      headerInputColumns: rowInfo.columns?.length || 0,
      headerOutputColumns: outputRowInfo.columns?.length || 0
    };
  } catch (error: any) {
    console.error('Error transforming file:', error);
    return {
      success: false,
      error: error.message || 'Unknown error during file transformation'
    };
  }
}

const exactParser = {
  countExactRows,
  transformWithExactMapping
};

export default exactParser;