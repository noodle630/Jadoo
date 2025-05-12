/**
 * Test script for the exactParser utility
 * Run with: node test_exactParser.js
 */

import { countExactRows, transformWithExactMapping } from './server/utils/exactParser.js';
import * as fs from 'fs';
import * as path from 'path';

// Test file paths
const INPUT_FILE = 'test_reliable.csv';
const OUTPUT_FILE = 'test_reliable_output.csv';

async function runTests() {
  console.log('===== Testing exactParser.ts =====');
  
  // Test 1: Count rows
  console.log('\n[Test 1] Counting rows in input file');
  const rowInfo = countExactRows(INPUT_FILE);
  console.log('Row count result:', rowInfo);
  
  // Test 2: Transform with identity function (no changes)
  console.log('\n[Test 2] Transforming with identity function');
  const identityResult = await transformWithExactMapping(
    INPUT_FILE,
    OUTPUT_FILE,
    (line, index, isHeader) => line // Identity transformation
  );
  console.log('Identity transform result:', identityResult);
  
  // Test 3: Transform with Amazon-like headers
  console.log('\n[Test 3] Transforming with Amazon-like headers');
  const amazonOutput = 'test_amazon_output.csv';
  const amazonResult = await transformWithExactMapping(
    INPUT_FILE,
    amazonOutput,
    (line, index, isHeader) => {
      if (isHeader) {
        return 'sku,product-id,product-id-type,item-condition,price,quantity';
      } else {
        // Get fields from original line
        const fields = line.split(',');
        // Construct new line with different format
        return `${fields[0]},${fields[0]},ASIN,New,${fields[3]},${fields[4]}`;
      }
    }
  );
  console.log('Amazon transform result:', amazonResult);
  
  // Test 4: Read the Amazon output file
  console.log('\n[Test 4] Reading the Amazon output file');
  const amazonRowInfo = countExactRows(amazonOutput);
  console.log('Amazon row count:', amazonRowInfo);
  
  console.log('\n===== All tests complete =====');
}

runTests().catch(err => {
  console.error('Test failed:', err);
});