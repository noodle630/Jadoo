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

# Define the Reebelo template columns
REEBELO_COLUMNS = [
    "sku", "brand", "model", "title", "description", "category", 
    "storage", "condition", "color", "price", "qty", "network", 
    "warranty_info", "product_type", "bundle_items", "accessories",
    "grade", "image_urls", "specifications", "features"
]

# Create Flask app
app = Flask(__name__)
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # Limit upload size to 16MB

# Create a temporary directory for uploads if it doesn't exist
UPLOAD_FOLDER = os.path.join(os.getcwd(), 'temp_uploads')
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

@app.route('/transform-to-reebelo', methods=['POST'])
def clean_csv():
    """
    API endpoint to clean CSV data and transform it to Reebelo marketplace format.
    
    This endpoint receives a CSV file upload, sends the content to OpenAI for cleaning
    and transformation, and returns the cleaned Reebelo-format CSV data as a response.
    """
    try:
        # Check if the post request has the file part
        if 'file' not in request.files:
            return jsonify({"error": "No file part"}), 400
        
        file = request.files['file']
        
        # If user does not select file, browser also submits an empty part without filename
        if file.filename is None or file.filename == '':
            return jsonify({"error": "No selected file"}), 400
            
        # Check if file is a CSV
        if not file.filename.lower().endswith('.csv'):
            return jsonify({"error": "File must be a CSV"}), 400
            
        # At this point we have a valid CSV file with a filename
        filename = secure_filename(str(file.filename))
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
            Target Reebelo columns: {', '.join(REEBELO_COLUMNS)}
            """
            
        except Exception as e:
            return jsonify({"error": f"Error parsing CSV: {str(e)}"}), 400
        
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
        
        try:
            # Call OpenAI API
            response = client.chat.completions.create(
                model="gpt-4o",  # the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
                messages=[
                    {"role": "system", "content": "You are a data transformation expert that converts product data to Reebelo marketplace format."},
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
            output_filename = f"reebelo_{filename}"
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
            
    except Exception as e:
        return jsonify({"error": f"Server error: {str(e)}"}), 500
        
@app.route('/')
def index():
    """Simple HTML form for testing the CSV transformer"""
    return render_template('reebelo_transform.html')

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
    with open('templates/reebelo_transform.html', 'w') as f:
        f.write("""
        <!DOCTYPE html>
        <html>
        <head>
            <title>Reebelo Marketplace Transformation</title>
            <style>
                body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
                h1 { color: #4052b5; }
                form { margin-top: 20px; padding: 20px; border: 1px solid #ddd; border-radius: 5px; }
                label { display: block; margin-bottom: 5px; font-weight: bold; }
                input[type="file"] { margin-bottom: 20px; }
                button { background-color: #4052b5; border: none; color: white; padding: 10px 20px; 
                        cursor: pointer; font-weight: bold; border-radius: 3px; }
                button:hover { background-color: #2e3b82; }
                .info { background-color: #f8f8f8; padding: 15px; margin: 20px 0; border-radius: 5px; }
                .info h3 { margin-top: 0; }
                .description { color: #555; }
            </style>
        </head>
        <body>
            <h1>Reebelo Marketplace Transformation Tool</h1>
            <div class="description">
                <p>Convert your product data to Reebelo marketplace format. Upload a CSV file with your product information, and our AI will transform it into the required format for Reebelo's platform.</p>
            </div>
            
            <div class="info">
                <h3>How It Works</h3>
                <p>1. Upload your product CSV file</p>
                <p>2. Our AI analyzes your data structure</p>
                <p>3. We transform and map your fields to Reebelo's required format</p>
                <p>4. Download the Reebelo-ready inventory file</p>
            </div>
            
            <form action="/transform-to-reebelo" method="post" enctype="multipart/form-data">
                <label for="file">Select your product CSV file:</label>
                <input type="file" name="file" id="file" accept=".csv" required>
                <button type="submit">Transform to Reebelo Format</button>
            </form>
            
            <div class="info">
                <h3>Sample CSV Structure</h3>
                <p>Your CSV file should contain product data with columns like:</p>
                <p><code>sku, brand, model, title, description, category, etc.</code></p>
                <p>Don't worry if your columns don't match exactly - our AI will map them appropriately!</p>
            </div>
        </body>
        </html>
        """)
    
    # Run the Flask app
    app.run(host='0.0.0.0', port=int(os.environ.get('PORT', 8081)), debug=True)