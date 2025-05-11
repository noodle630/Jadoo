#!/bin/bash

# Create the templates directory if it doesn't exist
mkdir -p templates

# Kill any existing Flask processes
if [ -f flask_walmart.pid ]; then
  kill -9 $(cat flask_walmart.pid) 2>/dev/null || true
  rm flask_walmart.pid
fi

# Run the Flask app in the background
python app_walmart.py & echo $! > flask_walmart.pid

echo "Walmart transformation app is running"
echo "Visit http://localhost:8082 or the Replit web preview to access it"