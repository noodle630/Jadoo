#!/usr/bin/env node

/**
 * Flywheel Test Runner
 * 
 * Usage:
 *   node run-flywheel-tests.js                    # Run all tests
 *   node run-flywheel-tests.js --source=real      # Run only real data tests
 *   node run-flywheel-tests.js --quick            # Run with limited files
 */

import { FlywheelTestHarness } from './test/flywheel-transformer.test.js';

const args = process.argv.slice(2);
const options = {
  source: args.find(arg => arg.startsWith('--source='))?.split('=')[1],
  quick: args.includes('--quick'),
  help: args.includes('--help') || args.includes('-h')
};

if (options.help) {
  console.log(`
Flywheel Transformer Test Runner

Usage:
  node run-flywheel-tests.js [options]

Options:
  --source=TYPE     Run tests for specific source type (real_data, grounding, synthetic)
  --quick           Run with limited files for faster testing
  --help, -h        Show this help message

Examples:
  node run-flywheel-tests.js
  node run-flywheel-tests.js --source=real_data
  node run-flywheel-tests.js --quick
`);
  process.exit(0);
}

async function main() {
  console.log('🚀 Starting Flywheel Tests...');
  console.log(`Options: ${JSON.stringify(options)}`);
  console.log('');
  
  const harness = new FlywheelTestHarness();
  
  // Modify config based on options
  if (options.quick) {
    harness.CONFIG = {
      ...harness.CONFIG,
      MAX_FILES_PER_SOURCE: 2
    };
  }
  
  if (options.source) {
    // Filter to only specified source
    const allowedSources = [options.source];
    Object.keys(harness.CONFIG.DATA_SOURCES).forEach(source => {
      if (!allowedSources.includes(source)) {
        delete harness.CONFIG.DATA_SOURCES[source];
      }
    });
  }
  
  await harness.runTests();
}

main().catch(error => {
  console.error('❌ Test runner failed:', error);
  process.exit(1);
}); 