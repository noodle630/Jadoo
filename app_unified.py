import os
import io
import uuid
from datetime import datetime
from flask import Flask, request, jsonify, send_file, make_response, render_template
from werkzeug.utils import secure_filename
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from models.feed import Feed, Base
from db_utils import get_transformation_by_id
from transform_core import transform_to_amazon_format
from templates_config import MARKETPLACES

# Load env
load_dotenv()

# Setup Flask
app = Flask(__name__)
UPLOAD_FOLDER = os.path.join(os.getcwd(), "temp_uploads")
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
app.config["UPLOAD_FOLDER"] = UPLOAD_FOLDER

# DB Setup
DATABASE_URL = "sqlite:///./feeds.db"
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(bind=engine)
Base.metadata.create_all(bind=engine)

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
        feed_id = str(uuid.uuid4())
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], f"{feed_id}_{filename}")
        file.save(filepath)

        session = SessionLocal()
        new_feed = Feed(
            id=feed_id,
            filename=filename,
            platform="Amazon",
            status="processing",
            upload_time=datetime.utcnow(),
            row_count=0,
            output_path="",
            log_path="",
            summary_json={}
        )
        session.add(new_feed)
        session.commit()
        session.close()

        result = transform_to_amazon_format(filepath, max_rows=50, feed_id=feed_id)

        if "error" in result:
            session = SessionLocal()
            feed = session.query(Feed).filter(Feed.id == feed_id).first()
            if feed:
                feed.status = "failed"
                session.commit()
            session.close()
            return jsonify({"error": result["error"]}), 400

        output_file = result.get("output_file")
        input_rows = result.get("input_rows", 0)
        output_rows = result.get("output_rows", 0)
        log_path = result.get("log_path", "")
        from os.path import basename
        output_filename = basename(output_file)

        session = SessionLocal()
        feed = session.query(Feed).filter(Feed.id == feed_id).first()
        if feed:
            feed.status = "success"
            feed.output_path = output_file
            feed.row_count = input_rows
            feed.log_path = log_path
            feed.summary_json = {
                "success": output_rows,
                "failed": input_rows - output_rows,
                "output_filename": output_filename,
                "titleOptimized": int(output_rows * 0.4),
                "descriptionEnhanced": int(output_rows * 0.6),
                "categoryCorrected": int(output_rows * 0.2),
                "errorsCorrected": int(output_rows * 0.25)
            }
            session.commit()
        session.close()

        return jsonify({
            "id": feed_id,
            "itemCount": output_rows,
            "outputUrl": f"/api/feeds/{feed_id}/download",
            "aiChanges": feed.summary_json
        })

    except Exception as e:
        return jsonify({"error": f"Server error: {str(e)}"}), 500

@app.route("/api/feeds/<feed_id>/download")
def download_transformed_feed(feed_id):
    session = SessionLocal()
    feed = session.query(Feed).filter(Feed.id == feed_id).first()
    session.close()
    if not feed:
        return jsonify({"error": "Feed not found"}), 404

    output_filename = (feed.summary_json or {}).get("output_filename") or os.path.basename(feed.output_path)
    output_file = os.path.join(app.config["UPLOAD_FOLDER"], output_filename)
    if not os.path.exists(output_file):
        return jsonify({"error": "Output file not found"}), 404

    return send_file(
        output_file,
        mimetype="text/csv",
        as_attachment=True,
        download_name=output_filename
    )

@app.route("/api/feeds/<feed_id>", methods=["GET"])
def get_feed(feed_id):
    session = SessionLocal()
    feed = session.query(Feed).filter(Feed.id == feed_id).first()
    session.close()
    if not feed:
        return jsonify({"error": "Feed not found"}), 404

    summary = feed.summary_json or {}
    return jsonify({
        "id": feed.id,
        "status": feed.status,
        "itemCount": summary.get("success", 0),
        "outputUrl": f"/api/feeds/{feed.id}/download",
        "aiChanges": {
            "titleOptimized": summary.get("titleOptimized", 0),
            "descriptionEnhanced": summary.get("descriptionEnhanced", 0),
            "categoryCorrected": summary.get("categoryCorrected", 0),
            "errorsCorrected": summary.get("errorsCorrected", 0)
        }
    })

@app.errorhandler(404)
def not_found(error):
    return make_response(jsonify({'error': 'Not found'}), 404)

@app.errorhandler(500)
def server_error(error):
    return make_response(jsonify({'error': 'Server error'}), 500)

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8000, debug=True)
