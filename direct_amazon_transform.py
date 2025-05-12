"""
Direct implementation of Amazon Inventory Loader format transformation
using the direct_csv_transform module.

This ensures 1:1 row mapping between input and output CSV files.
"""

import os
from direct_csv_transform import direct_transform_csv

# Define the Amazon Inventory Loader template columns
AMAZON_COLUMNS = [
    "item_sku", "external_product_id", "external_product_id_type", "item_name", 
    "brand_name", "manufacturer", "feed_product_type", "update_delete", 
    "standard_price", "quantity", "product_tax_code", "product_site_launch_date", 
    "restock_date", "fulfillment_latency", "item_condition", "main_image_url", 
    "swatch_image_url", "other_image_url1", "other_image_url2", "other_image_url3", 
    "item_type", "model", "part_number", "bullet_point1", "bullet_point2", 
    "bullet_point3", "bullet_point4", "bullet_point5", "generic_keywords", 
    "product_description", "wattage", "connectivity_technology", "included_components", 
    "material_type", "included_features", "warranty_description", "warranty_type", 
    "is_portable", "power_source_type", "number_of_items", "battery_type", 
    "are_batteries_included"
]

# Amazon transformation prompt template
AMAZON_PROMPT_TEMPLATE = """
As an AI data transformation expert, analyze the following CSV data and provide detailed instructions 
for converting it to Amazon Inventory Loader format.

Data information:
{data_info}

Sample data (first {sample_rows} rows):
{data_sample}

TRANSFORMATION TASK:
Create a detailed plan for transforming this data to Amazon Inventory Loader format.

REQUIRED INSTRUCTIONS:
1. Analyze the source data structure and identify which fields map to Amazon fields
2. For each Amazon column, specify exactly how to populate it from source data
3. Include precise rules for extracting information from combined fields (e.g., extracting model, color, and storage from product titles)
4. Provide specific default values for required fields that might be missing
5. Include data cleaning and standardization rules (e.g., price formatting, removing currency symbols)
6. Explain specific formatting requirements for each field (e.g., date formats, allowable values)

CRITICAL MAPPING RULES:
- item_sku: Use exact original SKU, never modify
- item_name: Format as "[Brand] [Model] [Color] [Capacity]" (without the condition suffix)
- brand_name: Extract from source data, use consistent naming (e.g., "Samsung" for Galaxy devices)
- update_delete: Always "Update"
- standard_price: Format as decimal number without currency symbols
- quantity: Use exact original quantity, or 0 if not available
- item_condition: Map condition suffixes to Amazon's condition values:
  * "Premium 90" or "Premium 100" → "Used - Like New"
  * "Excellent 80" or "Excellent 100" → "Used - Very Good"
  * "Good" → "Used - Good"
  * If no condition found, use "New"
- feed_product_type: Use "wireless_accessories" for phone accessories, "consumer_electronics" for electronics, or "wireless_phone" for phones

MOBILE PHONE PARSING RULES:
1. For titles like "Galaxy S22+ (5G) - T-Mobile - Green - Single Sim - 256GB Premium 90":
   - Model: "Galaxy S22+"
   - Network: "5G"
   - Carrier: "T-Mobile"
   - Color: "Green"
   - SIM Type: "Single Sim"
   - Storage: "256GB"
   - Condition: "Premium 90"

2. Extract these components with precision into the appropriate Amazon fields

Your instructions will be used to transform every row in the dataset, maintaining a 1:1 mapping between 
input and output rows. Be extremely specific and detailed.
"""

def transform_to_amazon_format(csv_file_path, output_file=None, max_rows=1000):
    """
    Transform a CSV file to Amazon Inventory Loader format using the direct transformation approach
    
    Args:
        csv_file_path: Path to the CSV file to transform
        output_file: Optional path to save the transformed file
        max_rows: Maximum rows to process (default: 1000)
    
    Returns:
        Dictionary with transformation results and output file path
    """
    result = direct_transform_csv(
        input_file_path=csv_file_path,
        output_format="Amazon",
        output_columns=AMAZON_COLUMNS,
        prompt_template=AMAZON_PROMPT_TEMPLATE,
        max_rows=max_rows,
        output_file=output_file
    )
    
    return result

# CLI tool functionality if this script is run directly
if __name__ == "__main__":
    import sys
    
    if len(sys.argv) < 2:
        print("Usage: python direct_amazon_transform.py <input_csv_file> [output_csv_file] [max_rows]")
        sys.exit(1)
    
    input_file = sys.argv[1]
    output_file = sys.argv[2] if len(sys.argv) > 2 else None
    max_rows = int(sys.argv[3]) if len(sys.argv) > 3 else 1000
    
    if not os.path.exists(input_file):
        print(f"Error: Input file '{input_file}' not found.")
        sys.exit(1)
    
    print(f"Transforming {input_file} to Amazon Inventory Loader format...")
    result = transform_to_amazon_format(input_file, output_file, max_rows)
    
    if "error" in result:
        print(f"Error: {result['error']}")
        sys.exit(1)
    
    print(f"Success! Transformed {result['input_rows']} rows to Amazon format.")
    print(f"Output saved to: {result['output_file']}")
    print(f"Processing time: {result['processing_time']} seconds")