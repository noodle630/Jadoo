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
            
            # Limit the data sample to prevent exceeding token limits
            sample_rows = min(5, row_count)
            data_sample = df.head(sample_rows).to_csv(index=False)
            
            # Prepare a message about the data structure
            data_info = f"""
            CSV file has {row_count} rows and {column_count} columns.
            Source columns: {', '.join(columns)}
            Target Amazon columns: {', '.join(AMAZON_COLUMNS)}
            """
            
            print(f"Successfully parsed CSV: {data_info}")
            
        except Exception as e:
            print(f"Error parsing CSV: {str(e)}")
            return None
        
        # Send to OpenAI for cleaning and transformation to Amazon format
        prompt = f"""
        As an AI data transformation expert, convert the following CSV data to Amazon Inventory Loader format.
        
        Data information:
        {data_info}
        
        Sample data (first {sample_rows} rows):
        {data_sample}
        
        INSTRUCTIONS:
        1. Transform the source data to match the Amazon Inventory Loader template format for Electronics category
        2. Map the source fields to Amazon fields, using your best judgment when direct mappings aren't available
        3. For missing required fields, generate appropriate values based on existing data
        4. Clean data by fixing formatting and standardizing values
        5. Ensure all required Amazon fields are included
        6. Format the output as a valid CSV with all the columns from the Amazon template
        7. The first row must contain the column headers
        8. Do not include any markdown formatting or explanations, only return the CSV content
        
        IMPORTANT GUIDELINES:
        - For 'external_product_id', use UPC if available or generate a 12-digit number
        - For 'external_product_id_type', use 'UPC' as default
        - For 'update_delete', use 'Update' as default
        - For 'feed_product_type', use 'Consumer Electronics' for electronic items
        - For 'item_condition', use 'New' as default
        - Missing prices should be realistic market prices for similar items
        - Generate reasonable bullet points (bullet_point1-5) from the product description
        - Generate a comprehensive product_description if missing
        - For images, use placeholder URLs like https://example.com/images/[sku].jpg if none provided
        
        REQUIRED FIELDS (these MUST be in the output):
        item_sku, external_product_id, external_product_id_type, item_name, brand_name, 
        manufacturer, feed_product_type, update_delete, standard_price, quantity, 
        item_condition, item_type, model
        
        RETURN ONLY THE TRANSFORMED CSV DATA WITHOUT ANY ADDITIONAL TEXT OR FORMATTING.
        """
        
        print("Sending data to OpenAI for transformation...")
        
        try:
            print(f"Sending OpenAI request to transform data for {row_count} rows...")
            
            response = client.chat.completions.create(
                model="gpt-4o", # the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
                messages=[
                    {"role": "system", "content": "You are a data transformation expert that converts product data to Amazon Inventory Loader format."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.3,  # Lower temperature for more consistent outputs
            )
            
            # Extract the transformed CSV from the response
            message_content = response.choices[0].message.content
            
            print(f"OpenAI response received! Content length: {len(message_content) if message_content else 0} characters")
        except Exception as api_error:
            print(f"OpenAI API Error: {str(api_error)}")
            raise
        if message_content is None:
            print("Error: Received empty response from OpenAI API")
            return None
            
        # Remove markdown code block indicators if present
        cleaned_content = message_content.strip()
        if cleaned_content.startswith("```csv"):
            cleaned_content = cleaned_content[6:]
        if cleaned_content.endswith("```"):
            cleaned_content = cleaned_content[:-3]
            
        transformed_csv = cleaned_content.strip()
        
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