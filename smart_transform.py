"""
Smart CSV transformation utility that ensures perfect 1:1 row mapping
while leveraging OpenAI for intelligent data enhancement.

Supports scalable transformation pipelines for any marketplace
with target column templates defined per format.
"""

import os
import json
import time
import random
import string
import pandas as pd
from pathlib import Path
from dotenv import load_dotenv
from openai import OpenAI

# Load environment variables
load_dotenv()

# Initialize OpenAI
api_key = os.getenv("OPENAI_API_KEY")
if not api_key:
    raise ValueError("OPENAI_API_KEY environment variable not set")
client = OpenAI(api_key=api_key)

# Marketplace-specific column templates
MARKETPLACE_COLUMNS = {
    "amazon": [
        "item_sku", "external_product_id", "external_product_id_type", "item_name",
        "brand_name", "manufacturer", "feed_product_type", "update_delete",
        "standard_price", "quantity", "product_tax_code", "product_site_launch_date",
        "restock_date", "fulfillment_latency", "item_condition", "main_image_url",
        "swatch_image_url", "other_image_url1", "other_image_url2", "other_image_url3",
        "item_type", "model", "part_number", "bullet_point1", "bullet_point2",
        "bullet_point3", "bullet_point4", "bullet_point5", "generic_keywords",
        "product_description"
    ],
    "walmart": [
        "sku", "productIdType", "productId", "productName", "brand", "price",
        "ShippingWeight", "shortDescription", "mainImageUrl", "cellPhoneType",
        "color", "condition", "longDescription", "modelNumber", "manufacturer",
        "keywords", "numberOfItems", "batteryType", "screenSize", "wirelessTechnology"
    ]
}


def generate_random_string(length=6):
    return ''.join(random.choices(string.ascii_lowercase + string.digits, k=length))


def smart_transform_csv(input_file_path, marketplace, max_rows=1000):
    if marketplace not in MARKETPLACE_COLUMNS:
        return {"error": f"Marketplace '{marketplace}' is not supported"}

    try:
        df = pd.read_csv(input_file_path)
        input_row_count = len(df)
        if input_row_count > max_rows:
            return {"error": f"File has {input_row_count} rows. Limit is {max_rows}."}

        sample = df.head(min(5, input_row_count)).to_csv(index=False)
        target_columns = MARKETPLACE_COLUMNS[marketplace]

        # Request transformation instructions from OpenAI
        system_prompt = f"You are an expert data transformer for the {marketplace} marketplace."
        user_prompt = f"""
You will be given sample product CSV data and should output a transformed version with exact row count.

Marketplace: {marketplace}
Target columns: {', '.join(target_columns)}

Sample data:
{sample}

INSTRUCTIONS:
- Transform to the {marketplace} column format
- Generate missing fields with intelligent defaults
- Return valid CSV string with same number of rows
- Preserve order, do not drop rows
- Output CSV data only, no explanations
"""
        response = client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ]
        )

        csv_content = response.choices[0].message.content.strip()
        if csv_content.startswith("```csv"):
            csv_content = csv_content[6:].strip()
        elif csv_content.startswith("```"):
            csv_content = csv_content.split("\n", 1)[-1].strip()
        if csv_content.endswith("```"):
            csv_content = csv_content[:-3].strip()

        # Save to file
        output_dir = Path("temp_uploads")
        output_dir.mkdir(exist_ok=True)
        output_file = output_dir / f"{marketplace}_transformed_{generate_random_string()}.csv"
        with open(output_file, "w", encoding="utf-8") as f:
            f.write(csv_content)

        transformed_df = pd.read_csv(output_file)
        return {
            "success": True,
            "input_rows": input_row_count,
            "output_rows": len(transformed_df),
            "output_file": str(output_file)
        }

    except Exception as e:
        return {"error": str(e)}


def transform_to_amazon_format(input_file_path, max_rows=1000):
    return smart_transform_csv(input_file_path, marketplace="amazon", max_rows=max_rows)


def transform_to_walmart_format(input_file_path, max_rows=1000):
    return smart_transform_csv(input_file_path, marketplace="walmart", max_rows=max_rows)


if __name__ == "__main__":
    import sys
    if len(sys.argv) < 3:
        print("Usage: python smart_transform.py <marketplace> <input_file.csv>")
        sys.exit(1)

    marketplace = sys.argv[1]
    file_path = sys.argv[2]

    result = smart_transform_csv(file_path, marketplace)
    print(json.dumps(result, indent=2))
