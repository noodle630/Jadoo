/**
 * Simple test script to verify CSV transformation with 1:1 row mapping
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Input CSV file
const INPUT_FILE = path.join(__dirname, 'test_reliable.csv');
const OUTPUT_FILE = path.join(__dirname, 'test_output.csv');

// Read input file
const inputContent = fs.readFileSync(INPUT_FILE, 'utf8');
const inputLines = inputContent.split('\n');
console.log(`Input file has ${inputLines.length} lines`);

// Simple transformation: Convert to Amazon format
const outputLines = [];

// Transform the header row
outputLines.push('sku,product-id,product-id-type,price,quantity');

// Transform data rows (preserve 1:1 mapping)
for (let i = 1; i < inputLines.length; i++) {
    const line = inputLines[i];
    if (line.trim() === '') continue;
    
    const fields = line.split(',');
    const transformedLine = `${fields[0]},${fields[0]},ASIN,${fields[3]},${fields[4]}`;
    outputLines.push(transformedLine);
}

// Write output file
fs.writeFileSync(OUTPUT_FILE, outputLines.join('\n'));

// Read and verify the output
const outputContent = fs.readFileSync(OUTPUT_FILE, 'utf8');
const outputLineCount = outputContent.split('\n').length;

// Count data rows (excluding header)
const inputDataRows = inputLines.filter(line => line.trim() !== '').length - 1;
const outputDataRows = outputLines.length - 1;

console.log(`Input file has ${inputDataRows} data rows`);
console.log(`Output file has ${outputDataRows} data rows`);
console.log(`Row mapping ${inputDataRows === outputDataRows ? 'PRESERVED' : 'BROKEN'}`);

// Display contents
console.log('\nInput content:');
console.log(inputContent);
console.log('\nOutput content:');
console.log(outputContent);