import os
import io
import sys
import pandas as pd
from openai import OpenAI
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Get the OpenAI API key from environment variables
api_key = os.getenv("OPENAI_API_KEY")
if not api_key:
    raise ValueError("OPENAI_API_KEY environment variable not set")

# Initialize OpenAI client
client = OpenAI(api_key=api_key)

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

def process_chunk(df_chunk, amazon_columns, full_df_columns, full_row_count, max_tokens=2500):
    """Process a chunk of the dataframe with enhanced validation and cost-optimization guardrails
    
    Args:
        df_chunk: The dataframe chunk to process
        amazon_columns: Amazon template columns
        full_df_columns: Columns in the full dataframe
        full_row_count: Total row count in full dataframe
        max_tokens: Maximum tokens to use for processing (default: 2500 for cost efficiency)
    """
    chunk_row_count = len(df_chunk)
    
    # Only use a sample for the prompt to reduce token usage and cost
    # First 5 rows for small chunks, or 5% for larger chunks
    sample_size = min(5, max(3, int(chunk_row_count * 0.05)))
    data_sample = df_chunk.head(sample_size).to_csv(index=False)
    
    # Calculate optimal token limits based on chunk size
    base_tokens = 1200  # Base tokens for system and instructions
    per_row_tokens = 150  # Estimated tokens per output row
    max_tokens = min(base_tokens + (chunk_row_count * per_row_tokens), 4000)
    
    data_info = f"""
    CSV chunk has {chunk_row_count} rows out of {full_row_count} total.
    Source columns: {', '.join(full_df_columns)}
    Target Amazon columns: {', '.join(amazon_columns)}
    """
    
    print(f"Processing chunk with {chunk_row_count} rows (max tokens: {max_tokens})...")
    
    # Enhanced prompt with stricter data quality requirements
    prompt = f"""
    As an expert in product feed transformation, convert the following source data to Amazon Inventory Loader format.
    
    DATA INFORMATION:
    {data_info}
    
    SOURCE DATA SAMPLE (showing {sample_size} of {chunk_row_count} rows):
    {data_sample}
    
    TRANSFORMATION REQUIREMENTS:
    1. Transform all {chunk_row_count} rows into valid Amazon Inventory Loader format
    2. Map source fields to Amazon fields with absolute precision
    3. For mobile phones/electronics, follow these strict parsing rules:
       - Product titles often contain: Model, Carrier, Color, Storage, and Condition
       - Example: "Galaxy S22+ (5G) - T-Mobile - Green - Single Sim - 256GB Excellent 80"
       - Carefully extract each component for proper mapping
    
    FIELD MAPPING RULES (EXTREMELY IMPORTANT):
    - item_sku: Use EXACT original SKU, never modify
    - external_product_id: Leave EMPTY unless a legitimate ID exists in source data
    - external_product_id_type: Only use if external_product_id exists
    - item_name: Create properly formatted name including full model, color, capacity specs
    - brand_name: Extract from product data (e.g., "Samsung" for Galaxy devices)
    - manufacturer: Same as brand_name
    - feed_product_type: Use "consumer_electronics" or appropriate category
    - update_delete: Always "Update"
    - standard_price: Keep exact original price
    - quantity: Use source quantity exactly
    - item_condition: Map conditions accurately:
       - "Premium", "Premium 90/100" → "Used - Very Good"
       - "Excellent", "Excellent 80/100" → "Used - Good"
       - "Good", "Acceptable" → "Used - Acceptable"
    - bullet_points: Create concise feature bullets
    - product_description: Create detailed, accurate description
    
    DATA QUALITY PRIORITIES:
    1. ACCURACY: Never invent data not in the source
    2. COMPLETENESS: All required fields must have valid values
    3. CONSISTENCY: Maintain consistent naming & formatting
    
    REQUIRED OUTPUT:
    ONLY the transformed CSV data for these {chunk_row_count} products. 
    NO HEADER ROW, NO EXPLANATIONS, NO MARKDOWN FORMATTING.
    """
    
    # Initialize content variable at the function level
    content = ""
    
    try:
        # Track start time for cost analysis
        import time
        start_time = time.time()
        
        response = client.chat.completions.create(
            model="gpt-3.5-turbo", # Using GPT-3.5-turbo for cost optimization as explicitly requested by user
            messages=[
                {
                    "role": "system", 
                    "content": "You are an expert Amazon product data specialist. Your job is to convert source product data into precise Amazon Inventory Loader format. Output ONLY CSV data rows with no headers or explanations."
                },
                {"role": "user", "content": prompt}
            ],
            temperature=0.1,
            max_tokens=max_tokens,
        )
        
        # Track API usage for cost optimization with robust error handling
        try:
            # First safely extract the content
            content = ""
            if hasattr(response, 'choices') and len(response.choices) > 0:
                if hasattr(response.choices[0], 'message') and hasattr(response.choices[0].message, 'content'):
                    content = response.choices[0].message.content
                    if content is None:
                        content = ""
            
            # Calculate and record usage statistics
            usage = getattr(response, 'usage', None)
            if usage:
                completion_tokens = getattr(usage, 'completion_tokens', 0)
                prompt_tokens = getattr(usage, 'prompt_tokens', 0)
            else:
                # Fallback estimates if usage stats aren't available
                completion_tokens = len(content) // 4 if content else 0  # Rough estimate: ~4 chars per token
                prompt_tokens = len(prompt) // 4 if prompt else 0
            
            total_tokens = prompt_tokens + completion_tokens
            
            # Calculate estimated cost (using gpt-4o pricing)
            prompt_cost = (prompt_tokens / 1000) * 0.01  # $0.01 per 1K tokens for input
            completion_cost = (completion_tokens / 1000) * 0.03  # $0.03 per 1K tokens for output
            total_cost = prompt_cost + completion_cost
            
            # Calculate per-row metrics if possible
            process_time = time.time() - start_time
            if chunk_row_count > 0 and isinstance(total_cost, (int, float)):
                cost_per_row = total_cost / chunk_row_count 
                tokens_per_row = total_tokens / chunk_row_count if isinstance(total_tokens, (int, float)) else 0
                
                # Log usage metrics with clear formatting
                print(f"✓ API call completed in {process_time:.2f}s")
                print(f"  └─ {prompt_tokens:,} input tokens, {completion_tokens:,} output tokens ({total_tokens:,} total)")
                print(f"  └─ Est. cost: ${total_cost:.4f} total (${cost_per_row:.6f}/row, {tokens_per_row:.1f} tokens/row)")
            else:
                # Simple logging if per-row metrics can't be calculated
                print(f"✓ API call completed in {process_time:.2f}s")
                print(f"  └─ {prompt_tokens:,} input tokens, {completion_tokens:,} output tokens ({total_tokens:,} total)")
                print(f"  └─ Est. cost: ${total_cost:.4f} total")
            
        except Exception as e:
            # Fallback if we can't get token usage
            print(f"Could not calculate token usage: {str(e)}")
            process_time = time.time() - start_time
            print(f"API call completed in {process_time:.2f}s (usage tracking failed)")
            
        # Check for empty response
        if not content:
            print("Warning: Empty response from OpenAI")
            return ""
            
        # Clean up the response safely
        try:
            cleaned_content = content.strip()
            if cleaned_content.startswith("```csv"):
                cleaned_content = cleaned_content[6:]
            elif cleaned_content.startswith("```"):
                cleaned_content = cleaned_content[3:]
            if cleaned_content.endswith("```"):
                cleaned_content = cleaned_content[:-3]
            
            processed_content = cleaned_content.strip()
        except Exception as e:
            print(f"Error cleaning content: {str(e)}")
            return ""
        
        # Enhanced validation with detailed feedback
        try:
            lines = [line for line in processed_content.split('\n') if line.strip()]
        except Exception as e:
            print(f"Error parsing lines: {str(e)}")
            return ""
        
        # Row count validation
        coverage = len(lines) / len(df_chunk) if len(df_chunk) > 0 else 0
        if coverage < 0.95:  # More strict - we need at least 95% of input rows
            print(f"WARNING: Data coverage issue - {len(lines)}/{len(df_chunk)} rows ({coverage:.1%})")
        
        # Basic data quality validation on a sample
        validation_sample = lines[:min(8, len(lines))]
        issues = []
        
        for i, line in enumerate(validation_sample):
            fields = line.split(',')
            
            # Check for key fields (sku, item name, price)
            if not fields[0].strip():  # item_sku should be first field and never empty
                issues.append(f"Row {i+1}: Missing SKU")
                
            if len(fields) >= 4 and not fields[3].strip():  # item_name should be 4th field
                issues.append(f"Row {i+1}: Missing item name")
                
            if len(fields) >= 9 and not fields[8].strip():  # standard_price should be 9th field
                issues.append(f"Row {i+1}: Missing price")
                
            # Check for field count consistency
            if len(fields) < len(amazon_columns) * 0.5:  # At least half the expected fields
                issues.append(f"Row {i+1}: Insufficient field count ({len(fields)})")
        
        if issues:
            for issue in issues[:5]:  # Show up to 5 issues
                print(f"QUALITY ISSUE: {issue}")
            if len(issues) > 5:
                print(f"...and {len(issues) - 5} more issues.")
                
        # Success metric
        quality_score = 1.0 - (len(issues) / len(validation_sample) if validation_sample else 0)
        print(f"Quality score: {quality_score:.1%}")
            
        return processed_content
        
    except Exception as e:
        print(f"Error processing chunk: {str(e)}")
        return ""

def transform_to_amazon_format(csv_file_path, output_file=None, max_rows=1000):
    """
    Transform a CSV file to Amazon Inventory Loader format
    
    Args:
        csv_file_path: Path to the CSV file to transform
        output_file: Path to save the transformed file (default: amazon_<input_filename>)
        max_rows: Maximum rows to process for cost efficiency (default: 1000)
    
    Returns:
        The path to the transformed file
    """
    try:
        # Read the CSV file
        with open(csv_file_path, 'r') as file:
            csv_content = file.read()
        
        # Parse the CSV to determine structure and issues
        try:
            df = pd.read_csv(io.StringIO(csv_content))
            row_count = len(df)
            column_count = len(df.columns)
            columns = list(df.columns)
            
            print(f"Successfully parsed CSV: \n            CSV file has {row_count} rows and {column_count} columns.\n            Source columns: {', '.join(columns)}\n            Target Amazon columns: {', '.join(AMAZON_COLUMNS)}")
            
            # Note on row processing
            if row_count > max_rows:
                print(f"⚠️ Processing all {row_count} rows (exceeds recommended {max_rows} for optimization)")
                print(f"   This may increase processing time and API costs.")
            # No longer limiting rows - processing all data
            
        except Exception as e:
            print(f"Error parsing CSV: {str(e)}")
            return None
        
        print("Processing data using chunked approach for better handling of large datasets...")
        
        # Enhanced chunking strategy optimized for cost & quality
        total_rows = len(df)
        
        # Calculate optimal chunk size based on data complexity
        # For electronics with complex fields, use smaller chunks for higher quality
        
        # Analyze data complexity to adjust chunk size
        # 1. Check for pattern consistency in product names
        sample_rows = min(20, total_rows)
        sample = df.head(sample_rows)
        
        # Check if this is a mobile phone dataset by examining names
        has_phones = False
        has_electronics = False  # Initialize this variable to avoid the "possibly unbound" error
        
        if 'item_name' in df.columns:
            name_col = 'item_name'
        else:
            # Try to find a column that might contain product names
            potential_name_cols = [col for col in df.columns if any(term in col.lower() for term in 
                                    ['name', 'title', 'product', 'item', 'model'])]
            name_col = potential_name_cols[0] if potential_name_cols else df.columns[0]
        
        # Check if this is likely a phone/electronics dataset
        if name_col in df.columns:
            phone_keywords = ['galaxy', 'iphone', 'pixel', 'oneplus', 'xiaomi', 'samsung', 'lg', 'motorola']
            electronics_keywords = ['gb', 'sim', '5g', '4g', 'unlocked', 'carrier', 'at&t', 'verizon', 't-mobile']
            
            sample_values = df[name_col].dropna().astype(str).str.lower().tolist()[:sample_rows]
            has_phones = any(any(kw in val for kw in phone_keywords) for val in sample_values)
            has_electronics = any(any(kw in val for kw in electronics_keywords) for val in sample_values)
            
            if has_phones or has_electronics:
                print("Detected mobile phone/electronics dataset - using optimized settings for complex product data")
        
        # Adjust chunk size based on data characteristics and total volume
        # For complex data, use smaller chunks for higher quality
        if has_phones or has_electronics:
            if total_rows < 100:
                CHUNK_SIZE = min(50, total_rows)  # Very small file, still process in small chunks for quality
            elif total_rows < 300:
                CHUNK_SIZE = 50  # Medium file, smaller chunks for quality
            else:
                CHUNK_SIZE = 40  # Large file, smaller chunks for reliability and quality
        else:
            # Generic data - can use larger chunks
            if total_rows < 100:
                CHUNK_SIZE = total_rows  # Small file, process all at once
            elif total_rows < 300:
                CHUNK_SIZE = 75  # Medium file, larger chunks
            else:
                CHUNK_SIZE = 60  # Large file, moderate chunks for balance
        
        # Total API cost estimate - adjust chunk size if too expensive
        estimated_total_tokens = 1500 + (total_rows * 250)  # Base + per row tokens
        estimated_cost = estimated_total_tokens * 0.00003  # Very rough estimate at $0.03/1K tokens
        
        print(f"Estimated max API cost: ${estimated_cost:.2f} for {total_rows} rows")
        if estimated_cost > 5.0 and not os.getenv("ALLOW_HIGH_COST"):
            print(f"WARNING: High estimated cost (${estimated_cost:.2f}). Adjusting chunk size for cost efficiency.")
            # Reduce chunk size for very large datasets to help with cost
            CHUNK_SIZE = max(30, int(CHUNK_SIZE * 0.75))
        
        chunks = [df.iloc[i:i+CHUNK_SIZE] for i in range(0, len(df), CHUNK_SIZE)]
        print(f"Splitting data into {len(chunks)} chunks of approximately {CHUNK_SIZE} rows each for {total_rows} total rows")
        
        # Process the first chunk to get the header structure
        print("Processing first chunk to establish template...")
        first_chunk = df.head(min(CHUNK_SIZE, row_count))
        
        # Process first chunk with headers
        try:
            print(f"Sending OpenAI request for template chunk...")
            
            # For the first chunk, we'll ask for headers
            first_chunk_prompt = f"""
            As an expert in product feed transformation, convert the following sample of source data to Amazon Inventory Loader format.
            
            DATA INFORMATION:
            CSV file has {row_count} rows and {column_count} columns.
            Source columns: {', '.join(columns)}
            Target Amazon columns: {', '.join(AMAZON_COLUMNS)}
            
            SAMPLE DATA (first {len(first_chunk)} rows):
            {first_chunk.to_csv(index=False)}
            
            TRANSFORMATION REQUIREMENTS:
            1. Convert these rows into valid Amazon Inventory Loader format with ALL required columns
            2. Include a proper header row with ALL Amazon column names
            3. Map source fields to Amazon fields with precision
            4. For missing required fields, infer or generate appropriate values
            5. Format numbers correctly: prices without currency symbols, integers for quantities
            
            REQUIRED OUTPUT:
            A complete CSV with headers and data, ONLY the transformed CSV with no explanations or formatting.
            """
            
            response = client.chat.completions.create(
                model="gpt-3.5-turbo", # Using GPT-3.5-turbo for cost optimization as explicitly requested by user
                messages=[
                    {
                        "role": "system", 
                        "content": "You are an expert product feed transformation system. Your output must be ONLY valid CSV data."
                    },
                    {"role": "user", "content": first_chunk_prompt}
                ],
                temperature=0.1,
                max_tokens=4000,
            )
            
            # Extract and clean the template response
            template_content = response.choices[0].message.content
            
            # Clean up the response with safeguards for None values
            if template_content is not None:
                template_content = template_content.strip()
                if template_content.startswith("```csv"):
                    template_content = template_content[6:]
                elif template_content.startswith("```"):
                    template_content = template_content[3:]
                if template_content.endswith("```"):
                    template_content = template_content[:-3]
                    
                template_content = template_content.strip()
            else:
                template_content = ""  # Provide empty string as fallback
            
            # Split into header and data
            template_lines = template_content.split('\n')
            header_row = template_lines[0]
            
            print(f"Template header established with {header_row.count(',')+1} columns")
            
            # Start building the full output
            full_output = [header_row]  # Start with the header row
            
            # Add the data rows from the first chunk
            for i, line in enumerate(template_lines[1:]):
                if line.strip():  # Only add non-empty lines
                    full_output.append(line)
            
            # Now process the rest of the chunks and append rows
            for chunk_idx, chunk in enumerate(chunks[1:], 1):
                print(f"Processing chunk {chunk_idx+1}/{len(chunks)}...")
                
                # Process this chunk with retries if needed
                max_retries = 2
                chunk_result = ""
                for retry in range(max_retries + 1):
                    try:
                        if retry > 0:
                            print(f"Retry {retry}/{max_retries} for chunk {chunk_idx+1}...")
                        
                        chunk_result = process_chunk(chunk, AMAZON_COLUMNS, columns, row_count)
                        
                        # Set a very low threshold for initial acceptance - any data is better than none
                        line_count = len([l for l in chunk_result.split('\n') if l.strip()])
                        
                        # Quick validation check - accept anything with some data
                        if chunk_result and line_count > 0:
                            # We got at least some rows back
                            if line_count < len(chunk) * 0.9:
                                # Less than 90% yield, but accept it and log warning
                                print(f"WARNING: Chunk {chunk_idx+1} produced only {line_count} rows from {len(chunk)} inputs ({line_count/len(chunk):.1%})")
                            break
                        else:
                            if retry < max_retries:
                                print(f"Chunk {chunk_idx+1} produced insufficient data, retrying...")
                            else:
                                print(f"WARNING: Chunk {chunk_idx+1} failed to produce sufficient data after {max_retries} retries")
                    except Exception as chunk_err:
                        if retry < max_retries:
                            print(f"Error processing chunk {chunk_idx+1}, will retry: {str(chunk_err)}")
                        else:
                            print(f"ERROR: Failed to process chunk {chunk_idx+1} after {max_retries} retries: {str(chunk_err)}")
                
                # Add the non-empty lines from this chunk
                added_rows = 0
                for line in chunk_result.split('\n'):
                    if line.strip():  # Only add non-empty lines
                        full_output.append(line)
                        added_rows += 1
                        
                print(f"Added {added_rows} rows from chunk {chunk_idx+1}/{len(chunks)}")
            
            # Combine into a single CSV
            transformed_csv = '\n'.join(full_output)
            
            print(f"All chunks processed! Total rows in output: {len(full_output)-1} (plus header)")
            
        except Exception as api_error:
            print(f"OpenAI API Error: {str(api_error)}")
            raise
        
        # Validate the output
        try:
            # Try parsing as CSV to make sure it's valid
            df_output = pd.read_csv(io.StringIO(transformed_csv))
            output_rows = len(df_output)
            print(f"Successfully validated output: {output_rows} rows produced")
            
            # Check for duplicates in SKUs
            if 'item_sku' in df_output.columns:
                total_rows = len(df_output)
                unique_skus = df_output['item_sku'].nunique()
                duplicate_count = total_rows - unique_skus
                
                if duplicate_count > 0:
                    dup_percent = (duplicate_count / total_rows) * 100
                    print(f"WARNING: Found {duplicate_count} duplicate SKUs ({dup_percent:.1f}% of rows)")
                    print(f"Total rows: {total_rows}, Unique SKUs: {unique_skus}")
                    
                    # Get counts for each SKU to identify the duplicates
                    sku_counts = df_output['item_sku'].value_counts()
                    duplicated_skus = sku_counts[sku_counts > 1]
                    if len(duplicated_skus) > 0:
                        # Get top 5 duplicates in a dictionary
                        top_dups = {}
                        # More compatible way to iterate over duplicates
                        i = 0
                        # Using dictionary-based approach for maximum compatibility
                        sku_dict = dict(sku_counts)
                        # Find top 5 duplicates using standard Python methods
                        skus_with_dups = {k: v for k, v in sku_dict.items() if v > 1}
                        # Get top 5 duplicates (or fewer if less exist)
                        # Sort duplicates by count (highest first) 
                        # Convert to list of tuples first for compatibility
                        dups_list = [(str(k), int(v)) for k, v in skus_with_dups.items()]
                        sorted_dups = sorted(dups_list, key=lambda item: item[1], reverse=True)
                        for j, (sku, count) in enumerate(sorted_dups):
                            if j >= 5:  # Limit to top 5
                                break
                            top_dups[str(sku)] = int(count)
                        print(f"Top duplicated SKUs: {top_dups}")
                    
                    # Now remove duplicates, keeping the first occurrence
                    df_output = df_output.drop_duplicates(subset=['item_sku'], keep='first')
                    print(f"Removed duplicates, now have {len(df_output)} unique product rows")
                    
                    # Update the transformed CSV with deduplicated data
                    transformed_csv = df_output.to_csv(index=False)
            
            # Check for empty or missing brand names
            if 'brand_name' in df_output.columns:
                missing_brands = df_output['brand_name'].isna().sum()
                empty_brands = (df_output['brand_name'] == '').sum()
                total_brand_issues = missing_brands + empty_brands
                
                if total_brand_issues > 0:
                    brand_issue_percent = (total_brand_issues / len(df_output)) * 100
                    print(f"WARNING: {total_brand_issues} products ({brand_issue_percent:.1f}%) have missing or empty brand names")
                    
                    # Try to extract brand from item_name if available
                    if 'item_name' in df_output.columns:
                        mask = (df_output['brand_name'].isna()) | (df_output['brand_name'] == '')
                        fixes = 0
                        for idx in df_output[mask].index:
                            item_name = df_output.loc[idx, 'item_name']
                            if isinstance(item_name, str):
                                # Simple brand extraction - take first word if it looks like a brand
                                potential_brand = item_name.split()[0] if ' ' in item_name else None
                                if potential_brand and len(potential_brand) > 2:
                                    df_output.loc[idx, 'brand_name'] = potential_brand
                                    fixes += 1
                        
                        if fixes > 0:
                            print(f"Auto-extracted brands for {fixes} products from item names")
                            # Update the transformed CSV after brand fixes
                            transformed_csv = df_output.to_csv(index=False)
            
            # Check for external product IDs having descriptive text (should be IDs only)
            if 'external_product_id' in df_output.columns:
                problematic_ids = 0
                for idx, product_id in enumerate(df_output['external_product_id']):
                    if isinstance(product_id, str) and len(product_id) > 20 and ' ' in product_id:
                        problematic_ids += 1
                
                if problematic_ids > 0:
                    print(f"WARNING: {problematic_ids} products have possibly invalid external_product_id format")
            
            # If we got too few rows, add a warning but continue
            if output_rows < row_count:
                print(f"WARNING: Expected {row_count} rows, but only got {output_rows} rows.")
                
                # Try to recover by adjusting output for correct display
                if output_rows > 0:
                    print(f"Continuing with {output_rows} valid rows")
                    
                    # Check required Amazon fields
                    required_columns = ["item_sku", "external_product_id", "item_name", "standard_price", "quantity"]
                    missing_cols = [col for col in required_columns if col not in df_output.columns]
                    
                    if not missing_cols:
                        print("Output contains all required columns, format is valid")
                    else:
                        print(f"WARNING: Missing required columns: {', '.join(missing_cols)}")
                else:
                    print("ERROR: No valid rows in output")
            else:
                print(f"SUCCESS: All {row_count} rows processed successfully!")
                
        except Exception as val_error:
            print(f"Warning: Unable to validate CSV format: {str(val_error)}")
            
        # Log a few sample outputs
        try:
            print("\nSample of transformed data (first 2 rows):")
            sample_lines = transformed_csv.split('\n')[:3]  # Header + 2 rows 
            for line in sample_lines:
                print(line[:100] + "..." if len(line) > 100 else line)
            print("...")
        except Exception as e:
            pass
        
        # Determine output file name
        if output_file:
            output_path = output_file
            if not output_path.endswith('.csv'):
                output_path += '.csv'
        else:
            output_path = f"amazon_{os.path.basename(csv_file_path)}"
        
        # Save transformed CSV to file
        with open(output_path, 'w') as f:
            f.write(transformed_csv)
            
        print(f"Transformation complete! Amazon data saved to: {output_path}")
        
        return output_path
        
    except Exception as e:
        print(f"Error: {str(e)}")
        return None

if __name__ == "__main__":
    import argparse
    
    # Set up command line argument parsing
    parser = argparse.ArgumentParser(description="Transform CSV data to Amazon Inventory Loader format.")
    parser.add_argument('file', help='Path to the CSV file to transform')
    parser.add_argument('--output', '-o', help='Output file name (default: amazon_<input_filename>)')
    parser.add_argument('--verbose', '-v', action='store_true', help='Show sample of transformed data')
    
    args = parser.parse_args()
    
    csv_file_path = args.file
    
    # Check if file exists
    if not os.path.exists(csv_file_path):
        print(f"Error: File {csv_file_path} does not exist")
        sys.exit(1)
        
    # Check if file is a CSV
    if not csv_file_path.endswith('.csv'):
        print(f"Error: File {csv_file_path} is not a CSV file")
        sys.exit(1)
    
    print(f"Processing {csv_file_path}...")
    
    # Transform the CSV
    output_path = transform_to_amazon_format(csv_file_path, args.output)
    
    if output_path and args.verbose:
        # Load and display a sample of the transformed data
        try:
            with open(output_path, 'r') as f:
                content = f.read()
            
            print("\nSample of transformed Amazon data:")
            print("----------------------------------")
            lines = content.split('\n')
            # Print header and first few lines
            for i, line in enumerate(lines[:6]):
                print(line)
            print("----------------------------------")
        except Exception as e:
            print(f"Error reading transformed file: {str(e)}")