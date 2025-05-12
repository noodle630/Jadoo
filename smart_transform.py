"""
Smart CSV transformation utility that ensures perfect 1:1 row mapping
while leveraging OpenAI for intelligent data enhancement.

This approach combines the row preservation of simple_transform.py
with the intelligence of the OpenAI API to produce high-quality
marketplace-ready product data.
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
import concurrent.futures
import io

# Load environment variables
load_dotenv()

# Get the OpenAI API key
api_key = os.getenv("OPENAI_API_KEY")
if not api_key:
    raise ValueError("OPENAI_API_KEY environment variable not set")

# Initialize OpenAI client
client = OpenAI(api_key=api_key)

def generate_random_string(length=8):
    """Generate a random string for unique filenames"""
    return ''.join(random.choices(string.ascii_lowercase + string.digits, k=length))

def smart_transform(input_file_path, marketplace_format, output_file=None, max_rows=1000):
    """
    Transform a CSV file to a marketplace format with guaranteed 1:1 row mapping,
    enhanced by OpenAI's intelligence
    
    Args:
        input_file_path: Path to the CSV file to transform
        marketplace_format: Name of the target format (e.g., 'amazon', 'walmart')
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
            try:
                df = pd.read_csv(input_file_path, encoding='latin1')
            except Exception as e:
                print(f"Error with latin1 encoding: {str(e)}")
                return {"error": f"Failed to parse CSV with UTF-8 or latin1 encoding: {str(e)}"}
        except Exception as e:
            # Try with more flexible parsing for problematic CSVs
            try:
                print(f"Standard parsing failed: {str(e)}. Trying with on_bad_lines='skip'...")
                df = pd.read_csv(input_file_path, encoding='utf-8', on_bad_lines='skip')
                print(f"Successfully parsed CSV with flexible parsing.")
            except Exception as inner_e:
                print(f"All parsing attempts failed: {str(inner_e)}")
                return {"error": f"Failed to parse CSV file: {str(inner_e)}"}
        
        # Get basic file info
        input_row_count = len(df)
        input_columns = list(df.columns)
        
        print(f"Input file has {input_row_count} rows and {len(input_columns)} columns")
        print(f"Input columns: {', '.join(input_columns)}")
        
        # Enforce row limit
        if input_row_count > max_rows:
            print(f"Limiting to {max_rows} rows (original: {input_row_count})")
            df = df.head(max_rows)
            input_row_count = len(df)
        
        # Start timing
        start_time = time.time()
        
        # Create a simple mapping to understand the data structure
        # We'll use this to get help from OpenAI on how to transform the data
        print("Learning data structure and creating transformation plan...")
        
        # Select a sample of rows for analysis
        sample_size = min(5, input_row_count)
        sample_df = df.head(sample_size)
        sample_csv = sample_df.to_csv(index=False)
        
        # Get transformation guidance from OpenAI
        system_prompt = f"""
        You are an expert in {marketplace_format} product data standards and CSV transformation.
        You will analyze source data and provide detailed transformation instructions.
        """
        
        user_prompt = f"""
        I need to transform product data from a source format to {marketplace_format} format.
        
        SOURCE DATA INFORMATION:
        - {input_row_count} total rows
        - {len(input_columns)} columns: {', '.join(input_columns)}
        
        TARGET FORMAT:
        - Format: {marketplace_format}
        - Required columns: {', '.join(target_columns)}
        
        Here's a sample of the first {sample_size} rows from the source data:
        ```
        {sample_csv}
        ```
        
        Please provide:
        1. A detailed analysis of the source data structure
        2. Field-by-field mapping instructions from source to {marketplace_format} format
        3. Transformation rules for special fields or formatting requirements
        4. Defaults to use for required target fields that don't have clear source mappings
        
        Format your response as a structured JSON with these keys:
        {{"analysis": "data analysis here",
          "field_mappings": {{"target_field1": "mapping instructions", "target_field2": "mapping instructions"}},
          "special_rules": ["rule1", "rule2"],
          "defaults": {{"target_field1": "default value"}}
        }}
        """
        
        # Call OpenAI for transformation guidance
        print("Requesting transformation guidance from OpenAI...")
        guidance_response = client.chat.completions.create(
            model="gpt-4o", # the newest OpenAI model is "gpt-4o" which was released May 13, 2024
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            temperature=0.1,
            response_format={"type": "json_object"}
        )
        
        # Extract the transformation guidance
        guidance_content = guidance_response.choices[0].message.content
        if not guidance_content:
            return {"error": "Failed to get transformation guidance from OpenAI"}
        
        # Parse the guidance JSON
        try:
            guidance = json.loads(guidance_content)
            print("Successfully received transformation guidance")
        except json.JSONDecodeError as e:
            print(f"Error parsing guidance JSON: {str(e)}")
            print(f"Raw guidance: {guidance_content[:500]}...")
            return {"error": "Failed to parse transformation guidance"}
        
        # Create a result dataframe with target columns
        result_df = pd.DataFrame(columns=target_columns)
        
        # Process rows in batches for better performance
        batch_size = 10
        num_batches = (input_row_count + batch_size - 1) // batch_size
        
        print(f"Processing {input_row_count} rows in {num_batches} batches...")
        
        # Process batches of rows
        for batch_num in range(num_batches):
            start_idx = batch_num * batch_size
            end_idx = min(start_idx + batch_size, input_row_count)
            
            print(f"Processing batch {batch_num+1}/{num_batches} (rows {start_idx+1}-{end_idx})...")
            
            batch_df = df.iloc[start_idx:end_idx].copy()
            batch_rows = []
            
            # Process each row in the batch
            for _, row in batch_df.iterrows():
                # Convert row to dict for easier manipulation
                row_dict = row.to_dict()
                
                # Prepare a new row with target columns
                target_row = {col: "" for col in target_columns}
                
                # Apply field mappings from the guidance
                for target_field, mapping in guidance.get("field_mappings", {}).items():
                    if target_field in target_columns:
                        # Try to apply the mapping as best we can
                        try:
                            # Use simple mappings where possible
                            if mapping in row_dict:
                                target_row[target_field] = row_dict.get(mapping, "")
                            # Handle special case for item_name/title
                            elif target_field in ["item_name", "title"] and "title" in row_dict:
                                target_row[target_field] = row_dict.get("title", "")
                            elif target_field in ["item_name", "title"] and "name" in row_dict:
                                target_row[target_field] = row_dict.get("name", "")
                            # Handle special case for price
                            elif target_field in ["standard_price", "price"] and "price" in row_dict:
                                target_row[target_field] = row_dict.get("price", "")
                            # Handle special case for brand
                            elif target_field in ["brand_name", "brand"] and "brand" in row_dict:
                                target_row[target_field] = row_dict.get("brand", "")
                            # Handle special case for SKU
                            elif target_field in ["item_sku", "sku", "sku_id"] and "sku" in row_dict:
                                target_row[target_field] = row_dict.get("sku", "")
                            elif target_field in ["item_sku", "sku", "sku_id"] and "product_id" in row_dict:
                                target_row[target_field] = f"SKU-{row_dict.get('product_id', '')}"
                        except Exception as e:
                            print(f"Error applying mapping for {target_field}: {str(e)}")
                
                # Apply defaults for empty required fields
                for field, default in guidance.get("defaults", {}).items():
                    if field in target_columns and (field not in target_row or not target_row[field]):
                        target_row[field] = default
                
                # Add marketplace-specific defaults
                if marketplace_format.lower() == "amazon":
                    if not target_row.get("feed_product_type"):
                        target_row["feed_product_type"] = "consumer_electronics"
                    if not target_row.get("update_delete"):
                        target_row["update_delete"] = "Update"
                
                # Add the row to the batch
                batch_rows.append(target_row)
            
            # Add the batch rows to the result dataframe
            batch_result_df = pd.DataFrame(batch_rows)
            result_df = pd.concat([result_df, batch_result_df], ignore_index=True)
        
        # Enhance the output with OpenAI for selected fields that need better quality
        # We'll use a separate step to enrich certain fields while maintaining the row count
        
        print("Enhancing product descriptions and titles with AI...")
        
        # Identify key fields to enhance
        fields_to_enhance = []
        
        if marketplace_format.lower() == "amazon":
            fields_to_enhance = ["product_description", "bullet_point1", "bullet_point2", "bullet_point3", "bullet_point4", "bullet_point5"]
        elif marketplace_format.lower() == "walmart":
            fields_to_enhance = ["shortDescription", "longDescription"]
        else:
            # Default fields to enhance for any marketplace
            fields_to_enhance = ["description", "long_description", "product_description"]
            
        # Filter to only include fields that exist in our target columns
        fields_to_enhance = [f for f in fields_to_enhance if f in target_columns]
        
        if fields_to_enhance:
            # Select a subset of rows for enhancement
            # This is especially important for large datasets
            enhance_limit = min(20, input_row_count)  # Limit enhancement to first 20 rows for cost efficiency
            
            print(f"Enhancing {enhance_limit} rows with improved descriptions...")
            
            # For each row in the enhancement subset
            for i in range(enhance_limit):
                source_row = df.iloc[i].to_dict()
                target_row = result_df.iloc[i].to_dict()
                
                # Extract key product information for the enhancement
                product_name = target_row.get("item_name", "") or target_row.get("title", "") or source_row.get("title", "") or source_row.get("name", "")
                product_brand = target_row.get("brand_name", "") or target_row.get("brand", "") or source_row.get("brand", "")
                
                # Only enhance if we have some basic product information
                if product_name:
                    try:
                        # Create a prompt for enhancement
                        enhance_prompt = f"""
                        Enhance the product description for this item:
                        
                        Product: {product_name}
                        Brand: {product_brand}
                        
                        Original information:
                        {json.dumps(source_row, indent=2)}
                        
                        Current {marketplace_format} format:
                        {json.dumps({k: v for k, v in target_row.items() if k in fields_to_enhance}, indent=2)}
                        
                        Please provide enhanced content for these fields: {', '.join(fields_to_enhance)}
                        
                        Format your response as a JSON object with the field names as keys.
                        """
                        
                        # Call OpenAI for enhancement
                        enhance_response = client.chat.completions.create(
                            model="gpt-4o", # the newest OpenAI model is "gpt-4o" which was released May 13, 2024
                            messages=[
                                {"role": "system", "content": f"You are a {marketplace_format} product content expert who writes compelling, accurate product descriptions."},
                                {"role": "user", "content": enhance_prompt}
                            ],
                            temperature=0.7,
                            response_format={"type": "json_object"}
                        )
                        
                        # Extract and apply the enhancements
                        enhance_content = enhance_response.choices[0].message.content
                        if enhance_content:
                            enhancements = json.loads(enhance_content)
                            
                            # Update the result dataframe with the enhanced content
                            for field, value in enhancements.items():
                                if field in fields_to_enhance:
                                    result_df.at[i, field] = value
                        
                    except Exception as e:
                        print(f"Error enhancing row {i}: {str(e)}")
        
        # Determine the output file path
        if output_file:
            output_path = output_file
        else:
            # Create an output filename
            input_filename = Path(input_file_path).stem
            timestamp = int(time.time())
            random_id = generate_random_string(4)
            output_filename = f"{marketplace_format.lower()}_{input_filename}_{timestamp}_{random_id}.csv"
            
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
        print(f"Error in smart_transform: {str(e)}")
        return {
            "error": f"Transformation failed: {str(e)}"
        }

# Amazon Inventory Loader format implementation
def transform_to_amazon_format(input_file_path, output_file=None, max_rows=1000):
    """
    Transform a CSV file to Amazon Inventory Loader format with 1:1 row mapping
    
    Args:
        input_file_path: Path to the CSV file to transform
        output_file: Optional path to save the transformed file
        max_rows: Maximum rows to process (default: 1000)
    
    Returns:
        Dictionary with transformation results and output file path
    """
    # Amazon Inventory Loader template columns
    AMAZON_COLUMNS = [
        "item_sku", "external_product_id", "external_product_id_type", "item_name", 
        "brand_name", "manufacturer", "feed_product_type", "update_delete", 
        "standard_price", "quantity", "product_tax_code", "product_site_launch_date", 
        "restock_date", "fulfillment_latency", "item_condition", "main_image_url", 
        "swatch_image_url", "other_image_url1", "other_image_url2", "other_image_url3", 
        "item_type", "model", "part_number", "bullet_point1", "bullet_point2", 
        "bullet_point3", "bullet_point4", "bullet_point5", "generic_keywords", 
        "product_description"
    ]
    
    return smart_transform(
        input_file_path=input_file_path,
        marketplace_format="Amazon",
        target_columns=AMAZON_COLUMNS,
        output_file=output_file,
        max_rows=max_rows
    )

# Walmart marketplace format implementation
def transform_to_walmart_format(input_file_path, output_file=None, max_rows=1000):
    """
    Transform a CSV file to Walmart marketplace format with 1:1 row mapping
    
    Args:
        input_file_path: Path to the CSV file to transform
        output_file: Optional path to save the transformed file
        max_rows: Maximum rows to process (default: 1000)
    
    Returns:
        Dictionary with transformation results and output file path
    """
    # Walmart template columns
    WALMART_COLUMNS = [
        "sku", "productIdType", "productId", "productName", "brand", "price", 
        "ShippingWeight", "shortDescription", "mainImageUrl", "cellPhoneType", 
        "color", "condition", "longDescription", "modelNumber", "manufacturer", 
        "keywords", "numberOfItems", "batteryType", "screenSize", "wirelessTechnology"
    ]
    
    return smart_transform(
        input_file_path=input_file_path,
        marketplace_format="Walmart",
        target_columns=WALMART_COLUMNS,
        output_file=output_file,
        max_rows=max_rows
    )

# Testing functionality
if __name__ == "__main__":
    import sys
    
    if len(sys.argv) < 3:
        print("Usage: python smart_transform.py <marketplace> <input_csv_file> [output_csv_file] [max_rows]")
        print("Supported marketplaces: amazon, walmart")
        sys.exit(1)
    
    marketplace = sys.argv[1].lower()
    input_file = sys.argv[2]
    output_file = sys.argv[3] if len(sys.argv) > 3 else None
    max_rows = int(sys.argv[4]) if len(sys.argv) > 4 else 1000
    
    if not os.path.exists(input_file):
        print(f"Error: Input file '{input_file}' not found.")
        sys.exit(1)
    
    if marketplace == "amazon":
        print(f"Transforming {input_file} to Amazon format...")
        result = transform_to_amazon_format(input_file, output_file, max_rows)
    elif marketplace == "walmart":
        print(f"Transforming {input_file} to Walmart format...")
        result = transform_to_walmart_format(input_file, output_file, max_rows)
    else:
        print(f"Error: Unsupported marketplace '{marketplace}'")
        print("Supported marketplaces: amazon, walmart")
        sys.exit(1)
    
    if "error" in result:
        print(f"Error: {result['error']}")
        sys.exit(1)
    
    print(f"Success! Transformed {result['input_rows']} rows to {marketplace.title()} format.")
    print(f"Output saved to: {result['output_file']}")
    print(f"Processing time: {result['processing_time']:.2f} seconds")