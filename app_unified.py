# File: app_unified.py
import os
import csv
import uuid
import json
from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
from werkzeug.utils import secure_filename
from dotenv import load_dotenv
from REMOVED_SECRETimport create_client, Client
from server.utils.transformer import transformCSVWithOpenAI
import traceback


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

        row_count = sum(1 for row in csv.reader(open(filepath, encoding="utf-8"))) - 1

        marketplace = request.form.get("marketplace")
        category = request.form.get("category") or "unknown"

        feed = {
            "id": uid,
            "filename": new_filename,
            "platform": marketplace,
            "category": category,
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
        feed_resp = supabase.table("feeds").select("*").eq("id", feed_id).single().execute()
        if not feed_resp.data:
            return jsonify({"error": "Feed not found"}), 404

        feed = feed_resp.data
        original_path = feed["input_path"]
        marketplace = feed["platform"]
        category = feed.get("category", "unknown")

        output_path = transformCSVWithOpenAI(original_path, marketplace, category)

        supabase.table("feeds").update({
            "status": "completed",
            "output_path": output_path,
            "row_count": feed["row_count"],
            "summary_json": {}
        }).eq("id", feed_id).execute()

        return jsonify({
            "message": "Feed processed successfully",
            "outputPath": output_path,
            "marketplace": marketplace,
            "category": category,
            "id": feed_id,
            "itemCount": feed["row_count"],
            "aiChanges": {
                "titleOptimized": 0,
                "descriptionEnhanced": 0,
                "categoryCorrected": 0,
                "errorsCorrected": 0,
                "emptyRows": 0,
                "filledRows": feed["row_count"]
            }
        })

    except Exception as e:
        print(f"[PROCESS ERROR] {str(e)}")
        supabase.table("feeds").update({"status": "failed"}).eq("id", feed_id).execute()
        return jsonify({"error": "Processing failed", "details": str(e)}), 500

@app.route("/api/feeds/<feed_id>", methods=["GET"])
def get_feed(feed_id):
    try:
        print(f"[FEED POLL] Getting feed: {feed_id}")
        result = supabase.table("feeds").select("*").eq("id", feed_id).single().execute()

        if not result.data:
            return jsonify({"error": "Feed not found"}), 404

        return jsonify(result.data), 200

    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({
            "error": "Unexpected server error",
            "details": str(e)
        }), 500


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
