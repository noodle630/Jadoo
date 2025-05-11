#!/bin/bash

# Create the templates directory if it doesn't exist
mkdir -p templates

# Kill any existing Flask processes
if [ -f flask_reebelo.pid ]; then
  kill -9 $(cat flask_reebelo.pid) 2>/dev/null || true
  rm flask_reebelo.pid
fi

# Run the Flask app in the background
python app_reebelo.py & echo $! > flask_reebelo.pid

echo "Reebelo transformation app is running"
echo "Visit http://localhost:8081 or the Replit web preview to access it"