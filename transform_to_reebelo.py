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

# Define the Reebelo template columns
# These are the fields required by Reebelo for their marketplace

# Current Premium upload format columns
REEBELO_COLUMNS_CURRENT = [
    "Reebelo RID", "Product Name", "Your SKU", "SKU Condition", 
    "SKU Battery Health", "Price", "Min Price", "Quantity"
]

# New WIP format columns
REEBELO_COLUMNS_NEW = [
    "Category", "Reebelo ID", "Your SKU", "Reebelo PSKU (if applicable)",
    "Product Reference Type (UPC, GTIN, ASCIN)", "Product Reference Value",
    "Product Title", "Condition", "Brand", "Price", "Min Price", "Quantity",
    "Variant A (required)", "Variant B (required)", "Variant C (optional)",
    "Title: Specification 1", "Description: Specification 1",
    "Title: Specification 2", "Description: Specification 2",
    "Title: Specification 3", "Description: Specification 3",
    "Title: Specification 4", "Description: Specification 4",
    "Image URL 1", "Image URL 2"
]

# Use the new format by default
REEBELO_COLUMNS = REEBELO_COLUMNS_NEW

def transform_to_reebelo_format(csv_file_path, output_file=None):
    """
    Transform a CSV file to Reebelo marketplace format
    
    Args:
        csv_file_path: Path to the CSV file to transform
        output_file: Path to save the transformed file (default: reebelo_<input_filename>)
    
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
            Target Reebelo columns: {', '.join(REEBELO_COLUMNS)}
            """
            
            print(f"Successfully parsed CSV: {data_info}")
            
        except Exception as e:
            print(f"Error parsing CSV: {str(e)}")
            return None
        
        # Send to OpenAI for cleaning and transformation to Reebelo format
        prompt = f"""
        As an AI data transformation expert, convert the following CSV data to Reebelo marketplace format.
        
        Data information:
        {data_info}
        
        Sample data (first {sample_rows} rows):
        {data_sample}
        
        INSTRUCTIONS:
        1. Transform the source data to match the Reebelo marketplace format
        2. Map the source fields to Reebelo fields, using your best judgment when direct mappings aren't available
        3. For missing required fields, generate appropriate values based on existing data
        4. Clean data by fixing formatting and standardizing values
        5. Ensure all required Reebelo fields are included
        6. Format the output as a valid CSV with all the columns from the Reebelo template
        7. The first row must contain the column headers
        8. Do not include any markdown formatting or explanations, only return the CSV content
        
        IMPORTANT GUIDELINES:
        - For 'sku', use the original SKU if available or generate a unique identifier
        - For 'storage', assume default values if missing (e.g., '128GB' for phones/tablets)
        - For 'condition', use 'New', 'Refurbished', or 'Used' based on available information
        - For 'network', use 'Unlocked' as default if missing
        - For 'warranty_info', if missing use '1 Year Manufacturer Warranty'
        - For 'product_type', determine based on category (e.g., 'Smartphone', 'Tablet', 'Laptop', etc.)
        - If 'image_urls' is missing, use placeholder URLs like https://example.com/images/[sku].jpg
        - For missing prices, generate realistic market prices for similar items
        - For 'features', extract key features from description if available
        
        REQUIRED FIELDS (these MUST be in the output):
        sku, brand, model, title, description, category, storage, condition, 
        color, price, qty, network, product_type
        
        RETURN ONLY THE TRANSFORMED CSV DATA WITHOUT ANY ADDITIONAL TEXT OR FORMATTING.
        """
        
        print("Sending data to OpenAI for transformation...")
        
        response = client.chat.completions.create(
            model="gpt-3.5-turbo", # Using GPT-3.5-turbo for cost optimization as explicitly requested by user
            messages=[
                {"role": "system", "content": "You are a data transformation expert that converts product data to Reebelo marketplace format."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.3,  # Lower temperature for more consistent outputs
        )
        
        # Extract the transformed CSV from the response
        message_content = response.choices[0].message.content
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
            output_path = f"reebelo_{os.path.basename(csv_file_path)}"
        
        # Save transformed CSV to file
        with open(output_path, 'w') as f:
            f.write(transformed_csv)
            
        print(f"Transformation complete! Reebelo data saved to: {output_path}")
        
        return output_path
        
    except Exception as e:
        print(f"Error: {str(e)}")
        return None

if __name__ == "__main__":
    import argparse
    
    # Set up command line argument parsing
    parser = argparse.ArgumentParser(description="Transform CSV data to Reebelo marketplace format.")
    parser.add_argument('file', help='Path to the CSV file to transform')
    parser.add_argument('--output', '-o', help='Output file name (default: reebelo_<input_filename>)')
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
    output_path = transform_to_reebelo_format(csv_file_path, args.output)
    
    if output_path and args.verbose:
        # Load and display a sample of the transformed data
        try:
            with open(output_path, 'r') as f:
                content = f.read()
            
            print("\nSample of transformed Reebelo data:")
            print("----------------------------------")
            lines = content.split('\n')
            # Print header and first few lines
            for i, line in enumerate(lines[:6]):
                print(line)
            print("----------------------------------")
        except Exception as e:
            print(f"Error reading transformed file: {str(e)}")