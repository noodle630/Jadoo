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

# Define the Meta (Facebook) template columns
# These are the fields required by Meta's product catalog
META_COLUMNS = [
    "id", "title", "ios_url", "ios_app_store_id", "ios_app_name", 
    "android_url", "android_package", "android_app_name", 
    "windows_phone_url", "windows_phone_app_id", "windows_phone_app_name", 
    "description", "google_product_category", "product_type", "link", 
    "image_link", "condition", "availability", "price", "sale_price", 
    "sale_price_effective_date", "gtin", "brand", "mpn", "item_group_id", 
    "gender", "age_group", "color", "size", "shipping", "custom_label_0"
]

# Required fields for Meta
REQUIRED_META_FIELDS = [
    "id", "title", "description", "availability", "condition", 
    "price", "link", "image_link", "brand"
]

from db_utils import time_transformation

@time_transformation
def transform_to_meta_format(csv_file_path, output_file=None, marketplace="meta", max_rows=200):
    """
    Transform a CSV file to Meta (Facebook) product catalog format
    
    Args:
        csv_file_path: Path to the CSV file to transform
        output_file: Path to save the transformed file (default: meta_<input_filename>)
        marketplace: The marketplace identifier for the database (default: meta)
        max_rows: Maximum rows to process for cost efficiency (default: 200)
    
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
            Target Meta columns: {', '.join(META_COLUMNS)}
            Required Meta fields: {', '.join(REQUIRED_META_FIELDS)}
            """
            
            print(f"Successfully parsed CSV: {data_info}")
            
        except Exception as e:
            print(f"Error parsing CSV: {str(e)}")
            return None
        
        # Send to OpenAI for cleaning and transformation to Meta format
        prompt = f"""
        As an AI data transformation expert, convert the following CSV data to Meta (Facebook) product catalog format.
        
        Data information:
        {data_info}
        
        Sample data (first {sample_rows} rows):
        {data_sample}
        
        INSTRUCTIONS:
        1. Transform the source data to match the Meta product catalog format
        2. Map the source fields to Meta fields, using your best judgment when direct mappings aren't available
        3. For missing required fields, generate appropriate values based on existing data
        4. Clean data by fixing formatting and standardizing values
        5. Ensure all required Meta fields are included
        6. Format the output as a valid CSV with all the columns from the Meta template
        7. The first row must contain the column headers
        8. Do not include any markdown formatting or explanations, only return the CSV content
        
        IMPORTANT GUIDELINES:
        - For 'id', use a unique identifier for each product
        - For 'title', ensure it is descriptive and accurate
        - For 'description', provide a detailed product description
        - For 'availability', use values like 'in stock', 'out of stock', etc.
        - For 'condition', use values like 'new', 'used', 'refurbished'
        - For 'price', include both the amount and currency code (e.g., '9.99 USD')
        - For 'link', provide a URL to the product page
        - For 'image_link', provide a URL to the product image
        - For 'brand', specify the product brand
        - For 'google_product_category', use values from Google's product taxonomy
        - For app-related fields (ios_url, android_url, etc.), leave them blank if not applicable
        
        REQUIRED FIELDS (these MUST be in the output):
        id, title, description, availability, condition, price, link, image_link, brand
        
        RETURN ONLY THE TRANSFORMED CSV DATA WITHOUT ANY ADDITIONAL TEXT OR FORMATTING.
        """
        
        print("Sending data to OpenAI for transformation...")
        
        response = client.chat.completions.create(
            model="gpt-3.5-turbo", # Using GPT-3.5-turbo for cost optimization as explicitly requested by user
            messages=[
                {"role": "system", "content": "You are a data transformation expert that converts product data to Meta (Facebook) product catalog format."},
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
            output_path = f"meta_{os.path.basename(csv_file_path)}"
        
        # Save transformed CSV to file
        with open(output_path, 'w') as f:
            f.write(transformed_csv)
            
        print(f"Transformation complete! Meta data saved to: {output_path}")
        
        return output_path
        
    except Exception as e:
        print(f"Error: {str(e)}")
        return None

if __name__ == "__main__":
    import argparse
    
    # Set up command line argument parsing
    parser = argparse.ArgumentParser(description="Transform CSV data to Meta (Facebook) product catalog format.")
    parser.add_argument('file', help='Path to the CSV file to transform')
    parser.add_argument('--output', '-o', help='Output file name (default: meta_<input_filename>)')
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
    output_path = transform_to_meta_format(csv_file_path, args.output)
    
    if output_path and args.verbose:
        # Load and display a sample of the transformed data
        try:
            with open(output_path, 'r') as f:
                content = f.read()
            
            print("\nSample of transformed Meta data:")
            print("----------------------------------")
            lines = content.split('\n')
            # Print header and first few lines
            for i, line in enumerate(lines[:6]):
                print(line)
            print("----------------------------------")
        except Exception as e:
            print(f"Error reading transformed file: {str(e)}")