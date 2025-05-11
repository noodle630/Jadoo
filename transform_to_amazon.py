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

def process_chunk(df_chunk, amazon_columns, full_df_columns, full_row_count):
    """Process a chunk of the dataframe"""
    chunk_row_count = len(df_chunk)
    data_sample = df_chunk.to_csv(index=False)
    
    data_info = f"""
    CSV chunk has {chunk_row_count} rows out of {full_row_count} total.
    Source columns: {', '.join(full_df_columns)}
    Target Amazon columns: {', '.join(amazon_columns)}
    """
    
    print(f"Processing chunk with {chunk_row_count} rows...")
    
    # Create prompt for this chunk
    prompt = f"""
    As an expert in product feed transformation, convert the following source data to Amazon Inventory Loader format.
    
    DATA INFORMATION:
    {data_info}
    
    SOURCE DATA (this chunk with {chunk_row_count} rows):
    {data_sample}
    
    TRANSFORMATION REQUIREMENTS:
    1. Convert ONLY these {chunk_row_count} rows into valid Amazon Inventory Loader format
    2. Map source fields to Amazon fields with precision (map Your SKU to item_sku, Product Name to item_name, etc.)
    3. For missing required fields, infer or generate appropriate values based on existing data
    4. Clean and standardize all data fields to meet Amazon's format specifications
    5. Format numbers correctly: prices without currency symbols, integers for quantities
    6. Output MUST be valid CSV WITHOUT header row (headers will be added later)
    
    FIELD MAPPING GUIDELINES:
    - item_sku: Map from "Your SKU", generate if missing using alphanumeric format (e.g., "PROD-12345")
    - external_product_id: Generate a valid 12-digit UPC code if not available
    - external_product_id_type: Always use "UPC"
    - item_name: Map from "Product Name", standardize format and length (max 200 chars)
    - brand_name: Extract from product name or set "Generic" if unclear
    - manufacturer: Set same as brand_name if unknown
    - feed_product_type: Set to "Electronics" or appropriate subcategory based on product
    - update_delete: Always set to "Update"
    - standard_price: Map from "Price", ensure numeric format without currency symbols
    - quantity: Map from "Quantity", ensure integer values only
    - item_condition: Map from "SKU Condition" or default to "New" 
    - item_type: Set to appropriate category based on product name
    - model: Extract from product name or generate if missing
    
    REQUIRED OUTPUT:
    ONLY the transformed CSV data for these {chunk_row_count} products. 
    NO HEADER ROW, NO EXPLANATIONS, NO MARKDOWN FORMATTING.
    """
    
    try:
        response = client.chat.completions.create(
            model="gpt-4o", # the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
            messages=[
                {
                    "role": "system", 
                    "content": "You are an expert product feed transformation system. Output ONLY CSV data rows with no headers or explanations."
                },
                {"role": "user", "content": prompt}
            ],
            temperature=0.1,
            max_tokens=4000,
        )
        
        # Extract and clean the response
        content = response.choices[0].message.content
        
        # Clean up the response
        cleaned_content = content.strip()
        if cleaned_content.startswith("```csv"):
            cleaned_content = cleaned_content[6:]
        elif cleaned_content.startswith("```"):
            cleaned_content = cleaned_content[3:]
        if cleaned_content.endswith("```"):
            cleaned_content = cleaned_content[:-3]
            
        return cleaned_content.strip()
        
    except Exception as e:
        print(f"Error processing chunk: {str(e)}")
        return ""

def transform_to_amazon_format(csv_file_path, output_file=None):
    """
    Transform a CSV file to Amazon Inventory Loader format
    
    Args:
        csv_file_path: Path to the CSV file to transform
        output_file: Path to save the transformed file (default: amazon_<input_filename>)
    
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
            
        except Exception as e:
            print(f"Error parsing CSV: {str(e)}")
            return None
        
        print("Processing data using chunked approach for better handling of large datasets...")
        
        # Define our chunking settings
        CHUNK_SIZE = 50  # Process in reasonable chunks
        chunks = [df.iloc[i:i+CHUNK_SIZE] for i in range(0, len(df), CHUNK_SIZE)]
        print(f"Splitting data into {len(chunks)} chunks of approximately {CHUNK_SIZE} rows each")
        
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
                model="gpt-4o", # the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
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
            
            # Clean up the response
            template_content = template_content.strip()
            if template_content.startswith("```csv"):
                template_content = template_content[6:]
            elif template_content.startswith("```"):
                template_content = template_content[3:]
            if template_content.endswith("```"):
                template_content = template_content[:-3]
                
            template_content = template_content.strip()
            
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
                
                # Process this chunk
                chunk_result = process_chunk(chunk, AMAZON_COLUMNS, columns, row_count)
                
                # Add the non-empty lines from this chunk
                for line in chunk_result.split('\n'):
                    if line.strip():  # Only add non-empty lines
                        full_output.append(line)
                        
                print(f"Added {len(chunk_result.split('\n'))} rows from chunk {chunk_idx+1}")
            
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
            
            # If we got too few rows, add a warning
            if output_rows < row_count:
                print(f"WARNING: Expected {row_count} rows, but only got {output_rows} rows.")
                
            # Make sure all required columns are present
            required_columns = ["item_sku", "external_product_id", "item_name", "standard_price", "quantity"]
            missing_cols = [col for col in required_columns if col not in df_output.columns]
            if missing_cols:
                print(f"WARNING: Missing required columns: {', '.join(missing_cols)}")
                
        except Exception as val_error:
            print(f"Warning: Unable to validate CSV format: {str(val_error)}")
        
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