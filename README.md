# Project "S": AI-Powered Product Feed Manager

Project "S" is an AI-native application that transforms messy vendor product data into clean, marketplace-ready product feeds using OpenAI's GPT models.

---

## Project Overview

This project aims to be a lightweight, AI-first alternative to enterprise feed management platforms. It enables vendors to:

- Upload raw inventory data (CSVs or API feeds)
- Automatically clean, standardize, and transform data
- Generate marketplace-ready product feeds
- (Coming soon) Push data directly to marketplace seller accounts

---

## Key Features

- **AI-powered data cleaning:** Uses GPT models to intelligently parse and fix messy data
- **Marketplace-specific transformations:** Currently supports Amazon Inventory Loader format, with templates for Walmart, Meta, TikTok, Catch, and Reebelo
- **Multiple interfaces:** Web UI, API endpoints, and command-line tools
- **Data validation:** Identifies and fixes common data issues

---

## 🚀 Roadmap & Development Priorities

### Immediate Focus

1. **Bulletproof Core Flow**
   - User uploads a CSV with X rows → file is parsed → OpenAI runs on each row and adds/updates data → output file has the same number of rows.
   - No data loss. Fail-proof. Always 1:1 input to output. This is the foundation the rest of the product depends on.

2. **Optimize OpenAI Transformation Logic**
   - Use product name, price, and quantity (SKU if available) as the base for GPT to intelligently generate all required marketplace columns.
   - Guarantee a fully populated output row for each platform, maintaining 1:1 structure.

3. **Improve Data Completeness**
   - Iterate on improving how complete and accurate each row’s output columns are (brand, color, title, condition, etc.).

#### In Parallel

- Hardcode Reebelo templates for each category.
- Manually map expected output columns for each platform (Amazon, TikTok, Meta, Walmart, etc.) by scraping docs/templates.
- Establish a ground truth per marketplace so GPT can fill the right fields.

#### Next (Soon, but Not Blocking)

4. **Fix Auth**
   - Replace Replit’s Google OAuth (which breaks in Codespaces) with a more portable solution.

5. **Basic UI Cleanup**
   - Polish the file flow UI for demo readiness. Navigation tabs (“Products,” “Dashboard,” “Integrations”) can come later.

#### Later

6. **Better Data Enrichment**
   - Revisit all columns and improve their quality for SEO, compliance, and conversion.

7. **Deeper App UX Integration**
   - Cleaner flow, multi-user logic, saved templates, etc.

8. **Marketplace API Integration**
   - Connect to vendor accounts (Amazon MWS, Reebelo APIs, etc.) and push products directly.

**Guiding Principles:**  
- Keep a working version of the app live at every phase.  
- Maintain a usable UI (can reuse what Replit built).  
- Optimize for feedback, not perfection.

---

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

---

## Usage

### Web Interface

Run the Amazon transformation web interface:

```
./run_amazon.sh
```
Then open your browser to http://localhost:8080

### Command Line

Transform a CSV file to Amazon format:

```
python transform_to_amazon.py your_products.csv
```

---

## API Endpoints

POST to `/transform-to-amazon` with a CSV file in the `file` field.

---

## Project Structure

- `app.py` - Basic Flask application for CSV cleaning
- `app_amazon.py` - Flask app for Amazon Inventory Loader transformations
- `transform_to_amazon.py` - Command-line tool for Amazon transformations
- `clean_csv.py` - Core functionality for CSV cleaning with OpenAI
- `templates/` - HTML templates for web interfaces

---

## Marketplaces Supported

- **Amazon** - Inventory Loader Format (Electronics)
- **Walmart** (Coming soon)
- **Meta/Facebook** (Coming soon)
- **TikTok** (Coming soon)
- **Catch** (Coming soon)
- **Reebelo** (Coming soon)

---

## How It Works

1. **Data Ingestion:** Upload a CSV file or connect to an API endpoint
2. **Analysis:** Parse data structure, identify issues, extract sample
3. **AI Processing:** Send to OpenAI API with custom prompt templates
4. **Transformation:** Map fields to marketplace requirements
5. **Validation:** Check for required fields and format compliance
6. **Export:** Generate marketplace-ready CSV or JSON

---

## Command Line Options

```
python transform_to_amazon.py [file] [options]
```

Options:
- `--output, -o`   Output file name
- `--verbose, -v`  Show sample of transformed data

---

## API Reference

**POST /transform-to-amazon**  
Transform CSV to Amazon format

**Request Parameters:**
- `file`: CSV file upload
- `format`: Response format (csv or json)

**Response:**
- CSV file download (default)
- JSON structure with transformed data (if format=json)

---

## Development

This project is currently in active development. Upcoming features:

- Support for additional marketplaces
- User authentication
- Template storage and reuse
- Direct marketplace integration
- Data visualization and analytics

---

## License

[MIT License](https://github.com/noodle630/S/blob/main/LICENSE)

---

## Acknowledgments

- OpenAI for their powerful GPT models
- Marketplace documentation from Amazon, Walmart, etc.

---
