# Flywheel Transformer Testing System

## Overview

The Flywheel Testing System is designed to systematically test and improve the transformer by:

1. **Prioritizing real data** with higher weights for more reliable testing
2. **Using grounding files** for validation and reference
3. **Tracking improvements** and automatically adding high-quality outputs to grounding
4. **Detecting regressions** to prevent quality degradation
5. **Generating comprehensive reports** for analysis

## Data Source Hierarchy

The system uses a weighted approach to prioritize data quality:

| Source Type | Weight | Description | Priority |
|-------------|--------|-------------|----------|
| `real_data` | 10.0 | Real vendor data files | Highest |
| `grounding` | 8.0 | Grounding files for validation | High |
| `synthetic` | 1.0 | Synthetic test data | Lowest |

## Directory Structure

```
├── real_data/              # Place your real vendor files here
│   ├── vendor1_phones.csv
│   ├── vendor2_laptops.xlsx
│   └── ...
├── grounding_updates/      # High-quality outputs added to grounding
├── test_outputs/          # All transformer outputs
├── test_reports/          # Detailed test reports
└── test/
    ├── flywheel-transformer.test.js  # Main test harness
    └── README-flywheel.md           # This file
```

## Quick Start

### 1. Add Real Data Files

Place your real vendor data files in the `real_data/` directory:

```bash
# Copy your real vendor files
cp /path/to/your/real/vendor_data.csv real_data/
cp /path/to/your/real/another_vendor.xlsx real_data/
```

### 2. Run Tests

```bash
# Run all tests
node run-flywheel-tests.js

# Run only real data tests (recommended for initial testing)
node run-flywheel-tests.js --source=real_data

# Quick test with limited files
node run-flywheel-tests.js --quick

# Get help
node run-flywheel-tests.js --help
```

### 3. Review Results

Check the generated reports in `test_reports/` and outputs in `test_outputs/`.

## Adding Real Data Files

### File Requirements

- **Format**: CSV, XLSX, or XLS
- **Content**: Real vendor data (not synthetic/test data)
- **Naming**: Descriptive names (e.g., `vendor_name_product_type.csv`)
- **Size**: Any size (system will handle large files)

### Example Real Data Files

```
real_data/
├── acme_cell_phones.csv          # Real cell phone data from ACME vendor
├── techcorp_laptops.xlsx         # Real laptop data from TechCorp
├── gadgetworld_headphones.csv    # Real headphone data from GadgetWorld
└── megastore_base_products.xlsx  # Real base product data from MegaStore
```

## Understanding Test Results

### Quality Score Components

The system calculates a quality score (0-100) based on:

1. **Row Preservation (40%)**: Input/output row ratio
2. **Data Completeness (30%)**: Percentage of non-empty fields
3. **Field Enrichment (20%)**: How much data was enhanced
4. **Template Compliance (10%)**: Adherence to expected format

### Weighted Scoring

Final scores are weighted by data source importance:
- Real data: Score × 10.0
- Grounding: Score × 8.0  
- Synthetic: Score × 1.0

### Report Interpretation

```json
{
  "summary": {
    "totalTests": 15,
    "successfulTests": 14,
    "averageQualityScore": 85,
    "weightedAverageScore": 720,
    "improvements": 3,
    "groundingUpdates": 2
  }
}
```

## Grounding Updates

When the transformer produces high-quality output (score ≥ 80) from real data, it's automatically saved to `grounding_updates/` for potential addition to the grounding system.

### Manual Grounding Integration

1. Review files in `grounding_updates/`
2. If quality is good, copy to appropriate grounding directory:
   ```bash
   cp grounding_updates/vendor_phones_grounding_update.csv grounding/walmart/cell_phones/
   ```
3. Update field definitions if needed

## Iterative Improvement Process

### 1. Baseline Testing
```bash
# Run initial tests with real data
node run-flywheel-tests.js --source=real_data
```

### 2. Transformer Improvements
- Modify transformer logic based on test results
- Focus on low-scoring areas
- Test edge cases from real data

### 3. Regression Testing
```bash
# Run full test suite to ensure no regressions
node run-flywheel-tests.js
```

### 4. Grounding Updates
- Review high-quality outputs
- Add to grounding system
- Update field definitions

### 5. Repeat
- Add more real data files
- Run tests again
- Continue improving

## Configuration

Edit `test/flywheel-transformer.test.js` to modify:

- **Weights**: Change data source importance
- **Quality thresholds**: Adjust what constitutes "high quality"
- **File limits**: Control how many files to test per source
- **Output settings**: Configure what gets saved

## Troubleshooting

### Common Issues

1. **No real data files found**
   - Ensure files are in `real_data/` directory
   - Check file extensions (.csv, .xlsx, .xls)

2. **Transformer failures**
   - Check transformer integration in `runTransformer()` method
   - Verify input file format compatibility

3. **Low quality scores**
   - Review transformer logic
   - Check field mapping and enrichment
   - Validate template compliance

### Debug Mode

Add debug logging to see detailed test execution:

```javascript
// In flywheel-transformer.test.js
console.log('Debug: Processing file:', filePath);
console.log('Debug: Quality score components:', {rowPreservation, completeness, enrichment, compliance});
```

## Best Practices

1. **Start with real data**: Always test with actual vendor files first
2. **Iterate gradually**: Make small improvements and test frequently
3. **Track changes**: Keep test reports for comparison
4. **Update grounding**: Regularly add high-quality outputs to grounding
5. **Monitor regressions**: Watch for quality score decreases

## Integration with CI/CD

Add to your build pipeline:

```yaml
# Example GitHub Actions step
- name: Run Flywheel Tests
  run: |
    node run-flywheel-tests.js --source=real_data
    # Fail if average quality score drops below threshold
    if [ $(jq -r '.summary.averageQualityScore' test_reports/latest.json) -lt 70 ]; then
      echo "Quality score too low!"
      exit 1
    fi
```

## Support

For issues or questions about the flywheel testing system:

1. Check test reports for detailed error information
2. Review transformer integration code
3. Verify real data file formats
4. Check configuration settings 