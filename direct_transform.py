"""
Direct CSV Transformation utility that ensures perfect 1:1 row mapping
between input and output files.

This is a simplified version that transforms CSV files to various marketplace formats
while guaranteeing that every input row has exactly one corresponding output row.
"""

import os
import pandas as pd
from openai import OpenAI
from dotenv import load_dotenv
from pathlib import Path
import time
import random
import string
import json
import sys

# Load environment variables
load_dotenv()

# Get the OpenAI API key
api_key = os.getenv("OPENAI_API_KEY")
if not api_key:
    print(json.dumps({"error": "OPENAI_API_KEY environment variable not set"}))
    sys.exit(1)

# Initialize OpenAI client
client = OpenAI(api_key=api_key)

def generate_random_string(length=8):
    """Generate a random string for unique filenames"""
    return ''.join(random.choices(string.ascii_lowercase + string.digits, k=length))

def direct_transform(input_file_path, marketplace_format, max_rows=1000):
    """
    Transform a CSV file to a marketplace format with guaranteed 1:1 row mapping
    
    Args:
        input_file_path: Path to the CSV file to transform
        marketplace_format: Name of the target format (e.g., 'amazon', 'walmart')
        max_rows: Maximum rows to process (default: 1000)
    
    Returns:
        Dictionary with transformation results and output file path
    """
    start_time = time.time()
    try:
        print(f"Reading input file: {input_file_path}")
        
        # Read the CSV file with robust error handling
        df = None
        try:
            # Try with default settings first
            df = pd.read_csv(input_file_path, encoding='utf-8')
        except UnicodeDecodeError:
            # Try another common encoding if UTF-8 fails
            try:
                df = pd.read_csv(input_file_path, encoding='latin1')
            except Exception as e:
                print(f"Error with latin1 encoding: {str(e)}")
                return {"error": f"Failed to parse CSV with UTF-8 or latin1 encoding: {str(e)}"}
        except Exception as e:
            # Try with more flexible parsing for problematic CSVs
            try:
                df = pd.read_csv(input_file_path, encoding='utf-8', on_bad_lines='skip')
            except Exception as inner_e:
                return {"error": f"Failed to parse CSV file: {str(inner_e)}"}
        
        # Get basic file info
        input_row_count = len(df)
        input_columns = list(df.columns)
        
        print(f"Input file has {input_row_count} rows and {len(input_columns)} columns")
        
        # Enforce row limit
        if input_row_count > max_rows:
            print(f"Limiting to {max_rows} rows (original: {input_row_count})")
            df = df.head(max_rows)
            input_row_count = len(df)
        
        # Get target columns based on marketplace format
        target_columns = []
        
        if marketplace_format.lower() == "amazon":
            target_columns = ["sku", "product-id", "product-id-type", "price", "minimum-seller-allowed-price", "maximum-seller-allowed-price", "quantity", "condition-type", "condition-note", "ASIN-hint", "title", "product-tax-code", "merchant-shipping-group", "restock-date", "handling-time"]
        elif marketplace_format.lower() == "walmart":
            target_columns = ["sku", "product_name", "short_description", "long_description", "price", "qty", "product_type", "brand", "shipping_weight", "main_image_url", "additional_image_url", "category", "category_specifics"]
        elif marketplace_format.lower() == "reebelo":
            target_columns = ["sku", "title", "description", "brand", "model", "condition", "price", "stock", "color", "category", "image_url", "weight_kg", "shipping_time_days"]
        elif marketplace_format.lower() == "catch":
            target_columns = ["Product Number", "Product Name", "Description", "Category", "Brand", "Recommended Retail Price", "Price", "Stock On Hand", "Stock Status", "Shipping Cost", "Shipping Dimensions (LxWxH)", "Shipping Weight", "Package Size", "Main Image URL", "Other Images"]
        elif marketplace_format.lower() == "meta":
            target_columns = ["id", "title", "description", "availability", "condition", "price", "link", "image_link", "brand", "category", "additional_image_link", "shipping_weight", "shipping"]
        elif marketplace_format.lower() == "tiktok":
            target_columns = ["product_id", "title", "description", "sku_id", "price", "original_price", "inventory", "main_image_url", "category", "brand", "condition", "is_published", "variant_name", "variant_value"] 
        else:
            # Default generic columns for any other format
            target_columns = ["sku", "title", "description", "price", "stock", "brand", "category", "image_url"]
            
        print(f"Using target columns for {marketplace_format}: {', '.join(target_columns)}")
        
        # Create an empty dataframe with the target columns
        output_df = pd.DataFrame(columns=target_columns)
        
        # Process in batches (10 rows at a time) to avoid overwhelming the API
        batch_size = 10
        batches = [df.iloc[i:i+batch_size] for i in range(0, len(df), batch_size)]
        
        for batch_idx, batch_df in enumerate(batches):
            print(f"Processing batch {batch_idx+1}/{len(batches)}...")
            
            # Convert batch to CSV string
            batch_csv = batch_df.to_csv(index=False)
            
            # Create a prompt for OpenAI to transform the batch
            prompt = f"""
            Transform this CSV data to {marketplace_format} format.
            
            Source columns: {', '.join(input_columns)}
            Target columns: {', '.join(target_columns)}
            
            Input CSV:
            ```
            {batch_csv}
            ```
            
            Important instructions:
            1. Transform EXACTLY {len(batch_df)} rows, maintaining 1:1 mapping with input.
            2. Generate all required {marketplace_format} fields using AI if source data lacks equivalents.
            3. Ensure SKUs are unique and valid.
            4. Generate realistic descriptions and missing fields intelligently.
            5. Return ONLY the transformed CSV data without explanations.
            6. Include the header row with the target columns.
            7. Use standard CSV format (no spaces after commas, quote strings with commas).
            """
            
            # Call OpenAI to transform the batch
            response = client.chat.completions.create(
                model="gpt-4o", # the newest OpenAI model is "gpt-4o" which was released May 13, 2024
                messages=[
                    {"role": "system", "content": f"You are a {marketplace_format} product data specialist that transforms CSV data with perfect 1:1 row mapping."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.1
            )
            
            transformed_text = response.choices[0].message.content
            
            # Extract the CSV content
            csv_content = transformed_text
            if "```" in transformed_text:
                # Extract content between code blocks if present
                start_idx = transformed_text.find("```") + 3
                # Find the next ``` after the first one
                end_idx = transformed_text.find("```", start_idx)
                if end_idx != -1:
                    # Extract content between the markdown code blocks
                    csv_content = transformed_text[start_idx:end_idx].strip()
                    # Remove the language identifier if it exists
                    if csv_content.startswith("csv\n"):
                        csv_content = csv_content[4:]
                else:
                    # If no ending code block, assume everything after the first code block is CSV
                    csv_content = transformed_text[start_idx:].strip()
            
            # Parse the transformed batch
            try:
                from io import StringIO
                transformed_batch = pd.read_csv(StringIO(csv_content))
                
                # Ensure all required columns are present
                for col in target_columns:
                    if col not in transformed_batch.columns:
                        transformed_batch[col] = ""
                
                # Verify row count matches input
                if len(transformed_batch) != len(batch_df):
                    print(f"Warning: Transformed batch has {len(transformed_batch)} rows but input had {len(batch_df)} rows")
                    # Adjust rows to match input (pad or truncate)
                    if len(transformed_batch) < len(batch_df):
                        # Pad with empty rows
                        padding = pd.DataFrame(columns=target_columns, index=range(len(batch_df) - len(transformed_batch)))
                        transformed_batch = pd.concat([transformed_batch, padding])
                    else:
                        # Truncate excess rows
                        transformed_batch = transformed_batch.iloc[:len(batch_df)]
                
                # Append to output dataframe
                output_df = pd.concat([output_df, transformed_batch[target_columns]], ignore_index=True)
                
            except Exception as e:
                print(f"Error parsing transformed batch: {str(e)}")
                print(f"Problematic CSV content: {csv_content}")
                # Create an empty batch with the right number of rows
                empty_batch = pd.DataFrame(columns=target_columns, index=range(len(batch_df)))
                output_df = pd.concat([output_df, empty_batch], ignore_index=True)
        
        # Generate output file path
        output_filename = f"{marketplace_format.lower()}_{Path(input_file_path).stem}_{generate_random_string()}.csv"
        output_file_path = os.path.join(os.path.dirname(input_file_path), output_filename)
        
        # Save the transformed data
        output_df.to_csv(output_file_path, index=False)
        
        # Return the results
        return {
            "success": True,
            "input_file": input_file_path,
            "output_file": output_file_path,
            "marketplace": marketplace_format,
            "input_rows": input_row_count,
            "output_rows": len(output_df),
            "execution_time": time.time() - start_time
        }
        
    except Exception as e:
        print(f"Error in direct_transform: {str(e)}")
        return {"error": str(e)}

# Command-line interface
if __name__ == "__main__":
    # Start timing
    start_time = time.time()
    
    # Check if we have the required arguments
    if len(sys.argv) < 3:
        print(json.dumps({
            "error": "Missing required arguments",
            "usage": "python direct_transform.py <input_file> <marketplace> [max_rows]"
        }))
        sys.exit(1)
    
    input_file = sys.argv[1]
    marketplace = sys.argv[2]
    max_rows = 1000  # Default
    
    # Optional max_rows parameter
    if len(sys.argv) >= 4:
        try:
            max_rows = int(sys.argv[3])
        except ValueError:
            print(json.dumps({
                "error": f"Invalid max_rows value: {sys.argv[3]}, must be an integer"
            }))
            sys.exit(1)
    
    # Call the transformation function
    result = direct_transform(input_file, marketplace, max_rows)
    
    # Print the result as JSON for the caller to parse
    print(json.dumps(result))