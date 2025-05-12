"""
Test script for the direct CSV transformation approach.

This script allows you to test the direct transformation on any CSV file to ensure
that it maintains a 1:1 mapping between input and output rows.
"""

import os
import sys
from direct_amazon_transform import transform_to_amazon_format, AMAZON_COLUMNS

def test_transform(input_csv, max_rows=1000):
    """
    Test the direct transformation on the specified CSV file
    
    Args:
        input_csv: Path to the input CSV file
        max_rows: Maximum rows to process (default: 1000)
    """
    print(f"\n===== Testing Direct Transformation =====")
    print(f"Input file: {input_csv}")
    
    if not os.path.exists(input_csv):
        print(f"Error: Input file not found: {input_csv}")
        return
    
    # Count the number of rows in the input file
    with open(input_csv, 'r') as f:
        input_lines = len(f.readlines())
    
    input_rows = input_lines - 1  # Subtract 1 for the header row
    print(f"Input file has {input_rows} data rows (plus 1 header row)")
    
    # Perform the transformation
    print(f"\nTransforming to Amazon format...")
    result = transform_to_amazon_format(input_csv, max_rows=max_rows)
    
    if "error" in result:
        print(f"Error: {result['error']}")
        return
    
    # Verify the output
    output_file = result["output_file"]
    
    # Count the number of rows in the output file
    with open(output_file, 'r') as f:
        output_lines = len(f.readlines())
    
    output_rows = output_lines - 1  # Subtract 1 for the header row
    print(f"\nOutput file has {output_rows} data rows (plus 1 header row)")
    print(f"Output saved to: {output_file}")
    
    # Check for 1:1 mapping
    if input_rows == output_rows:
        print(f"\n✅ SUCCESS: Perfect 1:1 mapping confirmed!")
    else:
        print(f"\n❌ ERROR: Row count mismatch! Input: {input_rows}, Output: {output_rows}")
        
    # Additional output stats
    print(f"\nProcessing time: {result['processing_time']} seconds")
    print(f"Output columns: {len(AMAZON_COLUMNS)}")
    
    return result

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python test_direct_transform.py <input_csv_file> [max_rows]")
        
        # List available CSV files for convenience
        print("\nAvailable CSV files:")
        for file in os.listdir('.'):
            if file.endswith('.csv'):
                print(f"  - {file}")
                
        print("\nAvailable CSV files in attached_assets:")
        if os.path.exists('attached_assets'):
            for file in os.listdir('attached_assets'):
                if file.endswith('.csv'):
                    print(f"  - attached_assets/{file}")
        
        sys.exit(1)
    
    input_file = sys.argv[1]
    max_rows = int(sys.argv[2]) if len(sys.argv) > 2 else 1000
    
    test_transform(input_file, max_rows)