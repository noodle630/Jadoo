#!/bin/bash

# Create the templates directory if it doesn't exist
mkdir -p templates

# Kill any existing Flask processes
if [ -f flask.pid ]; then
  kill -9 $(cat flask.pid) 2>/dev/null || true
  rm flask.pid
fi

# Run the Flask app in the background
python app_amazon.py & echo $! > flask.pid

echo "Amazon Inventory Loader transformation app is running"
echo "Visit http://localhost:8080 or the Replit web preview to access it"