import os
import io
import pandas as pd
from flask import Flask, request, render_template, jsonify, make_response, send_file, redirect, url_for
from werkzeug.utils import secure_filename
from openai import OpenAI
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Get OpenAI API key
api_key = os.getenv("OPENAI_API_KEY")
if not api_key:
    raise ValueError("OPENAI_API_KEY environment variable not set")

# Initialize OpenAI client
client = OpenAI(api_key=api_key)

# Import marketplace column definitions
from transform_to_amazon import AMAZON_COLUMNS
from transform_to_reebelo import REEBELO_COLUMNS, REEBELO_COLUMNS_CURRENT, REEBELO_COLUMNS_NEW
from transform_to_walmart import WALMART_COLUMNS, REQUIRED_WALMART_FIELDS
from transform_to_catch import CATCH_COLUMNS, REQUIRED_FIELDS as REQUIRED_CATCH_FIELDS
from transform_to_meta import META_COLUMNS, REQUIRED_META_FIELDS
from transform_to_tiktok import TIKTOK_COLUMNS, TIKTOK_REQUIRED_COLUMNS as REQUIRED_TIKTOK_FIELDS

# Marketplace configurations
MARKETPLACES = {
    "amazon": {
        "name": "Amazon Inventory Loader",
        "columns": AMAZON_COLUMNS,
        "endpoint": "/transform-to-amazon",
        "color": "#ff9900",
        "hover_color": "#e88a00"
    },
    "reebelo": {
        "name": "Reebelo Marketplace",
        "columns": REEBELO_COLUMNS,
        "endpoint": "/transform-to-reebelo",
        "color": "#4052b5",
        "hover_color": "#2e3b82"
    },
    "reebelo-legacy": {
        "name": "Reebelo Legacy Format",
        "columns": REEBELO_COLUMNS_CURRENT,
        "endpoint": "/transform-to-reebelo-legacy",
        "color": "#4052b5",
        "hover_color": "#2e3b82"
    },
    "walmart": {
        "name": "Walmart Marketplace",
        "columns": WALMART_COLUMNS,
        "endpoint": "/transform-to-walmart",
        "color": "#0071ce",
        "hover_color": "#004c91"
    },
    "catch": {
        "name": "Catch Marketplace",
        "columns": CATCH_COLUMNS,
        "endpoint": "/transform-to-catch",
        "color": "#00aaa7",
        "hover_color": "#008e8c"
    },
    "meta": {
        "name": "Meta (Facebook) Product Catalog",
        "columns": META_COLUMNS,
        "endpoint": "/transform-to-meta",
        "color": "#1877f2",
        "hover_color": "#0e5fcb"
    },
    "tiktok": {
        "name": "TikTok Shopping Catalog",
        "columns": TIKTOK_COLUMNS,
        "endpoint": "/transform-to-tiktok",
        "color": "#000000",
        "hover_color": "#333333"
    }
}

# Create Flask app
app = Flask(__name__)
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # Limit upload size to 16MB

# Create a temporary directory for uploads if it doesn't exist
UPLOAD_FOLDER = os.path.join(os.getcwd(), 'temp_uploads')
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

def transform_csv_with_openai(file_path, marketplace_key, format_param='csv'):
    """
    Transform a CSV file to the specified marketplace format using OpenAI
    
    Args:
        file_path: Path to the CSV file
        marketplace_key: Key to identify the marketplace (amazon, reebelo, walmart, catch)
        format_param: Response format (csv or json)
        
    Returns:
        The transformed CSV content and metadata
    """
    try:
        # Read the CSV
        df = pd.read_csv(file_path)
        row_count = len(df)
        column_count = len(df.columns)
        columns = list(df.columns)
        
        # Get marketplace config
        marketplace = MARKETPLACES[marketplace_key]
        marketplace_columns = marketplace["columns"]
        
        # Get required fields if defined
        required_fields = []
        if marketplace_key == "walmart":
            required_fields = REQUIRED_WALMART_FIELDS
        elif marketplace_key == "catch":
            required_fields = REQUIRED_CATCH_FIELDS
        elif marketplace_key == "meta":
            required_fields = REQUIRED_META_FIELDS
        elif marketplace_key == "tiktok":
            required_fields = REQUIRED_TIKTOK_FIELDS
        
        # Limit the data sample to prevent exceeding token limits
        sample_rows = min(5, row_count)
        data_sample = df.head(sample_rows).to_csv(index=False)
        
        # Prepare info about the data structure
        data_info = f"""
        CSV file has {row_count} rows and {column_count} columns.
        Source columns: {', '.join(columns)}
        Target {marketplace['name']} columns: {', '.join(marketplace_columns)}
        """
        
        if required_fields:
            data_info += f"Required fields: {', '.join(required_fields)}\n"
        
        # Create prompt based on marketplace
        if marketplace_key == "amazon":
            prompt = create_amazon_prompt(data_info, data_sample, sample_rows)
        elif marketplace_key in ["reebelo", "reebelo-legacy"]:
            prompt = create_reebelo_prompt(data_info, data_sample, sample_rows, marketplace_key == "reebelo-legacy")
        elif marketplace_key == "walmart":
            prompt = create_walmart_prompt(data_info, data_sample, sample_rows)
        elif marketplace_key == "catch":
            prompt = create_catch_prompt(data_info, data_sample, sample_rows)
        elif marketplace_key == "meta":
            prompt = create_meta_prompt(data_info, data_sample, sample_rows)
        elif marketplace_key == "tiktok":
            prompt = create_tiktok_prompt(data_info, data_sample, sample_rows)
        else:
            raise ValueError(f"Unsupported marketplace: {marketplace_key}")
            
        # Call OpenAI API
        system_message = f"You are a data transformation expert that converts product data to {marketplace['name']} format."
        
        response = client.chat.completions.create(
            model="gpt-4o",  # the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
            messages=[
                {"role": "system", "content": system_message},
                {"role": "user", "content": prompt}
            ],
            temperature=0.3,  # Lower temperature for more consistent outputs
        )
        
        # Extract the transformed CSV content
        message_content = response.choices[0].message.content
        if message_content is None:
            return {"error": "Received empty response from OpenAI API"}, 500
            
        # Remove markdown code block indicators if present
        cleaned_content = message_content.strip()
        if cleaned_content.startswith("```csv"):
            cleaned_content = cleaned_content[6:]
        if cleaned_content.endswith("```"):
            cleaned_content = cleaned_content[:-3]
            
        transformed_csv = cleaned_content.strip()
        
        # Get the filename without the path
        filename = os.path.basename(file_path)
        
        # Save the transformed CSV to a file
        output_filename = f"{marketplace_key}_{filename}"
        output_filepath = os.path.join(app.config['UPLOAD_FOLDER'], output_filename)
        with open(output_filepath, 'w') as f:
            f.write(transformed_csv)
            
        # Return result based on format
        if format_param == 'json':
            # Parse the CSV and return as JSON
            result_df = pd.read_csv(io.StringIO(transformed_csv))
            json_data = result_df.to_json(orient='records')
            return {
                "success": True,
                "message": f"CSV transformed successfully to {marketplace['name']} format",
                "data": json_data,
                "row_count": row_count,
                "transformed_row_count": len(result_df),
                "output_filename": output_filename,
                "output_filepath": output_filepath
            }
        else:
            # Return the CSV data directly
            return {
                "success": True,
                "message": f"CSV transformed successfully to {marketplace['name']} format",
                "data": transformed_csv,
                "output_filename": output_filename,
                "output_filepath": output_filepath
            }
            
    except Exception as e:
        return {"error": f"Error transforming CSV: {str(e)}"}, 500

def create_amazon_prompt(data_info, data_sample, sample_rows):
    return f"""
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

def create_reebelo_prompt(data_info, data_sample, sample_rows, legacy=False):
    template_type = "current (legacy)" if legacy else "new"
    return f"""
    As an AI data transformation expert, convert the following CSV data to Reebelo marketplace format ({template_type} format).
    
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
    {'- For the legacy format: "Reebelo RID", "Product Name", "Your SKU", etc.' if legacy else '- For the new format: "Category", "Reebelo ID", "Your SKU", etc.'}
    - For 'sku', use the original SKU if available or generate a unique identifier
    - For 'storage', assume default values if missing (e.g., '128GB' for phones/tablets)
    - For 'condition', use 'New', 'Refurbished', or 'Used' based on available information
    - For 'network', use 'Unlocked' as default if missing
    - For 'warranty_info', if missing use '1 Year Manufacturer Warranty'
    - For 'product_type', determine based on category (e.g., 'Smartphone', 'Tablet', 'Laptop', etc.)
    - If 'image_urls' is missing, use placeholder URLs like https://example.com/images/[sku].jpg
    - For missing prices, generate realistic market prices for similar items
    
    REQUIRED FIELDS (these MUST be in the output):
    {'Reebelo RID, Product Name, Your SKU, SKU Condition, SKU Battery Health, Price, Min Price, Quantity' if legacy else 'Category, Reebelo ID, Your SKU, Product Title, Brand, Price, Min Price, Quantity'}
    
    RETURN ONLY THE TRANSFORMED CSV DATA WITHOUT ANY ADDITIONAL TEXT OR FORMATTING.
    """

def create_walmart_prompt(data_info, data_sample, sample_rows):
    return f"""
    As an AI data transformation expert, convert the following CSV data to Walmart marketplace format.
    
    Data information:
    {data_info}
    
    Sample data (first {sample_rows} rows):
    {data_sample}
    
    INSTRUCTIONS:
    1. Transform the source data to match the Walmart marketplace format for mobile phones
    2. Map the source fields to Walmart fields, using your best judgment when direct mappings aren't available
    3. For missing required fields, generate appropriate values based on existing data
    4. Clean data by fixing formatting and standardizing values
    5. Ensure all required Walmart fields are included
    6. Format the output as a valid CSV with all the columns from the Walmart template
    7. The first row must contain the column headers
    8. Do not include any markdown formatting or explanations, only return the CSV content
    
    IMPORTANT GUIDELINES:
    - For 'sku', use the original SKU if available
    - For 'specProductType', use 'Cell Phones'
    - For 'productIdType', use 'UPC' as default
    - For 'productName', ensure it meets character limits
    - For 'shortDescription', provide a concise product description
    - For 'price', format as a decimal with no currency symbol
    - For 'ShippingWeight', provide weight in pounds
    - For 'mainImageUrl', use a valid image URL
    - For 'cellPhoneType', use values like 'Smartphone', 'Feature Phone', etc.
    - For 'color', specify the device color
    - For 'condition', use 'New', 'Refurbished', or 'Used' as appropriate
    
    REQUIRED FIELDS (these MUST be in the output):
    sku, specProductType, productIdType, productId, productName, brand, price, 
    ShippingWeight, shortDescription, mainImageUrl
    
    RETURN ONLY THE TRANSFORMED CSV DATA WITHOUT ANY ADDITIONAL TEXT OR FORMATTING.
    """

def create_catch_prompt(data_info, data_sample, sample_rows):
    return f"""
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

@app.route('/')
def index():
    """Landing page showing options for different marketplaces"""
    return render_template('marketplace_selector.html', marketplaces=MARKETPLACES)

@app.route('/marketplace/<marketplace_key>')
def marketplace_form(marketplace_key):
    """Display the upload form for a specific marketplace"""
    if marketplace_key not in MARKETPLACES:
        return redirect(url_for('index'))
    
    marketplace = MARKETPLACES[marketplace_key]
    return render_template('marketplace_transform.html', 
                          marketplace_key=marketplace_key,
                          marketplace=marketplace)

@app.route('/transform', methods=['POST'])
def transform_csv():
    """Handle the CSV transformation for any marketplace"""
    try:
        # Check for the marketplace key
        marketplace_key = request.form.get('marketplace')
        if not marketplace_key or marketplace_key not in MARKETPLACES:
            return jsonify({"error": "Invalid marketplace selected"}), 400
            
        # Check for the file
        if 'file' not in request.files:
            return jsonify({"error": "No file part"}), 400
            
        file = request.files['file']
        
        # Check if file is selected
        if file.filename is None or file.filename == '':
            return jsonify({"error": "No selected file"}), 400
            
        # Check if file is a CSV
        if not file.filename.lower().endswith('.csv'):
            return jsonify({"error": "File must be a CSV"}), 400
            
        # Save the file temporarily
        filename = secure_filename(str(file.filename))
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(filepath)
        
        # Get the requested response format
        format_param = request.args.get('format', 'csv')
        
        # Transform the CSV
        result = transform_csv_with_openai(filepath, marketplace_key, format_param)
        
        # Check for error
        if isinstance(result, tuple) and len(result) > 1 and isinstance(result[0], dict) and "error" in result[0]:
            return jsonify(result[0]), result[1]
            
        # Return based on format
        if format_param == 'json':
            return jsonify(result)
        else:
            return send_file(
                io.BytesIO(result["data"].encode('utf-8')),
                mimetype='text/csv',
                as_attachment=True,
                download_name=result["output_filename"]
            )
            
    except Exception as e:
        return jsonify({"error": f"Server error: {str(e)}"}), 500

@app.errorhandler(404)
def not_found(error):
    """Return a custom 404 error."""
    return make_response(jsonify({'error': 'Not found'}), 404)

@app.errorhandler(500)
def server_error(error):
    """Return a custom 500 error."""
    return make_response(jsonify({'error': 'Server error'}), 500)

if __name__ == '__main__':
    # Create templates directory if it doesn't exist
    if not os.path.exists('templates'):
        os.makedirs('templates')
    
    # Create landing page template
    with open('templates/marketplace_selector.html', 'w') as f:
        f.write("""
        <!DOCTYPE html>
        <html>
        <head>
            <title>Product Feed Transformation Tool</title>
            <style>
                body { 
                    font-family: Arial, sans-serif; 
                    max-width: 1000px; 
                    margin: 0 auto; 
                    padding: 20px;
                    background-color: #f7f9fc;
                }
                h1 { 
                    color: #2d3748; 
                    text-align: center;
                    margin-bottom: 40px;
                }
                .container {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 20px;
                    justify-content: center;
                }
                .marketplace-card {
                    background-color: #fff;
                    border-radius: 8px;
                    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
                    width: 300px;
                    padding: 25px;
                    text-align: center;
                    transition: transform 0.3s, box-shadow 0.3s;
                }
                .marketplace-card:hover {
                    transform: translateY(-5px);
                    box-shadow: 0 8px 15px rgba(0, 0, 0, 0.1);
                }
                .marketplace-logo {
                    height: 80px;
                    margin-bottom: 20px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                .marketplace-title {
                    font-size: 22px;
                    font-weight: bold;
                    margin-bottom: 15px;
                    color: #2d3748;
                }
                .marketplace-description {
                    color: #4a5568;
                    margin-bottom: 25px;
                    line-height: 1.5;
                }
                .marketplace-button {
                    display: inline-block;
                    padding: 12px 30px;
                    border-radius: 6px;
                    text-decoration: none;
                    color: white;
                    font-weight: bold;
                    transition: background-color 0.3s;
                }
                footer {
                    margin-top: 50px;
                    text-align: center;
                    color: #a0aec0;
                    font-size: 14px;
                }
            </style>
        </head>
        <body>
            <h1>Product Feed Transformation Tool</h1>
            
            <div class="container">
                {% for key, marketplace in marketplaces.items() %}
                <div class="marketplace-card">
                    <div class="marketplace-logo">
                        <!-- We can add logos later if needed -->
                        <h2 style="color: {{ marketplace.color }};">{{ marketplace.name }}</h2>
                    </div>
                    <div class="marketplace-title">{{ marketplace.name }}</div>
                    <div class="marketplace-description">
                        Transform your product data to the {{ marketplace.name }} format with AI-powered field mapping and data standardization.
                    </div>
                    <a href="/marketplace/{{ key }}" class="marketplace-button" style="background-color: {{ marketplace.color }};">
                        Transform Data
                    </a>
                </div>
                {% endfor %}
            </div>
            
            <footer>
                <p>© 2024 Product Feed Transformation Tool | Powered by GPT-4o</p>
            </footer>
        </body>
        </html>
        """)
        
    # Create marketplace transformation template
    with open('templates/marketplace_transform.html', 'w') as f:
        f.write("""
        <!DOCTYPE html>
        <html>
        <head>
            <title>{{ marketplace.name }} Transformation</title>
            <style>
                body { 
                    font-family: Arial, sans-serif; 
                    max-width: 800px; 
                    margin: 0 auto; 
                    padding: 20px;
                    background-color: #f7f9fc;
                }
                h1 { color: {{ marketplace.color }}; }
                .breadcrumb {
                    margin-bottom: 20px;
                    color: #718096;
                }
                .breadcrumb a {
                    color: #4299e1;
                    text-decoration: none;
                }
                .breadcrumb a:hover {
                    text-decoration: underline;
                }
                form { 
                    margin-top: 20px; 
                    padding: 25px; 
                    border: 1px solid #e2e8f0; 
                    border-radius: 8px;
                    background-color: white;
                }
                label { 
                    display: block; 
                    margin-bottom: 8px; 
                    font-weight: bold;
                    color: #4a5568;
                }
                input[type="file"] { 
                    margin-bottom: 20px;
                    width: 100%;
                    padding: 10px;
                    border: 1px dashed #cbd5e0;
                    border-radius: 5px;
                    background-color: #f7fafc;
                }
                button { 
                    background-color: {{ marketplace.color }}; 
                    border: none; 
                    color: white; 
                    padding: 12px 25px; 
                    cursor: pointer; 
                    font-weight: bold; 
                    border-radius: 6px;
                    transition: background-color 0.3s;
                }
                button:hover { 
                    background-color: {{ marketplace.hover_color }}; 
                }
                .info { 
                    background-color: #f8f8f8; 
                    padding: 20px; 
                    margin: 20px 0; 
                    border-radius: 8px;
                    border-left: 4px solid {{ marketplace.color }};
                }
                .info h3 { 
                    margin-top: 0;
                    color: #2d3748;
                }
                .description { 
                    color: #4a5568;
                    line-height: 1.6;
                }
                .back-link {
                    display: inline-block;
                    margin-top: 20px;
                    color: #4299e1;
                    text-decoration: none;
                }
                .back-link:hover {
                    text-decoration: underline;
                }
                footer {
                    margin-top: 50px;
                    text-align: center;
                    color: #a0aec0;
                    font-size: 14px;
                }
            </style>
        </head>
        <body>
            <div class="breadcrumb">
                <a href="/">Home</a> &gt; {{ marketplace.name }}
            </div>
            <h1>{{ marketplace.name }} Transformation Tool</h1>
            <div class="description">
                <p>Convert your product data to {{ marketplace.name }} format. Upload a CSV file with your product information, and our AI will transform it into the required format.</p>
            </div>
            
            <div class="info">
                <h3>How It Works</h3>
                <p>1. Upload your product CSV file</p>
                <p>2. Our AI analyzes your data structure</p>
                <p>3. We transform and map your fields to {{ marketplace.name }}'s required format</p>
                <p>4. Download the marketplace-ready inventory file</p>
            </div>
            
            <form action="/transform" method="post" enctype="multipart/form-data">
                <input type="hidden" name="marketplace" value="{{ marketplace_key }}">
                <label for="file">Select your product CSV file:</label>
                <input type="file" name="file" id="file" accept=".csv" required>
                <button type="submit">Transform to {{ marketplace.name }} Format</button>
            </form>
            
            <div class="info">
                <h3>Sample CSV Structure</h3>
                <p>Your CSV file should contain product data with columns like:</p>
                <p><code>id, title, description, price, inventory, category, brand, sku, etc.</code></p>
                <p>Don't worry if your columns don't match exactly - our AI will map them appropriately!</p>
            </div>
            
            <a href="/" class="back-link">← Back to Marketplace Selection</a>
            
            <footer>
                <p>© 2024 Product Feed Transformation Tool | Powered by GPT-4o</p>
            </footer>
        </body>
        </html>
        """)
    
    # Run the Flask app
    app.run(host='0.0.0.0', port=int(os.environ.get('PORT', 8000)), debug=True)