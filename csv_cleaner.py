import os
import csv
import io
import pandas as pd
from flask import Flask, request, jsonify, make_response
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

# Initialize Flask app
app = Flask(__name__)

@app.route('/clean', methods=['POST'])
def clean_csv():
    """
    API endpoint to clean CSV data using OpenAI.
    
    This endpoint receives a CSV file upload, sends the content to OpenAI for cleaning,
    and returns the cleaned CSV data as a response.
    """
    try:
        # Check if a file was uploaded
        if 'file' not in request.files:
            return jsonify({"error": "No file part"}), 400
        
        file = request.files['file']
        
        # Check if file is empty
        if file.filename == '':
            return jsonify({"error": "No file selected"}), 400
        
        # Check if the file is a CSV
        if not file.filename.endswith('.csv'):
            return jsonify({"error": "File must be a CSV"}), 400
        
        # Read the CSV file
        csv_content = file.read().decode('utf-8')
        
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
            
        except Exception as e:
            return jsonify({"error": f"Error parsing CSV: {str(e)}"}), 400
        
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
        
        response = client.chat.completions.create(
            model="gpt-4o", # the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
            messages=[
                {"role": "system", "content": "You are a data cleaning expert that helps prepare CSV files for marketplace listings."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.3,  # Lower temperature for more consistent outputs
        )
        
        # Extract the cleaned CSV from the response
        cleaned_csv = response.choices[0].message.content.strip()
        
        # Create a text/csv response
        response = make_response(cleaned_csv)
        response.headers["Content-Disposition"] = f"attachment; filename=cleaned_{file.filename}"
        response.headers["Content-Type"] = "text/csv"
        
        return response
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/', methods=['GET'])
def index():
    """Simple test endpoint to verify the server is running."""
    return "CSV Cleaning API is running. Use POST /clean with a CSV file to clean data."

if __name__ == '__main__':
    # Run the app on 0.0.0.0 to make it accessible externally
    # Use port 8000 to avoid conflict with the Node.js server on port 5000
    app.run(host='0.0.0.0', port=8000, debug=True)