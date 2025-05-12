"""
Simple, direct file transformation utility that ensures 1:1 row mapping
from input to output files, without relying on OpenAI API calls.

This is a test utility to demonstrate the concept of preserving row counts.
"""

import os
import pandas as pd
from pathlib import Path
import time
import random
import string

# Define the Amazon Inventory Loader template columns
AMAZON_COLUMNS = [
    "item_sku", "external_product_id", "external_product_id_type", "item_name", 
    "brand_name", "manufacturer", "feed_product_type", "update_delete", 
    "standard_price", "quantity", "product_tax_code", "product_site_launch_date", 
    "restock_date", "fulfillment_latency", "item_condition", "main_image_url"
]

def generate_random_string(length=8):
    """Generate a random string for unique filenames"""
    return ''.join(random.choices(string.ascii_lowercase + string.digits, k=length))

def simple_transform(input_file_path, output_file=None, max_rows=1000):
    """
    Perform a simple transformation that preserves row count
    
    Args:
        input_file_path: Path to the CSV file to transform
        output_file: Optional path to save the transformed file
        max_rows: Maximum rows to process (default: 1000)
    
    Returns:
        Dictionary with transformation results and output file path
    """
    try:
        print(f"Reading input file: {input_file_path}")
        
        # Read the CSV file with robust error handling
        df = None
        try:
            # Try with default settings first
            df = pd.read_csv(input_file_path, encoding='utf-8')
        except UnicodeDecodeError:
            # Try another common encoding if UTF-8 fails
            df = pd.read_csv(input_file_path, encoding='latin1')
        except Exception as e:
            # Try with more flexible parsing for problematic CSVs
            print(f"Standard parsing failed: {str(e)}. Trying with error_bad_lines=False...")
            df = pd.read_csv(input_file_path, encoding='utf-8', on_bad_lines='skip')
            print(f"Successfully parsed CSV with flexible parsing.")
        
        # Get basic file info
        input_row_count = len(df)
        input_columns = list(df.columns)
        
        print(f"Input file has {input_row_count} rows and {len(input_columns)} columns")
        print(f"Input columns: {input_columns}")
        
        # Enforce row limit
        if input_row_count > max_rows:
            print(f"Limiting to {max_rows} rows (original: {input_row_count})")
            df = df.head(max_rows)
            input_row_count = len(df)
        
        # Start timing
        start_time = time.time()
        
        # Create a result dataframe with Amazon columns
        result_df = pd.DataFrame(columns=AMAZON_COLUMNS[:len(AMAZON_COLUMNS)])
        
        # Perform a simple mapping that guarantees 1:1 row count
        for i, row in df.iterrows():
            # Create a new row for the Amazon format
            amazon_row = {}
            
            # Map simple fields or use placeholder values
            # item_sku - try to find a SKU in the source or generate one
            if 'sku' in df.columns:
                amazon_row['item_sku'] = row['sku']
            elif 'product_id' in df.columns:
                amazon_row['item_sku'] = f"SKU-{row['product_id']}"
            else:
                amazon_row['item_sku'] = f"SKU-{i+1000}"
                
            # external_product_id - leave empty for now
            amazon_row['external_product_id'] = ""
            amazon_row['external_product_id_type'] = ""
            
            # item_name - use title or description if available
            if 'title' in df.columns:
                amazon_row['item_name'] = row['title']
            elif 'name' in df.columns:
                amazon_row['item_name'] = row['name']
            elif 'product_name' in df.columns:
                amazon_row['item_name'] = row['product_name']
            elif 'description' in df.columns:
                # Truncate description if it's too long
                amazon_row['item_name'] = row['description'][:100]
            else:
                amazon_row['item_name'] = f"Product {i+1}"
                
            # brand_name
            if 'brand' in df.columns:
                amazon_row['brand_name'] = row['brand']
            elif 'manufacturer' in df.columns:
                amazon_row['brand_name'] = row['manufacturer']
            else:
                amazon_row['brand_name'] = "Generic"
                
            # manufacturer - use same as brand_name
            amazon_row['manufacturer'] = amazon_row['brand_name']
            
            # feed_product_type
            amazon_row['feed_product_type'] = "consumer_electronics"
            
            # update_delete
            amazon_row['update_delete'] = "Update"
            
            # standard_price
            if 'price' in df.columns:
                amazon_row['standard_price'] = row['price']
            else:
                amazon_row['standard_price'] = "99.99"
                
            # quantity
            if 'inventory' in df.columns:
                amazon_row['quantity'] = row['inventory']
            elif 'stock' in df.columns:
                amazon_row['quantity'] = row['stock']
            elif 'quantity' in df.columns:
                amazon_row['quantity'] = row['quantity']
            else:
                amazon_row['quantity'] = "10"
                
            # product_tax_code - leave empty
            amazon_row['product_tax_code'] = ""
            
            # product_site_launch_date - leave empty
            amazon_row['product_site_launch_date'] = ""
            
            # restock_date - leave empty
            amazon_row['restock_date'] = ""
            
            # fulfillment_latency - leave empty
            amazon_row['fulfillment_latency'] = ""
            
            # item_condition
            amazon_row['item_condition'] = "New"
            
            # main_image_url
            if 'image' in df.columns:
                amazon_row['main_image_url'] = row['image']
            elif 'image_url' in df.columns:
                amazon_row['main_image_url'] = row['image_url']
            elif 'main_image_url' in df.columns:
                amazon_row['main_image_url'] = row['main_image_url']
            else:
                amazon_row['main_image_url'] = "https://example.com/placeholder-image.jpg"
            
            # Add the row to the result dataframe
            result_df = pd.concat([result_df, pd.DataFrame([amazon_row])], ignore_index=True)
        
        # Determine the output file path
        if output_file:
            output_path = output_file
        else:
            # Create an output filename
            input_filename = Path(input_file_path).stem
            timestamp = int(time.time())
            random_id = generate_random_string(4)
            output_filename = f"simple_amazon_{input_filename}_{timestamp}_{random_id}.csv"
            
            # Ensure the output directory exists
            output_dir = os.path.join(os.getcwd(), 'temp_uploads')
            os.makedirs(output_dir, exist_ok=True)
            
            output_path = os.path.join(output_dir, output_filename)
        
        # Save the transformed data to CSV
        result_df.to_csv(output_path, index=False)
        
        process_time = time.time() - start_time
        
        print(f"Transformation complete: {input_row_count} rows processed in {process_time:.2f} seconds")
        print(f"Output saved to: {output_path}")
        
        # Verify row count
        output_df = pd.read_csv(output_path)
        output_row_count = len(output_df)
        
        print(f"Output file has {output_row_count} rows")
        
        if input_row_count != output_row_count:
            print(f"WARNING: Row count mismatch! Input: {input_row_count}, Output: {output_row_count}")
        else:
            print(f"SUCCESS: Perfect 1:1 mapping confirmed!")
        
        return {
            "success": True,
            "input_rows": input_row_count,
            "output_rows": output_row_count,
            "output_file": output_path,
            "processing_time": process_time
        }
        
    except Exception as e:
        print(f"Error in simple_transform: {str(e)}")
        return {
            "error": f"Transformation failed: {str(e)}"
        }

# Testing functionality
if __name__ == "__main__":
    import sys
    
    if len(sys.argv) < 2:
        print("Usage: python simple_transform.py <input_csv_file> [output_csv_file] [max_rows]")
        sys.exit(1)
    
    input_file = sys.argv[1]
    output_file = sys.argv[2] if len(sys.argv) > 2 else None
    max_rows = int(sys.argv[3]) if len(sys.argv) > 3 else 1000
    
    if not os.path.exists(input_file):
        print(f"Error: Input file '{input_file}' not found.")
        sys.exit(1)
    
    print(f"Simple transforming {input_file} to Amazon format...")
    result = simple_transform(input_file, output_file, max_rows)
    
    if "error" in result:
        print(f"Error: {result['error']}")
        sys.exit(1)
    
    print(f"Success! Transformed {result['input_rows']} rows to Amazon format.")
    print(f"Output saved to: {result['output_file']}")
    print(f"Processing time: {result['processing_time']:.2f} seconds")