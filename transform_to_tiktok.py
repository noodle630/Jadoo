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

# Define the TikTok catalog template columns (required fields first)
TIKTOK_REQUIRED_COLUMNS = [
    "sku_id", "title", "description", "availability", "condition", 
    "price", "link", "image_link", "brand"
]

# Optional fields
TIKTOK_OPTIONAL_COLUMNS = [
    "google_product_category", "video_link", "additional_image_link", 
    "age_group", "color", "gender", "item_group_id", "material", 
    "pattern", "product_type", "sale_price", "sale_price_effective_date", 
    "shipping", "shipping_weight", "gtin", "mpn", "size", "tax", 
    "ios_url", "android_url", "custom_label_0", "custom_label_1", 
    "custom_label_2", "custom_label_3", "custom_label_4", "merchant_brand", 
    "productHisEval"
]

# Combine all fields
TIKTOK_COLUMNS = TIKTOK_REQUIRED_COLUMNS + TIKTOK_OPTIONAL_COLUMNS

from db_utils import time_transformation

@time_transformation
def transform_to_tiktok_format(csv_file_path, output_file=None, marketplace="tiktok", max_rows=200):
    """
    Transform a CSV file to TikTok catalog format
    
    Args:
        csv_file_path: Path to the CSV file to transform
        output_file: Path to save the transformed file (default: tiktok_<input_filename>)
        marketplace: The marketplace identifier for the database (default: tiktok)
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
            Target TikTok required columns: {', '.join(TIKTOK_REQUIRED_COLUMNS)}
            Target TikTok optional columns: {', '.join(TIKTOK_OPTIONAL_COLUMNS)}
            """
            
            print(f"Successfully parsed CSV: {data_info}")
            
        except Exception as e:
            print(f"Error parsing CSV: {str(e)}")
            return None
        
        # Send to OpenAI for cleaning and transformation to TikTok format
        prompt = f"""
        As an AI data transformation expert, convert the following CSV data to TikTok catalog format for Video Shopping Ads.
        
        Data information:
        {data_info}
        
        Sample data (first {sample_rows} rows):
        {data_sample}
        
        INSTRUCTIONS:
        1. Transform the source data to match the TikTok catalog format
        2. Map the source fields to TikTok fields, using your best judgment when direct mappings aren't available
        3. For missing required fields, generate appropriate values based on existing data
        4. Clean data by fixing formatting and standardizing values
        5. Ensure all required TikTok fields are included
        6. Format the output as a valid CSV with all the columns from the TikTok template
        7. The first row must contain the column headers
        8. Do not include any markdown formatting or explanations, only return the CSV content
        
        IMPORTANT GUIDELINES:
        - For 'sku_id', use a unique ID for the item
        - For 'title', ensure it is descriptive without promotional text
        - For 'description', provide a short description of the item
        - For 'availability', use values from: "in stock", "available for order", "preorder", "out of stock", "discontinued"
        - For 'condition', use values from: "new", "refurbished", "used"
        - For 'price', include the price with currency (e.g., "9.99 USD")
        - For 'link', provide the URL of the product landing page
        - For 'image_link', provide a URL for the product image
        - For 'brand', provide the product brand name
        - For 'google_product_category', use a preset value from Google's product taxonomy
        - For video or image URLs, ensure they meet TikTok's format requirements
        
        REQUIRED FIELDS (these MUST be in the output):
        sku_id, title, description, availability, condition, price, link, image_link, brand
        
        RETURN ONLY THE TRANSFORMED CSV DATA WITHOUT ANY ADDITIONAL TEXT OR FORMATTING.
        """
        
        print("Sending data to OpenAI for transformation...")
        
        response = client.chat.completions.create(
            model="gpt-3.5-turbo", # Using GPT-3.5-turbo for cost optimization as explicitly requested by user
            messages=[
                {"role": "system", "content": "You are a data transformation expert that converts product data to TikTok catalog format."},
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
            output_path = f"tiktok_{os.path.basename(csv_file_path)}"
        
        # Save transformed CSV to file
        with open(output_path, 'w') as f:
            f.write(transformed_csv)
            
        print(f"Transformation complete! TikTok data saved to: {output_path}")
        
        return output_path
        
    except Exception as e:
        print(f"Error: {str(e)}")
        return None

if __name__ == "__main__":
    import argparse
    
    # Set up command line argument parsing
    parser = argparse.ArgumentParser(description="Transform CSV data to TikTok catalog format.")
    parser.add_argument('file', help='Path to the CSV file to transform')
    parser.add_argument('--output', '-o', help='Output file name (default: tiktok_<input_filename>)')
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
    output_path = transform_to_tiktok_format(csv_file_path, args.output)
    
    if output_path and args.verbose:
        # Load and display a sample of the transformed data
        try:
            with open(output_path, 'r') as f:
                content = f.read()
            
            print("\nSample of transformed TikTok data:")
            print("----------------------------------")
            lines = content.split('\n')
            # Print header and first few lines
            for i, line in enumerate(lines[:6]):
                print(line)
            print("----------------------------------")
        except Exception as e:
            print(f"Error reading transformed file: {str(e)}")