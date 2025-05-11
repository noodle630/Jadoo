import os
import csv
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

def clean_csv_with_openai(csv_file_path):
    """
    Clean CSV data using OpenAI's API
    
    Args:
        csv_file_path: Path to the CSV file to be cleaned
        
    Returns:
        The cleaned CSV as a string
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
            Columns: {', '.join(columns)}
            """
            
            print(f"Successfully parsed CSV: {data_info}")
            
        except Exception as e:
            print(f"Error parsing CSV: {str(e)}")
            return None
        
        # Send to OpenAI for cleaning
        prompt = f"""
        As an AI data cleaning expert, clean the following CSV data to make it marketplace-ready.
        
        Data information:
        {data_info}
        
        Sample data (first {sample_rows} rows):
        {data_sample}
        
        Please perform the following cleaning tasks on the entire CSV:
        1. Fix inconsistent formatting (capitalization, spacing, punctuation)
        2. Standardize values in each column
        3. Handle missing values appropriately
        4. Remove any invalid or corrupted data
        5. Ensure proper formatting for marketplace listings (e.g., proper product titles, descriptions)
        6. Return the ENTIRE cleaned dataset in valid CSV format
        
        IMPORTANT: Your response should ONLY contain the cleaned CSV data in a valid, properly formatted CSV. 
        Do not include any explanations or markdown formatting. Just return the raw CSV content.
        """
        
        print("Sending data to OpenAI for cleaning...")
        
        response = client.chat.completions.create(
            model="gpt-4o", # the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
            messages=[
                {"role": "system", "content": "You are a data cleaning expert that helps prepare CSV files for marketplace listings."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.3,  # Lower temperature for more consistent outputs
        )
        
        # Extract the cleaned CSV from the response
        message_content = response.choices[0].message.content
        if message_content is None:
            print("Error: Received empty response from OpenAI API")
            return None
            
        cleaned_csv = message_content.strip()
        
        # Save cleaned CSV to a new file
        output_file = f"cleaned_{os.path.basename(csv_file_path)}"
        with open(output_file, 'w') as f:
            f.write(cleaned_csv)
            
        print(f"Cleaning complete! Cleaned data saved to: {output_file}")
        
        return cleaned_csv
        
    except Exception as e:
        print(f"Error: {str(e)}")
        return None

if __name__ == "__main__":
    # Check if a file was provided as an argument
    if len(sys.argv) < 2:
        print("Usage: python clean_csv.py <csv_file_path>")
        sys.exit(1)
        
    csv_file_path = sys.argv[1]
    
    # Check if file exists
    if not os.path.exists(csv_file_path):
        print(f"Error: File {csv_file_path} does not exist")
        sys.exit(1)
        
    # Check if file is a CSV
    if not csv_file_path.endswith('.csv'):
        print(f"Error: File {csv_file_path} is not a CSV file")
        sys.exit(1)
        
    # Clean the CSV
    cleaned_csv = clean_csv_with_openai(csv_file_path)
    
    if cleaned_csv:
        print("\nSample of cleaned data:")
        print("------------------------")
        lines = cleaned_csv.split('\n')
        # Print header and first few lines
        for i, line in enumerate(lines[:6]):
            print(line)
        print("------------------------")