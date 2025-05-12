"""
Smart CSV Transformation Web Application

This web application uses the smart_transform.py module to provide a user interface
for transforming CSV files to various marketplace formats while ensuring 1:1 row mapping.
"""

import os
import pandas as pd
from flask import Flask, request, render_template, jsonify, send_file, make_response
from werkzeug.utils import secure_filename
from dotenv import load_dotenv

# Import smart transformation modules
from smart_transform import transform_to_amazon_format, transform_to_walmart_format

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
    <title>Smart CSV Transformer</title>
    <style>
        body { 
            font-family: Arial, sans-serif; 
            max-width: 800px; 
            margin: 0 auto; 
            padding: 20px;
            line-height: 1.6;
            color: #333;
            background-color: #f5f5f5;
        }
        h1 { 
            color: #2c3e50; 
            text-align: center;
            margin-bottom: 30px;
        }
        .container { margin-top: 30px; }
        form { 
            background: #fff; 
            padding: 25px; 
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        }
        label { 
            display: block; 
            margin-bottom: 10px; 
            font-weight: bold;
            color: #555;
        }
        select, input[type="file"] { 
            width: 100%; 
            padding: 10px;
            margin-bottom: 20px;
            border: 1px solid #ddd;
            border-radius: 4px;
            background-color: #f9f9f9;
        }
        input[type="submit"] {
            background: #3498db;
            color: white;
            border: none;
            padding: 12px 20px;
            border-radius: 4px;
            cursor: pointer;
            width: 100%;
            font-size: 16px;
            font-weight: bold;
            transition: background 0.3s;
        }
        input[type="submit"]:hover { background: #2980b9; }
        .info {
            background: #e8f4f8;
            padding: 15px;
            border-radius: 8px;
            margin-bottom: 20px;
            border-left: 5px solid #3498db;
        }
        .footer { 
            margin-top: 40px; 
            text-align: center;
            font-size: 14px;
            color: #7f8c8d;
            padding-top: 20px;
            border-top: 1px solid #eee;
        }
        .marketplace-select {
            display: flex;
            gap: 15px;
            margin-bottom: 20px;
        }
        .marketplace-option {
            flex: 1;
            border: 2px solid #ddd;
            border-radius: 8px;
            padding: 15px;
            text-align: center;
            cursor: pointer;
            transition: all 0.3s;
        }
        .marketplace-option:hover {
            border-color: #3498db;
            background-color: #f0f7fb;
        }
        .marketplace-option.selected {
            border-color: #3498db;
            background-color: #edf7fd;
        }
        .marketplace-option img {
            max-width: 80px;
            height: auto;
            margin-bottom: 10px;
        }
        .marketplace-name {
            font-weight: bold;
            margin-bottom: 5px;
        }
        .stats {
            background: #f8f9fa;
            padding: 15px;
            border-radius: 8px;
            margin-top: 30px;
            font-size: 14px;
        }
        .note {
            font-size: 13px;
            color: #666;
            margin-top: 5px;
        }
    </style>
</head>
<body>
    <h1>Smart CSV Transformer</h1>
    
    <div class="info">
        <p><strong>NEW: Guaranteed 1:1 Row Mapping</strong> - This enhanced version maintains a perfect 1:1 mapping between input and output files.</p>
        <p>Upload your source data and transform it to marketplace-ready formats while preserving every row and SKU.</p>
    </div>
    
    <div class="container">
        <form action="/transform" method="post" enctype="multipart/form-data">
            <label for="marketplace">Select Target Marketplace:</label>
            
            <div class="marketplace-select">
                <div class="marketplace-option" onclick="selectMarketplace('amazon', this)">
                    <div class="marketplace-name">Amazon</div>
                    <div>Inventory Loader Format</div>
                </div>
                <div class="marketplace-option" onclick="selectMarketplace('walmart', this)">
                    <div class="marketplace-name">Walmart</div>
                    <div>Marketplace Format</div>
                </div>
            </div>
            <input type="hidden" name="marketplace" id="marketplace" value="amazon">
            
            <label for="csv_file">Upload CSV File:</label>
            <input type="file" name="csv_file" id="csv_file" accept=".csv" required>
            <p class="note">Maximum file size: 5MB. CSV files only.</p>
            
            <label for="max_rows">Maximum Rows to Process:</label>
            <select name="max_rows" id="max_rows">
                <option value="100">100 rows (fastest)</option>
                <option value="500">500 rows</option>
                <option value="1000" selected>1000 rows (recommended)</option>
                <option value="2000">2000 rows</option>
                <option value="5000">5000 rows (slower)</option>
            </select>
            
            <input type="submit" value="Transform CSV">
        </form>
        
        <div class="stats">
            <p><strong>How it works:</strong></p>
            <ul>
                <li>Your file is analyzed by AI to understand the data structure</li>
                <li>A custom transformation plan is created for your specific data</li>
                <li>Each row is individually processed to maintain 1:1 mapping</li>
                <li>Key fields are enhanced to meet marketplace requirements</li>
                <li>The output maintains all original SKUs and products</li>
            </ul>
        </div>
    </div>
    
    <div class="footer">
        <p>Smart CSV Transformer &copy; 2025 - Preserving data integrity with every transformation</p>
    </div>

    <script>
        function selectMarketplace(value, element) {
            // Clear all selected classes
            document.querySelectorAll('.marketplace-option').forEach(el => {
                el.classList.remove('selected');
            });
            
            // Add selected class to clicked element
            element.classList.add('selected');
            
            // Set the hidden input value
            document.getElementById('marketplace').value = value;
        }
        
        // Select Amazon by default on page load
        document.addEventListener('DOMContentLoaded', function() {
            document.querySelector('.marketplace-option').classList.add('selected');
        });
    </script>
</body>
</html>
"""

@app.route('/')
def index():
    """Display the upload form"""
    return HTML_TEMPLATE

@app.route('/transform', methods=['POST'])
def transform_csv():
    """Handle CSV transformation with 1:1 row mapping"""
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
        if file.filename:
            filename = secure_filename(file.filename)
            filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
            file.save(filepath)
        else:
            return jsonify({"error": "Invalid filename"}), 400
        
        # Process the file based on the marketplace
        if marketplace == 'amazon':
            result = transform_to_amazon_format(filepath, max_rows=max_rows)
        elif marketplace == 'walmart':
            result = transform_to_walmart_format(filepath, max_rows=max_rows)
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
    print("Starting Smart CSV Transformer on port 5002...")
    print("This enhanced version guarantees 1:1 row mapping between input and output files.")
    print("===========================================================================")
    app.run(host='0.0.0.0', port=5002, debug=True)