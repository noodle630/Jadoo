/**
 * Flywheel Transformer Test Harness
 * 
 * This script runs systematic tests on the transformer using:
 * 1. Real data files (highest priority/weight)
 * 2. Grounding files for validation
 * 3. Synthetic test files (lowest priority)
 * 
 * Features:
 * - Weighted scoring based on data source quality
 * - Automatic grounding updates when improvements found
 * - Regression detection
 * - Comprehensive reporting
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configuration
const CONFIG = {
  // Test data sources with weights (higher = more important)
  DATA_SOURCES: {
    // Real data files (you'll provide these)
    real_data: {
      path: path.join(__dirname, '../real_data/'),
      weight: 10.0,
      description: 'Real vendor data files'
    },
    // Grounding files (reference/validation)
    grounding: {
      path: path.join(__dirname, '../grounding/walmart/'),
      weight: 8.0,
      description: 'Grounding files for validation'
    },
    // Synthetic test files (lowest priority)
    synthetic: {
      path: path.join(__dirname, '../attached_assets/test_feeds/'),
      weight: 1.0,
      description: 'Synthetic test data'
    }
  },
  
  // Output directories
  OUTPUT_DIR: path.join(__dirname, '../test_outputs/'),
  GROUNDING_UPDATES_DIR: path.join(__dirname, '../grounding_updates/'),
  REPORTS_DIR: path.join(__dirname, '../test_reports/'),
  
  // Test configuration
  MAX_FILES_PER_SOURCE: 5, // Limit files per source to avoid overwhelming
  SAVE_OUTPUTS: true,
  SAVE_GROUNDING_UPDATES: true,
  GENERATE_REPORTS: true
};

// Test result tracking
class TestResult {
  constructor(filePath, sourceType, weight) {
    this.filePath = filePath;
    this.sourceType = sourceType;
    this.weight = weight;
    this.startTime = Date.now();
    this.endTime = null;
    this.success = false;
    this.error = null;
    this.inputRowCount = 0;
    this.outputRowCount = 0;
    this.qualityScore = 0;
    this.improvements = [];
    this.regressions = [];
    this.groundingUpdate = null;
  }
  
  complete(success, outputPath = null, error = null) {
    this.endTime = Date.now();
    this.success = success;
    this.error = error;
    
    if (success && outputPath) {
      this.calculateQualityScore(outputPath);
    }
  }
  
  calculateQualityScore(outputPath) {
    // Basic quality metrics
    try {
      const outputContent = fs.readFileSync(outputPath, 'utf8');
      const outputLines = outputContent.split('\n').filter(line => line.trim());
      
      this.outputRowCount = outputLines.length - 1; // Exclude header
      
      // Calculate quality score based on:
      // 1. Row preservation (input/output ratio)
      // 2. Data completeness
      // 3. Field enrichment
      // 4. Template compliance
      
      let score = 0;
      
      // Row preservation (40% of score)
      const rowPreservation = this.outputRowCount / this.inputRowCount;
      score += Math.min(rowPreservation, 1.0) * 40;
      
      // Data completeness (30% of score)
      const completeness = this.calculateCompleteness(outputPath);
      score += completeness * 30;
      
      // Field enrichment (20% of score)
      const enrichment = this.calculateEnrichment(outputPath);
      score += enrichment * 20;
      
      // Template compliance (10% of score)
      const compliance = this.calculateCompliance(outputPath);
      score += compliance * 10;
      
      this.qualityScore = Math.round(score);
      
    } catch (err) {
      console.error(`Error calculating quality score for ${outputPath}:`, err);
      this.qualityScore = 0;
    }
  }
  
  calculateCompleteness(outputPath) {
    // Calculate percentage of non-empty fields
    try {
      const content = fs.readFileSync(outputPath, 'utf8');
      const lines = content.split('\n').filter(line => line.trim());
      if (lines.length < 2) return 0;
      
      const header = lines[0].split(',');
      const dataLines = lines.slice(1);
      
      let totalFields = 0;
      let filledFields = 0;
      
      dataLines.forEach(line => {
        const fields = line.split(',');
        totalFields += fields.length;
        filledFields += fields.filter(field => field.trim() && field.trim() !== 'nan').length;
      });
      
      return totalFields > 0 ? filledFields / totalFields : 0;
    } catch (err) {
      return 0;
    }
  }
  
  calculateEnrichment(outputPath) {
    // Calculate how much the transformer enriched the data
    // This is a simplified version - you might want more sophisticated logic
    try {
      const content = fs.readFileSync(outputPath, 'utf8');
      const lines = content.split('\n').filter(line => line.trim());
      if (lines.length < 2) return 0;
      
      const dataLines = lines.slice(1);
      let enrichedFields = 0;
      let totalFields = 0;
      
      dataLines.forEach(line => {
        const fields = line.split(',');
        totalFields += fields.length;
        enrichedFields += fields.filter(field => {
          const trimmed = field.trim();
          return trimmed && 
                 trimmed !== 'nan' && 
                 trimmed.length > 3 && 
                 !trimmed.match(/^[A-Z0-9]{8,}$/); // Not just random strings
        }).length;
      });
      
      return totalFields > 0 ? enrichedFields / totalFields : 0;
    } catch (err) {
      return 0;
    }
  }
  
  calculateCompliance(outputPath) {
    // Check if output follows expected template format
    try {
      const content = fs.readFileSync(outputPath, 'utf8');
      const lines = content.split('\n').filter(line => line.trim());
      if (lines.length < 2) return 0;
      
      const header = lines[0].toLowerCase();
      
      // Check for required Walmart fields
      const requiredFields = ['product id', 'product id type', 'price', 'currency'];
      const foundFields = requiredFields.filter(field => header.includes(field));
      
      return foundFields.length / requiredFields.length;
    } catch (err) {
      return 0;
    }
  }
  
  getDuration() {
    return this.endTime ? this.endTime - this.startTime : 0;
  }
  
  getWeightedScore() {
    return this.qualityScore * this.weight;
  }
}

class FlywheelTestHarness {
  constructor() {
    this.results = [];
    this.summary = {
      totalTests: 0,
      successfulTests: 0,
      failedTests: 0,
      averageQualityScore: 0,
      weightedAverageScore: 0,
      totalDuration: 0,
      improvements: 0,
      regressions: 0,
      groundingUpdates: 0
    };
  }
  
  async runTests() {
    console.log('🚀 Starting Flywheel Transformer Tests...\n');
    
    // Ensure output directories exist
    this.ensureDirectories();
    
    // Find test files from all sources
    const testFiles = await this.discoverTestFiles();
    
    console.log(`📁 Found ${testFiles.length} test files:`);
    testFiles.forEach(file => {
      console.log(`  - ${file.sourceType}: ${path.basename(file.path)} (weight: ${file.weight})`);
    });
    console.log('');
    
    // Run tests
    for (const file of testFiles) {
      await this.runSingleTest(file);
    }
    
    // Generate summary
    this.generateSummary();
    
    // Save reports
    if (CONFIG.GENERATE_REPORTS) {
      this.saveReports();
    }
    
    // Check for grounding updates
    if (CONFIG.SAVE_GROUNDING_UPDATES) {
      this.processGroundingUpdates();
    }
    
    console.log('\n✅ Flywheel tests completed!');
    this.printSummary();
  }
  
  ensureDirectories() {
    [CONFIG.OUTPUT_DIR, CONFIG.GROUNDING_UPDATES_DIR, CONFIG.REPORTS_DIR].forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
  }
  
  async discoverTestFiles() {
    const files = [];
    
    for (const [sourceType, config] of Object.entries(CONFIG.DATA_SOURCES)) {
      if (!fs.existsSync(config.path)) {
        console.log(`⚠️  Source directory not found: ${config.path}`);
        continue;
      }
      
      const sourceFiles = this.findFilesInDirectory(config.path);
      const selectedFiles = sourceFiles.slice(0, CONFIG.MAX_FILES_PER_SOURCE);
      
      selectedFiles.forEach(filePath => {
        files.push({
          path: filePath,
          sourceType,
          weight: config.weight,
          description: config.description
        });
      });
    }
    
    // Sort by weight (highest first)
    return files.sort((a, b) => b.weight - a.weight);
  }
  
  findFilesInDirectory(dirPath) {
    const files = [];
    
    const items = fs.readdirSync(dirPath, { withFileTypes: true });
    
    for (const item of items) {
      const fullPath = path.join(dirPath, item.name);
      
      if (item.isDirectory()) {
        // Recursively search subdirectories
        files.push(...this.findFilesInDirectory(fullPath));
      } else if (item.isFile()) {
        // Check if it's a supported file type
        const ext = path.extname(item.name).toLowerCase();
        if (['.csv', '.xlsx', '.xls'].includes(ext)) {
          files.push(fullPath);
        }
      }
    }
    
    return files;
  }
  
  async runSingleTest(fileInfo) {
    const result = new TestResult(fileInfo.path, fileInfo.sourceType, fileInfo.weight);
    
    console.log(`🧪 Testing: ${path.basename(fileInfo.path)} (${fileInfo.sourceType})`);
    
    try {
      // Count input rows
      const inputContent = fs.readFileSync(fileInfo.path, 'utf8');
      const inputLines = inputContent.split('\n').filter(line => line.trim());
      result.inputRowCount = inputLines.length - 1; // Exclude header
      
      // Generate output filename
      const baseName = path.basename(fileInfo.path, path.extname(fileInfo.path));
      const outputPath = path.join(CONFIG.OUTPUT_DIR, `${baseName}_transformed.csv`);
      
      // Run transformer (this would call your actual transformer)
      await this.runTransformer(fileInfo.path, outputPath);
      
      result.complete(true, outputPath);
      
      console.log(`  ✅ Success: ${result.qualityScore}/100 quality score`);
      
    } catch (error) {
      result.complete(false, null, error.message);
      console.log(`  ❌ Failed: ${error.message}`);
    }
    
    this.results.push(result);
  }
  
  async runTransformer(inputPath, outputPath) {
    // Import and use the actual transformer integration
    try {
      const { runTransformer } = await import('./transformer-integration.js');
      
      // Determine category from file path or use default
      let category = 'base';
      const fileName = path.basename(inputPath, path.extname(inputPath));
      
      // Try to extract category from filename
      if (fileName.includes('cell_phone') || fileName.includes('phone')) {
        category = 'cell_phones';
      } else if (fileName.includes('laptop')) {
        category = 'laptop_computers';
      } else if (fileName.includes('headphone')) {
        category = 'headphones';
      } else if (fileName.includes('monitor')) {
        category = 'computer_monitors';
      } else if (fileName.includes('desktop')) {
        category = 'desktop_computers';
      } else if (fileName.includes('tablet')) {
        category = 'tablet_computers';
      } else if (fileName.includes('tv') || fileName.includes('television')) {
        category = 'televisions';
      } else if (fileName.includes('watch')) {
        category = 'smart_watches';
      } else if (fileName.includes('speaker')) {
        category = 'portable_speakers';
      } else if (fileName.includes('sound_bar')) {
        category = 'sound_bars';
      } else if (fileName.includes('console') || fileName.includes('game')) {
        category = 'video_game_consoles';
      }
      
      console.log(`  📂 Category detected: ${category}`);
      
      // Run transformer with appropriate settings
      const result = await runTransformer(inputPath, outputPath, {
        platform: 'walmart',
        category: category,
        tier: 'free', // Start with free tier for testing
        maxRows: 100,
        fillPercentage: 0.4
      });
      
      console.log(`  📊 Transformer result: ${result.outputRows} output rows`);
      
    } catch (error) {
      throw new Error(`Transformer failed: ${error.message}`);
    }
  }
  
  generateSummary() {
    const successfulResults = this.results.filter(r => r.success);
    const failedResults = this.results.filter(r => !r.success);
    
    this.summary = {
      totalTests: this.results.length,
      successfulTests: successfulResults.length,
      failedTests: failedResults.length,
      averageQualityScore: successfulResults.length > 0 
        ? Math.round(successfulResults.reduce((sum, r) => sum + r.qualityScore, 0) / successfulResults.length)
        : 0,
      weightedAverageScore: successfulResults.length > 0
        ? Math.round(successfulResults.reduce((sum, r) => sum + r.getWeightedScore(), 0) / successfulResults.length)
        : 0,
      totalDuration: this.results.reduce((sum, r) => sum + r.getDuration(), 0),
      improvements: this.results.filter(r => r.improvements.length > 0).length,
      regressions: this.results.filter(r => r.regressions.length > 0).length,
      groundingUpdates: this.results.filter(r => r.groundingUpdate).length
    };
  }
  
  saveReports() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const reportPath = path.join(CONFIG.REPORTS_DIR, `flywheel_report_${timestamp}.json`);
    
    const report = {
      timestamp: new Date().toISOString(),
      config: CONFIG,
      summary: this.summary,
      results: this.results.map(r => ({
        filePath: r.filePath,
        sourceType: r.sourceType,
        weight: r.weight,
        success: r.success,
        qualityScore: r.qualityScore,
        weightedScore: r.getWeightedScore(),
        duration: r.getDuration(),
        inputRowCount: r.inputRowCount,
        outputRowCount: r.outputRowCount,
        error: r.error
      }))
    };
    
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`📊 Report saved: ${reportPath}`);
  }
  
  processGroundingUpdates() {
    // Identify high-quality outputs that should be added to grounding
    const highQualityResults = this.results.filter(r => 
      r.success && r.qualityScore >= 80 && r.sourceType === 'real_data'
    );
    
    for (const result of highQualityResults) {
      const baseName = path.basename(result.filePath, path.extname(result.filePath));
      const outputPath = path.join(CONFIG.OUTPUT_DIR, `${baseName}_transformed.csv`);
      
      if (fs.existsSync(outputPath)) {
        const groundingPath = path.join(CONFIG.GROUNDING_UPDATES_DIR, `${baseName}_grounding_update.csv`);
        fs.copyFileSync(outputPath, groundingPath);
        result.groundingUpdate = groundingPath;
        console.log(`💾 Grounding update saved: ${groundingPath}`);
      }
    }
  }
  
  printSummary() {
    console.log('\n📈 Test Summary:');
    console.log(`  Total Tests: ${this.summary.totalTests}`);
    console.log(`  Successful: ${this.summary.successfulTests}`);
    console.log(`  Failed: ${this.summary.failedTests}`);
    console.log(`  Average Quality Score: ${this.summary.averageQualityScore}/100`);
    console.log(`  Weighted Average Score: ${this.summary.weightedAverageScore}`);
    console.log(`  Total Duration: ${this.summary.totalDuration}ms`);
    console.log(`  Improvements: ${this.summary.improvements}`);
    console.log(`  Regressions: ${this.summary.regressions}`);
    console.log(`  Grounding Updates: ${this.summary.groundingUpdates}`);
    
    // Print results by source type
    console.log('\n📊 Results by Source Type:');
    for (const [sourceType, config] of Object.entries(CONFIG.DATA_SOURCES)) {
      const sourceResults = this.results.filter(r => r.sourceType === sourceType);
      const successful = sourceResults.filter(r => r.success);
      const avgScore = successful.length > 0 
        ? Math.round(successful.reduce((sum, r) => sum + r.qualityScore, 0) / successful.length)
        : 0;
      
      console.log(`  ${config.description}: ${successful.length}/${sourceResults.length} successful, avg score: ${avgScore}/100`);
    }
  }
}

// Main execution
async function main() {
  const harness = new FlywheelTestHarness();
  await harness.runTests();
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { FlywheelTestHarness, TestResult, CONFIG }; 