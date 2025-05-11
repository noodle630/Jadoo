#!/bin/bash

# Create the templates directory if it doesn't exist
mkdir -p templates

# Kill any existing Flask processes
if [ -f flask.pid ]; then
  kill -9 $(cat flask.pid) 2>/dev/null || true
  rm flask.pid
fi
if [ -f flask_reebelo.pid ]; then
  kill -9 $(cat flask_reebelo.pid) 2>/dev/null || true
  rm flask_reebelo.pid
fi
if [ -f flask_walmart.pid ]; then
  kill -9 $(cat flask_walmart.pid) 2>/dev/null || true
  rm flask_walmart.pid
fi

# Function to display menu and get user selection
show_menu() {
  echo "===== Product Feed Transformation Tool ====="
  echo "Select a marketplace transformation to run:"
  echo "1) Amazon Inventory Loader (port 8080)"
  echo "2) Reebelo Marketplace (port 8081)"
  echo "3) Walmart Marketplace (port 8082)"
  echo "4) Run All"
  echo "5) Quit"
  echo -n "Enter your choice (1-5): "
}

# Function to run Amazon transformation
run_amazon() {
  echo "Starting Amazon Inventory Loader transformation app..."
  python app_amazon.py & echo $! > flask.pid
  echo "Amazon app is running on http://localhost:8080"
}

# Function to run Reebelo transformation
run_reebelo() {
  echo "Starting Reebelo marketplace transformation app..."
  python app_reebelo.py & echo $! > flask_reebelo.pid
  echo "Reebelo app is running on http://localhost:8081"
}

# Function to run Walmart transformation
run_walmart() {
  echo "Starting Walmart marketplace transformation app..."
  python app_walmart.py & echo $! > flask_walmart.pid
  echo "Walmart app is running on http://localhost:8082"
}

# Display menu and handle user input
show_menu
read choice

case $choice in
  1)
    run_amazon
    ;;
  2)
    run_reebelo
    ;;
  3)
    run_walmart
    ;;
  4)
    run_amazon
    run_reebelo
    run_walmart
    echo "All transformation apps are running!"
    ;;
  5)
    echo "Exiting..."
    exit 0
    ;;
  *)
    echo "Invalid choice. Please run the script again."
    exit 1
    ;;
esac

echo "Visit the Replit web preview to access the app(s)"
echo "When you're done, run 'pkill -f python' to stop all apps"