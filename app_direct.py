"""
Direct CSV transformation web application for testing the new 1:1 mapping approach.

This simplified app allows testing the direct transformation functionality
without complex routing or interfaces.
"""

import os
import io
from flask import Flask, request, render_template, jsonify, send_file, make_response
from werkzeug.utils import secure_filename
from dotenv import load_dotenv

# Import direct transformation modules
from direct_csv_transform import direct_transform_csv
from direct_amazon_transform import transform_to_amazon_format, AMAZON_COLUMNS

# Load environment variables
load_dotenv()

# Create Flask app
app = Flask(__name__)

# Configure upload folder
UPLOAD_FOLDER = os.path.join(os.getcwd(), 'temp_uploads')
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

# Simple HTML template for uploading files
HTML_TEMPLATE = """
<!DOCTYPE html>
<html>
<head>
    <title>Direct CSV Transformer</title>
    <style>
        body { 
            font-family: Arial, sans-serif; 
            max-width: 800px; 
            margin: 0 auto; 
            padding: 20px;
            line-height: 1.6;
            color: #333;
        }
        h1 { color: #2c3e50; }
        .container { margin-top: 30px; }
        form { 
            background: #f8f9fa; 
            padding: 20px; 
            border-radius: 5px;
            border: 1px solid #ddd;
        }
        label { display: block; margin-bottom: 10px; font-weight: bold; }
        select, input[type="file"] { 
            width: 100%; 
            padding: 8px;
            margin-bottom: 20px;
            border: 1px solid #ddd;
            border-radius: 4px;
        }
        input[type="submit"] {
            background: #3498db;
            color: white;
            border: none;
            padding: 10px 15px;
            border-radius: 4px;
            cursor: pointer;
        }
        input[type="submit"]:hover { background: #2980b9; }
        .info {
            background: #e8f4f8;
            padding: 15px;
            border-radius: 5px;
            margin-bottom: 20px;
        }
        .footer { 
            margin-top: 30px; 
            text-align: center;
            font-size: 14px;
            color: #7f8c8d;
        }
    </style>
</head>
<body>
    <h1>Direct CSV Transformer</h1>
    
    <div class="info">
        <p><strong>New Direct Transformation Engine</strong> - Ensures 1:1 row mapping between input and output files.</p>
        <p>This version maintains the exact number of rows from your source file, providing accurate transformations.</p>
    </div>
    
    <div class="container">
        <form action="/transform" method="post" enctype="multipart/form-data">
            <label for="marketplace">Select Target Marketplace:</label>
            <select name="marketplace" id="marketplace" required>
                <option value="amazon">Amazon Inventory Loader</option>
                <!-- Add more marketplaces as they become available -->
            </select>
            
            <label for="csv_file">Upload CSV File:</label>
            <input type="file" name="csv_file" id="csv_file" accept=".csv" required>
            
            <label for="max_rows">Maximum Rows to Process:</label>
            <select name="max_rows" id="max_rows">
                <option value="500">500 rows</option>
                <option value="1000" selected>1000 rows</option>
                <option value="2000">2000 rows</option>
                <option value="5000">5000 rows</option>
            </select>
            
            <input type="submit" value="Transform CSV">
        </form>
    </div>
    
    <div class="footer">
        <p>Direct CSV Transformer &copy; 2025</p>
    </div>
</body>
</html>
"""

@app.route('/')
def index():
    """Display the upload form"""
    return HTML_TEMPLATE

@app.route('/transform', methods=['POST'])
def transform_csv():
    """Handle CSV transformation"""
    try:
        # Check if file was uploaded
        if 'csv_file' not in request.files:
            return jsonify({"error": "No file uploaded"}), 400
        
        file = request.files['csv_file']
        if file.filename == '':
            return jsonify({"error": "No file selected"}), 400
        
        # Get the marketplace and max rows
        marketplace = request.form.get('marketplace', 'amazon')
        max_rows = int(request.form.get('max_rows', 1000))
        
        # Save the file temporarily
        filename = secure_filename(file.filename)
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(filepath)
        
        # Process the file based on the marketplace
        if marketplace == 'amazon':
            result = transform_to_amazon_format(filepath, max_rows=max_rows)
        else:
            return jsonify({"error": f"Marketplace '{marketplace}' not implemented yet"}), 400
        
        # Check for error
        if "error" in result:
            return jsonify({"error": result["error"]}), 400
        
        # Return the transformed file
        output_file = result["output_file"]
        
        return send_file(
            output_file,
            mimetype='text/csv',
            as_attachment=True,
            download_name=os.path.basename(output_file)
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
    app.run(host='0.0.0.0', port=5001, debug=True)