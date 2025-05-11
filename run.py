"""
Main entry point for Product Feed Transformer application
"""
import os
from app_unified import app

if __name__ == "__main__":
    # Get port from environment or default to 8080 (Replit standard port)
    port = int(os.environ.get("PORT", 8080))
    
    # Run app
    app.run(host="0.0.0.0", port=port, debug=True)