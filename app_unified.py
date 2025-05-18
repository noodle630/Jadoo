# Fully integrated backend: app_unified.py
import os
import csv
import uuid
import json
from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
from werkzeug.utils import secure_filename
from dotenv import load_dotenv
from REMOVED_SECRETimport create_client, Client
from utils.transformer import transform_csv_with_openai

# Load environment variables
load_dotenv()
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

UPLOAD_FOLDER = "temp_uploads"
ALLOWED_EXTENSIONS = {"csv"}

app = Flask(__name__)
app.config["UPLOAD_FOLDER"] = UPLOAD_FOLDER
CORS(app)

os.makedirs(UPLOAD_FOLDER, exist_ok=True)

def allowed_file(filename):
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS

@app.route("/api/feeds/upload", methods=["POST"])
def upload_file():
    if "file" not in request.files:
        return jsonify({"error": "No file part"}), 400
    file = request.files["file"]
    if file.filename == "":
        return jsonify({"error": "No selected file"}), 400
    if file and allowed_file(file.filename):
        filename = secure_filename(file.filename)
        uid = str(uuid.uuid4())
        new_filename = f"{uid}_{filename}"
        filepath = os.path.join(app.config["UPLOAD_FOLDER"], new_filename)
        file.save(filepath)

        # Count rows
        with open(filepath, newline="", encoding="utf-8") as csvfile:
            row_count = sum(1 for row in csv.reader(csvfile)) - 1

        # Create record in Supabase
        feed = {
            "id": uid,
            "filename": new_filename,
            "platform": request.form.get("marketplace", "unknown"),
            "status": "uploaded",
            "upload_time": "now()",
            "row_count": row_count,
            "input_path": filepath,
            "output_path": "",
            "log_path": "",
            "summary_json": {}
        }
        supabase.table("feeds").insert(feed).execute()

        return jsonify({"message": "Feed created successfully", "id": uid}), 201
    return jsonify({"error": "File type not allowed"}), 400

@app.route("/api/feeds/<feed_id>/process", methods=["POST"])
def process_feed(feed_id):
    try:
        # Fetch the feed metadata from Supabase
        feed_resp = supabase.table("feeds").select("*").eq("id", feed_id).single().execute()
        if not feed_resp.data:
            return jsonify({"error": "Feed not found"}), 404

        feed = feed_resp.data
        original_path = feed["input_path"]
        platform = feed["platform"]

        # Run transformation
        result = transform_csv_with_openai(original_path, platform)
        output_path = result["output_path"]
        row_count = result.get("row_count", 0)
        log_path = result.get("log_path", "")
        summary = result.get("summary", {})

        # Update Supabase
        supabase.table("feeds").update({
            "status": "completed",
            "output_path": output_path,
            "log_path": log_path,
            "row_count": row_count,
            "summary_json": summary
        }).eq("id", feed_id).execute()

        return jsonify({
            "message": "Feed processed successfully",
            "rowCount": row_count,
            "outputPath": output_path,
            "logPath": log_path,
            "summary": summary
        })

    except Exception as e:
        print(f"[PROCESS ERROR] {str(e)}")
        supabase.table("feeds").update({"status": "failed"}).eq("id", feed_id).execute()
        return jsonify({"error": "Processing failed", "details": str(e)}), 500

@app.route("/api/feeds/<feed_id>", methods=["GET"])
def get_feed(feed_id):
    result = supabase.table("feeds").select("*").eq("id", feed_id).execute()
    if not result.data:
        return jsonify({"error": "Feed not found"}), 404
    return jsonify(result.data[0])

@app.route("/api/feeds/<feed_id>/download", methods=["GET"])
def download_feed(feed_id):
    result = supabase.table("feeds").select("output_path").eq("id", feed_id).single().execute()
    if not result.data:
        return jsonify({"error": "Feed not found"}), 404
    output_path = result.data["output_path"]
    try:
        return send_file(output_path, as_attachment=True)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    app.run(debug=True)
