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
if [ -f flask_catch.pid ]; then
  kill -9 $(cat flask_catch.pid) 2>/dev/null || true
  rm flask_catch.pid
fi
if [ -f flask_meta.pid ]; then
  kill -9 $(cat flask_meta.pid) 2>/dev/null || true
  rm flask_meta.pid
fi
if [ -f flask_tiktok.pid ]; then
  kill -9 $(cat flask_tiktok.pid) 2>/dev/null || true
  rm flask_tiktok.pid
fi

# Function to display menu and get user selection
show_menu() {
  echo "===== Product Feed Transformation Tool ====="
  echo "Select a marketplace transformation to run:"
  echo "1) Amazon Inventory Loader (port 8080)"
  echo "2) Reebelo Marketplace (port 8081)"
  echo "3) Walmart Marketplace (port 8082)"
  echo "4) Catch Marketplace (port 8083)"
  echo "5) Meta (Facebook) Product Catalog (port 8084)"
  echo "6) TikTok Shopping Catalog (port 8085)"
  echo "7) Run All"
  echo "8) Quit"
  echo -n "Enter your choice (1-8): "
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

# Function to run Catch transformation
run_catch() {
  echo "Starting Catch marketplace transformation app..."
  python app_catch.py & echo $! > flask_catch.pid
  echo "Catch app is running on http://localhost:8083"
}

# Function to run Meta transformation
run_meta() {
  echo "Starting Meta (Facebook) product catalog transformation app..."
  python app_meta.py & echo $! > flask_meta.pid
  echo "Meta app is running on http://localhost:8084"
}

# Function to run TikTok transformation
run_tiktok() {
  echo "Starting TikTok shopping catalog transformation app..."
  python app_tiktok.py & echo $! > flask_tiktok.pid
  echo "TikTok app is running on http://localhost:8085"
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
    run_catch
    ;;
  5)
    run_meta
    ;;
  6)
    run_tiktok
    ;;
  7)
    run_amazon
    run_reebelo
    run_walmart
    run_catch
    run_meta
    run_tiktok
    echo "All transformation apps are running!"
    ;;
  8)
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