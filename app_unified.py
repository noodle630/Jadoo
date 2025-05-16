import os
import io
from flask import Flask, request, jsonify, send_file, make_response, render_template
from werkzeug.utils import secure_filename
from dotenv import load_dotenv
from db_utils import record_transformation, get_transformation_by_id, get_recent_transformations
from smart_transform import transform_to_amazon_format
from templates_config import MARKETPLACES

# Load environment variables
load_dotenv()

# Debug key print
print("DEBUG API KEY:", os.getenv("OPENAI_API_KEY"))

# Flask app setup
app = Flask(__name__)
UPLOAD_FOLDER = os.path.join(os.getcwd(), "temp_uploads")
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
app.config["UPLOAD_FOLDER"] = UPLOAD_FOLDER

@app.route("/")
def index():
    return render_template("marketplace_selector.html", marketplaces=MARKETPLACES, current_year=2025)

@app.route("/feeds/<int:feed_id>")
def view_feed(feed_id):
    feed = get_transformation_by_id(feed_id)
    if not feed:
        return jsonify({"error": "Feed not found"}), 404
    return render_template("feed_results.html", feed=feed)

@app.route("/api/simple-upload", methods=["POST"])
def simple_upload():
    try:
        if 'file' not in request.files:
            return jsonify({"error": "No file uploaded"}), 400

        file = request.files['file']
        if file.filename == '':
            return jsonify({"error": "No file selected"}), 400

        filename = secure_filename(file.filename)
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(filepath)

        # Default to Amazon for now
        result = transform_to_amazon_format(filepath, max_rows=50)
        if "error" in result:
            return jsonify({"error": result["error"]}), 400

        output_file = result["output_file"]
        feed_id = record_transformation(
            marketplace_name="amazon",
            source_filename=filename,
            output_filename=os.path.basename(output_file),
            source_row_count=result.get("input_rows",0),
            output_row_count=result.get("output_rows",0),
            transformation_time=result.get("processing_time",0)
        )

        return jsonify({"id": feed_id})

    except Exception as e:
        return jsonify({"error": f"Server error: {str(e)}"}), 500

@app.route("/api/feeds/<int:feed_id>/download")
def download_transformed_feed(feed_id):
    feed = get_transformation_by_id(feed_id)
    if not feed:
        return jsonify({"error": "Feed not found"}), 404

    output_file = os.path.join(app.config["UPLOAD_FOLDER"], feed["output_filename"])
    if not os.path.exists(output_file):
        return jsonify({"error": "Output file not found"}), 404

    return send_file(
        output_file,
        mimetype="text/csv",
        as_attachment=True,
        download_name=feed["output_filename"]
    )

@app.route('/marketplace/<marketplace_key>')
def marketplace_form(marketplace_key):
    if marketplace_key not in MARKETPLACES:
        return jsonify({"error": "Invalid marketplace"}), 400

    marketplace = MARKETPLACES[marketplace_key]
    template_name = f"{marketplace_key}_form.html"
    return render_template(template_name, marketplace=marketplace, marketplace_key=marketplace_key)



@app.errorhandler(404)
def not_found(error):
    return make_response(jsonify({'error': 'Not found'}), 404)

@app.errorhandler(500)
def server_error(error):
    return make_response(jsonify({'error': 'Server error'}), 500)

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8000, debug=True)
