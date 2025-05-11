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

# Define the Catch/Mirkal template columns
# These are the fields required by Catch Marketplace
CATCH_COLUMNS = [
    "category", "internal-sku", "title", "product-reference-value", "product-reference-type",
    "product-description", "brand", "condition", "product-quantity-multiplier", "colour",
    "keywords", "gender", "material", "variant-id", "variant-colour-value", "variant-size-value",
    "image-size-chart", "image-1", "image-2", "image-3", "image-4", "image-5", "image-6", "image-7",
    "image-8", "image-9", "image-10", "variant-image-1", "variant-image-2", "variant-image-3",
    "variant-image-4", "variant-image-5", "variant-image-6", "variant-image-7", "variant-image-8",
    "variant-image-9", "variant-image-10", "weight", "weight-unit", "width", "width-unit", "length",
    "length-unit", "height", "height-unit", "model-number", "season", "adult", "restriction", "gtin",
    "mpn", "uid", "variant-group-code", "model", "commercial-use", "gift-type", "contains-button-cell-batteries"
]

# Required fields according to the template
REQUIRED_FIELDS = [
    "category", "internal-sku", "title", "product-description", "brand", "image-1",
    "contains-button-cell-batteries", "uid"
]

def transform_to_catch_format(csv_file_path, output_file=None, max_rows=1000):
    """
    Transform a CSV file to Catch/Mirkal marketplace format
    
    Args:
        csv_file_path: Path to the CSV file to transform
        output_file: Path to save the transformed file (default: catch_<input_filename>)
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
            
            # Apply row limit for cost optimization if needed
            if row_count > max_rows:
                print(f"⚠️ Limiting processing to {max_rows} rows (from {row_count}) for cost optimization")
                df = df.head(max_rows)
                row_count = max_rows
                
            # Limit the data sample to prevent exceeding token limits
            sample_rows = min(5, row_count)
            data_sample = df.head(sample_rows).to_csv(index=False)
            
            # Prepare a message about the data structure
            data_info = f"""
            CSV file has {row_count} rows and {column_count} columns.
            Source columns: {', '.join(columns)}
            Target Catch columns: {', '.join(CATCH_COLUMNS)}
            Required Catch fields: {', '.join(REQUIRED_FIELDS)}
            """
            
            print(f"Successfully parsed CSV: {data_info}")
            
        except Exception as e:
            print(f"Error parsing CSV: {str(e)}")
            return None
        
        # Send to OpenAI for cleaning and transformation to Catch format
        prompt = f"""
        As an AI data transformation expert, convert the following CSV data to the Catch Marketplace format (also known as Mirkal format).
        
        Data information:
        {data_info}
        
        Sample data (first {sample_rows} rows):
        {data_sample}
        
        INSTRUCTIONS:
        1. Transform the source data to match the Catch Marketplace format
        2. Map the source fields to Catch fields, using your best judgment when direct mappings aren't available
        3. For missing required fields, generate appropriate values based on existing data
        4. Clean data by fixing formatting and standardizing values
        5. Ensure all required Catch fields are included
        6. Format the output as a valid CSV with all the columns from the Catch template
        7. The first row must contain the column headers
        8. Do not include any markdown formatting or explanations, only return the CSV content
        
        IMPORTANT GUIDELINES:
        - For 'category', use "Electronics & Appliances/Phones/Mobile Phones" for mobile phone products
        - For 'internal-sku', use the original SKU if available or generate a unique identifier
        - For 'title', ensure it meets Catch's character limit (max 155 characters)
        - For 'condition', use one of the allowed values: "New", "Refurbished Grade A", "Refurbished Grade B", "Pre-loved"
        - For 'colour', use one of the standard colors from the Catch system
        - For 'keywords', use pipe-separated (|) values, not exceeding 100 characters total
        - For 'image-1', a main product image URL is required
        - For 'contains-button-cell-batteries', use "Yes" or "No"
        - For 'uid', this should be populated with the GTIN or MPN value if available
        
        REQUIRED FIELDS (these MUST be in the output):
        category, internal-sku, title, product-description, brand, image-1, 
        contains-button-cell-batteries, uid
        
        RETURN ONLY THE TRANSFORMED CSV DATA WITHOUT ANY ADDITIONAL TEXT OR FORMATTING.
        """
        
        print("Sending data to OpenAI for transformation...")
        
        response = client.chat.completions.create(
            model="gpt-3.5-turbo", # Using GPT-3.5-turbo for cost optimization as explicitly requested by user
            messages=[
                {"role": "system", "content": "You are a data transformation expert that converts product data to Catch Marketplace format."},
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
            output_path = f"catch_{os.path.basename(csv_file_path)}"
        
        # Save transformed CSV to file
        with open(output_path, 'w') as f:
            f.write(transformed_csv)
            
        print(f"Transformation complete! Catch data saved to: {output_path}")
        
        return output_path
        
    except Exception as e:
        print(f"Error: {str(e)}")
        return None

if __name__ == "__main__":
    import argparse
    
    # Set up command line argument parsing
    parser = argparse.ArgumentParser(description="Transform CSV data to Catch Marketplace format.")
    parser.add_argument('file', help='Path to the CSV file to transform')
    parser.add_argument('--output', '-o', help='Output file name (default: catch_<input_filename>)')
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
    output_path = transform_to_catch_format(csv_file_path, args.output)
    
    if output_path and args.verbose:
        # Load and display a sample of the transformed data
        try:
            with open(output_path, 'r') as f:
                content = f.read()
            
            print("\nSample of transformed Catch data:")
            print("----------------------------------")
            lines = content.split('\n')
            # Print header and first few lines
            for i, line in enumerate(lines[:6]):
                print(line)
            print("----------------------------------")
        except Exception as e:
            print(f"Error reading transformed file: {str(e)}")