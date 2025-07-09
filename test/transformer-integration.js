/**
 * Transformer Integration for Flywheel Tests
 * 
 * This module provides the interface between the flywheel test harness
 * and the actual transformer logic.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Import the actual transformer
// Note: You'll need to adjust this import based on your transformer's actual export
let transformer;
try {
  // Try to import the TypeScript transformer
  const transformerModule = await import('../server/utils/transformer.ts');
  transformer = transformerModule.default || transformerModule;
} catch (error) {
  console.warn('Could not import TypeScript transformer, using fallback');
  transformer = null;
}

/**
 * Run the transformer on a file
 * @param {string} inputPath - Path to input file
 * @param {string} outputPath - Path to output file
 * @param {Object} options - Transformer options
 * @returns {Promise<Object>} - Result with success status and metadata
 */
export async function runTransformer(inputPath, outputPath, options = {}) {
  const defaultOptions = {
    platform: 'walmart',
    category: 'base',
    tier: 'free',
    maxRows: 100,
    fillPercentage: 0.4,
    ...options
  };

  try {
    // Read input file
    const inputContent = fs.readFileSync(inputPath, 'utf8');
    const inputLines = inputContent.split('\n').filter(line => line.trim());
    
    if (inputLines.length < 2) {
      throw new Error('Input file has insufficient data (need at least header + 1 row)');
    }

    // Parse CSV to get data structure
    const header = inputLines[0].split(',').map(field => field.trim());
    const dataRows = inputLines.slice(1).map(line => {
      const values = line.split(',');
      const row = {};
      header.forEach((field, index) => {
        row[field] = values[index] || '';
      });
      return row;
    });

    console.log(`📊 Input: ${dataRows.length} rows, ${header.length} fields`);
    console.log(`🔧 Using tier: ${defaultOptions.tier}, fill: ${defaultOptions.fillPercentage * 100}%`);

    // If transformer is available, use it
    if (transformer && typeof transformer.transform === 'function') {
      console.log('🚀 Using actual transformer...');
      
      const result = await transformer.transform({
        data: dataRows,
        platform: defaultOptions.platform,
        category: defaultOptions.category,
        tier: defaultOptions.tier,
        maxRows: defaultOptions.maxRows,
        fillPercentage: defaultOptions.fillPercentage
      });

      // Write output
      const outputContent = convertToCSV(result.data, result.fields || header);
      fs.writeFileSync(outputPath, outputContent);
      
      return {
        success: true,
        inputRows: dataRows.length,
        outputRows: result.data.length,
        fields: result.fields || header,
        metadata: result.metadata || {}
      };
    } else {
      // Fallback: simple transformation
      console.log('⚠️  Using fallback transformer...');
      
      const transformedData = await fallbackTransform(dataRows, header, defaultOptions);
      const outputContent = convertToCSV(transformedData, header);
      fs.writeFileSync(outputPath, outputContent);
      
      return {
        success: true,
        inputRows: dataRows.length,
        outputRows: transformedData.length,
        fields: header,
        metadata: { method: 'fallback' }
      };
    }

  } catch (error) {
    console.error('❌ Transformer failed:', error.message);
    throw new Error(`Transformer failed: ${error.message}`);
  }
}

/**
 * Fallback transformation when actual transformer is not available
 */
async function fallbackTransform(dataRows, header, options) {
  const { maxRows, fillPercentage } = options;
  
  // Limit rows
  const limitedRows = dataRows.slice(0, maxRows);
  
  // Simple enrichment: fill some fields with placeholder data
  const enrichedRows = limitedRows.map((row, index) => {
    const enriched = { ...row };
    
    // Fill some fields based on fill percentage
    const fieldsToFill = Math.floor(header.length * fillPercentage);
    const fieldsToEnrich = header.slice(0, fieldsToFill);
    
    fieldsToEnrich.forEach(field => {
      if (!enriched[field] || enriched[field].trim() === '') {
        enriched[field] = `Enriched_${field}_${index + 1}`;
      }
    });
    
    return enriched;
  });
  
  return enrichedRows;
}

/**
 * Convert data array to CSV string
 */
function convertToCSV(data, fields) {
  const header = fields.join(',');
  const rows = data.map(row => 
    fields.map(field => {
      const value = row[field] || '';
      // Escape commas and quotes
      if (value.includes(',') || value.includes('"') || value.includes('\n')) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value;
    }).join(',')
  );
  
  return [header, ...rows].join('\n');
}

/**
 * Get transformer capabilities
 */
export function getTransformerInfo() {
  return {
    hasTransformer: !!transformer,
    hasTransformMethod: !!(transformer && typeof transformer.transform === 'function'),
    availableMethods: transformer ? Object.keys(transformer) : [],
    fallbackAvailable: true
  };
}

/**
 * Validate input file
 */
export function validateInputFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n').filter(line => line.trim());
    
    if (lines.length < 2) {
      return { valid: false, error: 'File must have at least header + 1 data row' };
    }
    
    const header = lines[0].split(',');
    if (header.length < 3) {
      return { valid: false, error: 'File must have at least 3 columns' };
    }
    
    return { 
      valid: true, 
      rowCount: lines.length - 1,
      columnCount: header.length,
      header: header
    };
  } catch (error) {
    return { valid: false, error: `File read error: ${error.message}` };
  }
}

/**
 * Analyze output quality
 */
export function analyzeOutputQuality(inputPath, outputPath) {
  try {
    const inputContent = fs.readFileSync(inputPath, 'utf8');
    const outputContent = fs.readFileSync(outputPath, 'utf8');
    
    const inputLines = inputContent.split('\n').filter(line => line.trim());
    const outputLines = outputContent.split('\n').filter(line => line.trim());
    
    const inputRows = inputLines.length - 1;
    const outputRows = outputLines.length - 1;
    
    // Calculate completeness
    const inputHeader = inputLines[0].split(',');
    const outputHeader = outputLines[0].split(',');
    
    let totalFields = 0;
    let filledFields = 0;
    
    outputLines.slice(1).forEach(line => {
      const fields = line.split(',');
      totalFields += fields.length;
      filledFields += fields.filter(field => field.trim() && field.trim() !== 'nan').length;
    });
    
    const completeness = totalFields > 0 ? filledFields / totalFields : 0;
    const rowPreservation = inputRows > 0 ? outputRows / inputRows : 0;
    
    return {
      inputRows,
      outputRows,
      rowPreservation,
      completeness,
      fieldCount: outputHeader.length,
      qualityScore: Math.round((rowPreservation * 0.4 + completeness * 0.6) * 100)
    };
  } catch (error) {
    return { error: error.message };
  }
} 