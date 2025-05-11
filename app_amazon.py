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

@app.route('/clean', methods=['POST'])
def clean_csv():
    """
    API endpoint to clean CSV data and transform it to Amazon Inventory Loader format.
    
    This endpoint receives a CSV file upload, sends the content to OpenAI for cleaning
    and transformation, and returns the cleaned Amazon-format CSV data as a response.
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
        if file.filename is None or not file.filename.endswith('.csv'):
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
            Source columns: {', '.join(columns)}
            Target Amazon columns: {', '.join(AMAZON_COLUMNS)}
            """
            
        except Exception as e:
            return jsonify({"error": f"Error parsing CSV: {str(e)}"}), 400
        
        # Get marketplace (Amazon is the default for now)
        marketplace = request.form.get('marketplace', 'amazon').lower()
        
        # Only support Amazon for now
        if marketplace != 'amazon':
            return jsonify({"error": "Currently only Amazon marketplace is supported"}), 400
        
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
        if message_content is None:
            return jsonify({"error": "Received empty response from OpenAI API"}), 500
            
        # Remove markdown code block indicators if present
        cleaned_content = message_content.strip()
        if cleaned_content.startswith("```csv"):
            cleaned_content = cleaned_content[6:]
        if cleaned_content.endswith("```"):
            cleaned_content = cleaned_content[:-3]
            
        transformed_csv = cleaned_content.strip()
        
        # Create a text/csv response
        response = make_response(transformed_csv)
        response.headers["Content-Disposition"] = f"attachment; filename=amazon_{file.filename}"
        response.headers["Content-Type"] = "text/csv"
        
        return response
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# Add a route for the index page that displays a form for uploading CSV files
@app.route('/', methods=['GET'])
def index():
    """Simple HTML form for testing the CSV transformer"""
    html = """
    <!DOCTYPE html>
    <html>
    <head>
        <title>Amazon Inventory CSV Transformer</title>
        <style>
            body {
                font-family: Arial, sans-serif;
                max-width: 800px;
                margin: 0 auto;
                padding: 20px;
            }
            h1 {
                color: #232F3E;
            }
            form {
                border: 1px solid #ddd;
                padding: 20px;
                border-radius: 5px;
                background-color: #f9f9f9;
            }
            .form-group {
                margin-bottom: 15px;
            }
            label {
                display: block;
                margin-bottom: 5px;
                font-weight: bold;
            }
            input[type="file"] {
                width: 100%;
                padding: 8px;
                border: 1px solid #ddd;
                border-radius: 4px;
            }
            select {
                width: 100%;
                padding: 8px;
                border: 1px solid #ddd;
                border-radius: 4px;
            }
            button {
                background-color: #FF9900;
                color: white;
                padding: 10px 15px;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                font-weight: bold;
            }
            button:hover {
                background-color: #E88A00;
            }
            .info {
                background-color: #EAF4FF;
                border-left: 6px solid #232F3E;
                padding: 15px;
                margin: 15px 0;
            }
            .amazon-logo {
                color: #232F3E;
                font-weight: bold;
            }
            .amazon-accent {
                color: #FF9900;
            }
            .template-preview {
                background-color: #f5f5f5;
                padding: 15px;
                border-radius: 4px;
                margin-top: 20px;
                overflow-x: auto;
            }
            .template-preview h3 {
                margin-top: 0;
            }
            .template-preview code {
                white-space: nowrap;
                font-family: monospace;
                font-size: 0.9em;
            }
        </style>
    </head>
    <body>
        <h1><span class="amazon-logo">Amazon</span> <span class="amazon-accent">Inventory</span> CSV Transformer</h1>
        <div class="info">
            <p>This tool transforms your product data into Amazon's Inventory Loader format.</p>
            <p>Upload a CSV file with your product information, and receive a properly formatted file ready for Amazon Seller Central.</p>
        </div>
        
        <form action="/clean" method="post" enctype="multipart/form-data">
            <div class="form-group">
                <label for="file">Select CSV File:</label>
                <input type="file" id="file" name="file" accept=".csv" required>
            </div>
            <div class="form-group">
                <label for="marketplace">Marketplace:</label>
                <select id="marketplace" name="marketplace">
                    <option value="amazon" selected>Amazon</option>
                    <option value="walmart" disabled>Walmart (Coming Soon)</option>
                    <option value="ebay" disabled>eBay (Coming Soon)</option>
                    <option value="etsy" disabled>Etsy (Coming Soon)</option>
                </select>
            </div>
            <button type="submit">Transform CSV</button>
        </form>
        
        <div class="template-preview">
            <h3>Amazon Inventory Template Fields:</h3>
            <code>item_sku, external_product_id, external_product_id_type, item_name, brand_name, manufacturer, feed_product_type, update_delete, standard_price, quantity, product_tax_code, product_site_launch_date, restock_date, fulfillment_latency, item_condition, main_image_url, item_type, model, bullet_point1-5, product_description</code>
            <p><strong>Required fields:</strong> item_sku, external_product_id, external_product_id_type, item_name, brand_name, manufacturer, feed_product_type, update_delete, standard_price, quantity, item_condition</p>
        </div>
    </body>
    </html>
    """
    return html

# Custom error handler for 404 errors
@app.errorhandler(404)
def not_found(error):
    return jsonify({"error": "Route not found"}), 404

# Custom error handler for 500 errors 
@app.errorhandler(500)
def server_error(error):
    return jsonify({"error": "Server error"}), 500

if __name__ == '__main__':
    # Run the app on 0.0.0.0 to make it accessible externally
    # Use port 8000 to avoid conflict with the Node.js server
    app.run(host='0.0.0.0', port=8000, debug=True)