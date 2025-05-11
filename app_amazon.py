import os
import io
import pandas as pd
from flask import Flask, request, render_template, jsonify, make_response, send_file
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

# Create Flask app
app = Flask(__name__)
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # Limit upload size to 16MB

# Create a temporary directory for uploads if it doesn't exist
UPLOAD_FOLDER = os.path.join(os.getcwd(), 'temp_uploads')
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

@app.route('/transform-to-amazon', methods=['POST'])
def clean_csv():
    """
    API endpoint to clean CSV data and transform it to Amazon Inventory Loader format.
    
    This endpoint receives a CSV file upload, sends the content to OpenAI for cleaning
    and transformation, and returns the cleaned Amazon-format CSV data as a response.
    """
    try:
        # Check if the post request has the file part
        if 'file' not in request.files:
            return jsonify({"error": "No file part"}), 400
        
        file = request.files['file']
        
        # If user does not select file, browser also submits an empty part without filename
        if file.filename == '':
            return jsonify({"error": "No selected file"}), 400
            
        if file and file.filename.endswith('.csv'):
            # Save the uploaded file temporarily
            filename = secure_filename(file.filename)
            filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
            file.save(filepath)
            
            # Read the CSV to analyze its structure
            try:
                df = pd.read_csv(filepath)
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
            
            try:
                # Call OpenAI API
                response = client.chat.completions.create(
                    model="gpt-4o",  # the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
                    messages=[
                        {"role": "system", "content": "You are a data transformation expert that converts product data to Amazon Inventory Loader format."},
                        {"role": "user", "content": prompt}
                    ],
                    temperature=0.3,  # Lower temperature for more consistent outputs
                )
                
                # Extract the transformed CSV content
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
                
                # Save the transformed CSV to a file (for user download)
                output_filename = f"amazon_{filename}"
                output_filepath = os.path.join(app.config['UPLOAD_FOLDER'], output_filename)
                with open(output_filepath, 'w') as f:
                    f.write(transformed_csv)
                
                # Determine response type based on request
                format_param = request.args.get('format', 'csv')
                
                if format_param == 'json':
                    # Parse the CSV and return as JSON for API usage
                    result_df = pd.read_csv(io.StringIO(transformed_csv))
                    json_data = result_df.to_json(orient='records')
                    return jsonify({
                        "success": True,
                        "message": "CSV transformed successfully",
                        "data": json_data,
                        "row_count": row_count,
                        "transformed_row_count": len(result_df)
                    })
                else:
                    # Return the transformed CSV as a downloadable file
                    return send_file(
                        io.BytesIO(transformed_csv.encode('utf-8')),
                        mimetype='text/csv',
                        as_attachment=True,
                        download_name=output_filename
                    )
                
            except Exception as e:
                return jsonify({"error": f"Error calling OpenAI API: {str(e)}"}), 500
                
        else:
            return jsonify({"error": "File must be a CSV"}), 400
            
    except Exception as e:
        return jsonify({"error": f"Server error: {str(e)}"}), 500
        
@app.route('/')
def index():
    """Simple HTML form for testing the CSV transformer"""
    return render_template('amazon_transform.html')

@app.errorhandler(404)
def not_found(error):
    """Return a custom 404 error."""
    return make_response(jsonify({'error': 'Not found'}), 404)

@app.errorhandler(500)
def server_error(error):
    """Return a custom 500 error."""
    return make_response(jsonify({'error': 'Server error'}), 500)

if __name__ == '__main__':
    # Create a templates directory if it doesn't exist
    if not os.path.exists('templates'):
        os.makedirs('templates')
    
    # Create a simple HTML form for testing
    with open('templates/amazon_transform.html', 'w') as f:
        f.write("""
        <!DOCTYPE html>
        <html>
        <head>
            <title>Amazon Inventory Loader Transformation</title>
            <style>
                body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
                h1 { color: #232f3e; }
                form { margin-top: 20px; padding: 20px; border: 1px solid #ddd; border-radius: 5px; }
                label { display: block; margin-bottom: 5px; font-weight: bold; }
                input[type="file"] { margin-bottom: 20px; }
                button { background-color: #ff9900; border: none; color: white; padding: 10px 20px; 
                        cursor: pointer; font-weight: bold; border-radius: 3px; }
                button:hover { background-color: #e88a00; }
                .info { background-color: #f8f8f8; padding: 15px; margin: 20px 0; border-radius: 5px; }
                .info h3 { margin-top: 0; }
                .description { color: #555; }
            </style>
        </head>
        <body>
            <h1>Amazon Inventory Loader Transformation Tool</h1>
            <div class="description">
                <p>Convert your product data to Amazon Inventory Loader format. Upload a CSV file with your product information, and our AI will transform it into the required format for Amazon Seller Central.</p>
            </div>
            
            <div class="info">
                <h3>How It Works</h3>
                <p>1. Upload your product CSV file</p>
                <p>2. Our AI analyzes your data structure</p>
                <p>3. We transform and map your fields to Amazon's required format</p>
                <p>4. Download the Amazon-ready inventory file</p>
            </div>
            
            <form action="/transform-to-amazon" method="post" enctype="multipart/form-data">
                <label for="file">Select your product CSV file:</label>
                <input type="file" name="file" id="file" accept=".csv" required>
                <button type="submit">Transform to Amazon Format</button>
            </form>
            
            <div class="info">
                <h3>Sample CSV Structure</h3>
                <p>Your CSV file should contain product data with columns like:</p>
                <p><code>product_id, title, description, price, inventory, category, brand, sku, etc.</code></p>
                <p>Don't worry if your columns don't match exactly - our AI will map them appropriately!</p>
            </div>
        </body>
        </html>
        """)
    
    # Run the Flask app
    app.run(host='0.0.0.0', port=int(os.environ.get('PORT', 8080)), debug=True)