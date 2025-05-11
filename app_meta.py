import os
import io
import pandas as pd
from flask import Flask, request, jsonify, render_template, send_file
from werkzeug.utils import secure_filename
from openai import OpenAI
from dotenv import load_dotenv
from transform_to_meta import transform_to_meta_format

# Load environment variables from .env file
load_dotenv()

# Get the OpenAI API key from environment variables
api_key = os.getenv("OPENAI_API_KEY")
if not api_key:
    raise ValueError("OPENAI_API_KEY environment variable not set")

# Initialize OpenAI client
client = OpenAI(api_key=api_key)

# Create Flask app
app = Flask(__name__)
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # Limit upload size to 16MB

# Configure upload folder
UPLOAD_FOLDER = 'temp_uploads'
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

# API endpoints
@app.route('/')
def index():
    """Simple HTML form for testing the CSV transformer"""
    return render_template('meta_form.html')

@app.route('/clean-csv', methods=['POST'])
def clean_csv():
    """
    API endpoint to clean CSV data and transform it to Meta (Facebook) product catalog format.
    
    This endpoint receives a CSV file upload, sends the content to OpenAI for cleaning
    and transformation, and returns the cleaned Meta-format CSV data as a response.
    """
    if 'file' not in request.files:
        return jsonify({"error": "No file part"}), 400
        
    file = request.files['file']
    if file.filename == '':
        return jsonify({"error": "No selected file"}), 400
        
    if file and file.filename.endswith('.csv'):
        # Save the uploaded file
        filename = secure_filename(file.filename)
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(filepath)
        
        try:
            # Transform the CSV to Meta format
            output_path = transform_to_meta_format(filepath)
            
            if output_path and os.path.exists(output_path):
                # Return the transformed file
                return send_file(
                    output_path,
                    mimetype='text/csv',
                    as_attachment=True,
                    download_name=os.path.basename(output_path)
                )
            else:
                return jsonify({"error": "Failed to transform CSV"}), 500
                
        except Exception as e:
            return jsonify({"error": str(e)}), 500
    else:
        return jsonify({"error": "Invalid file format. Please upload a CSV file."}), 400

# Error handlers
@app.errorhandler(404)
def not_found(error):
    """Return a custom 404 error."""
    return jsonify({"error": "Not found"}), 404

@app.errorhandler(500)
def server_error(error):
    """Return a custom 500 error."""
    return jsonify({"error": "Server error"}), 500

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 8005))
    app.run(host='0.0.0.0', port=port, debug=True)