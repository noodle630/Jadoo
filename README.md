# Project "S": AI-Powered Product Feed Manager

Project "S" is an AI-native application that transforms messy vendor product data into clean, marketplace-ready product feeds using OpenAI's GPT models.

## Project Overview

This project aims to be a lightweight, AI-first alternative to enterprise feed management platforms. It enables vendors to:

1. Upload raw inventory data (CSVs or API feeds)
2. Automatically clean, standardize, and transform data
3. Generate marketplace-ready product feeds
4. (Coming soon) Push data directly to marketplace seller accounts

## Key Features

- **AI-powered data cleaning**: Uses GPT models to intelligently parse and fix messy data
- **Marketplace-specific transformations**: Currently supports Amazon Inventory Loader format
- **Multiple interfaces**: Web UI, API endpoints, and command-line tools
- **Data validation**: Identifies and fixes common data issues

## Getting Started

### Prerequisites

- Python 3.8+
- OpenAI API key
- Flask (for web interface)

### Installation

1. Clone this repository
2. Install required packages:
   ```
   pip install -r requirements.txt
   ```
3. Set your OpenAI API key:
   ```
   export OPENAI_API_KEY="your-api-key"
   ```

### Usage

#### Web Interface

Run the Amazon transformation web interface:

```bash
./run_amazon.sh
```

Then open your browser to http://localhost:8080

#### Command Line

Transform a CSV file to Amazon format:

```bash
python transform_to_amazon.py your_products.csv
```

#### API Endpoints

POST to `/transform-to-amazon` with a CSV file in the `file` field.

## Project Structure

- `app.py` - Basic Flask application for CSV cleaning
- `app_amazon.py` - Flask app for Amazon Inventory Loader transformations
- `transform_to_amazon.py` - Command-line tool for Amazon transformations
- `clean_csv.py` - Core functionality for CSV cleaning with OpenAI
- `templates/` - HTML templates for web interfaces

## Marketplaces Supported

- **Amazon** - Inventory Loader Format (Electronics)
- Walmart (Coming soon)
- Meta/Facebook (Coming soon)
- TikTok (Coming soon)
- Reebelo (Coming soon)

## How It Works

1. **Data Ingestion**: Upload a CSV file or connect to an API endpoint
2. **Analysis**: Parse data structure, identify issues, extract sample
3. **AI Processing**: Send to OpenAI API with custom prompt templates
4. **Transformation**: Map fields to marketplace requirements
5. **Validation**: Check for required fields and format compliance
6. **Export**: Generate marketplace-ready CSV or JSON

## Command Line Options

```
python transform_to_amazon.py [file] [options]

Options:
  --output, -o   Output file name
  --verbose, -v  Show sample of transformed data
```

## API Reference

### POST /transform-to-amazon

Transform CSV to Amazon format

**Request Parameters:**
- `file`: CSV file upload
- `format`: Response format (`csv` or `json`)

**Response:**
- CSV file download (default)
- JSON structure with transformed data (if format=json)

## Development

This project is currently in active development. Upcoming features:

- Support for additional marketplaces
- User authentication
- Template storage and reuse
- Direct marketplace integration
- Data visualization and analytics

## License

[MIT License](LICENSE)

## Acknowledgments

- OpenAI for their powerful GPT models
- Marketplace documentation from Amazon, Walmart, etc.