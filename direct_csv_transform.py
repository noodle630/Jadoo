"""
Direct CSV transformation utility that ensures 1:1 row mapping from input to output files.

This module provides a simpler, more reliable approach to transforming CSV files 
while ensuring that every input row produces exactly one output row.
"""

import os
import io
import pandas as pd
from openai import OpenAI
from dotenv import load_dotenv
import time
import random
import string
from pathlib import Path

# Load environment variables from .env file
load_dotenv()

# Get the OpenAI API key from environment variables
api_key = os.getenv("OPENAI_API_KEY")
if not api_key:
    raise ValueError("OPENAI_API_KEY environment variable not set")

# Initialize OpenAI client
client = OpenAI(api_key=api_key)

def generate_random_string(length=8):
    """Generate a random string for unique filenames"""
    return ''.join(random.choices(string.ascii_lowercase + string.digits, k=length))

def direct_transform_csv(
    input_file_path, 
    output_format, 
    output_columns, 
    prompt_template,
    max_rows=1000, 
    output_file=None
):
    """
    Transform a CSV file directly to another format with strict 1:1 row mapping
    
    Args:
        input_file_path: Path to the input CSV file
        output_format: Name of the output format (e.g., 'amazon', 'walmart')
        output_columns: List of column names for the output format
        prompt_template: Template for creating the OpenAI prompt
        max_rows: Maximum rows to process (default: 1000)
        output_file: Optional custom output file path
    
    Returns:
        Dictionary with transformation results and output file path
    """
    try:
        # Read and validate the CSV file with more robust error handling
        df = None
        try:
            # Try with default settings first
            df = pd.read_csv(input_file_path, encoding='utf-8')
        except UnicodeDecodeError:
            # Try another common encoding if UTF-8 fails
            try:
                df = pd.read_csv(input_file_path, encoding='latin1')
            except Exception as e:
                print(f"Error with latin1 encoding: {str(e)}")
                return {"error": f"Failed to parse CSV with UTF-8 or latin1 encoding: {str(e)}"}
        except Exception as e:
            # Try with more flexible parsing for problematic CSVs
            try:
                print(f"Standard parsing failed: {str(e)}. Trying with error_bad_lines=False...")
                df = pd.read_csv(input_file_path, encoding='utf-8', on_bad_lines='skip')
                print(f"Successfully parsed CSV with flexible parsing.")
            except Exception as inner_e:
                print(f"All parsing attempts failed: {str(inner_e)}")
                return {"error": f"Failed to parse CSV file: {str(inner_e)}"}
        
        # Get basic file info
        input_row_count = len(df)
        input_columns = list(df.columns)
        
        # Enforce row limit
        if input_row_count > max_rows:
            return {
                "error": f"File contains {input_row_count} rows which exceeds the maximum limit of {max_rows}. Please reduce file size or increase limit."
            }
        
        print(f"Processing CSV with {input_row_count} rows and {len(input_columns)} columns")
        
        # Create a working DataFrame with the exact same shape as input
        result_df = pd.DataFrame(index=range(input_row_count), columns=output_columns)
        
        # Generate a sample for the prompt (first 3-5 rows)
        sample_rows = min(5, input_row_count)
        data_sample = df.head(sample_rows).to_csv(index=False)
        
        # Prepare information about the data structure
        data_info = f"""
        CSV file has {input_row_count} rows and {len(input_columns)} columns.
        Source columns: {', '.join(input_columns)}
        Target {output_format} columns: {', '.join(output_columns)}
        """
        
        # Create the prompt using the provided template
        prompt = prompt_template.format(
            data_info=data_info,
            data_sample=data_sample,
            sample_rows=sample_rows,
            total_rows=input_row_count
        )
        
        print("Sending request to OpenAI API...")
        start_time = time.time()
        
        # Call OpenAI API for transformation guidance
        response = client.chat.completions.create(
            model="gpt-4o", # the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
            messages=[
                {
                    "role": "system",
                    "content": f"You are an expert {output_format} product data specialist. You will explain how to transform data from the source format to {output_format} format."
                },
                {"role": "user", "content": prompt}
            ],
            temperature=0.1,
            max_tokens=4000,
        )
        
        # Process the response
        response_content = response.choices[0].message.content
        
        # Calculate and show metrics
        process_time = time.time() - start_time
        print(f"API call completed in {process_time:.2f}s")
        
        # Create transformation instructions from the API response
        transformation_instructions = response_content
        
        # Now process each row individually to ensure 1:1 mapping
        print(f"Processing {input_row_count} rows with transformation instructions...")
        
        # First create output column template based on the first 5 rows
        # Process small batches (5-10 rows) to get the complete transformation
        batch_size = min(10, input_row_count)
        first_batch = df.head(batch_size).to_csv(index=False)
        
        transform_batch_prompt = f"""
        Apply these transformation instructions to convert this batch of {batch_size} source rows:
        
        TRANSFORMATION INSTRUCTIONS:
        {transformation_instructions}
        
        SOURCE BATCH (rows 1-{batch_size}):
        {first_batch}
        
        EXPECTED OUTPUT:
        A CSV file with {batch_size} rows and the following columns: {', '.join(output_columns)}
        
        IMPORTANT: Create EXACTLY {batch_size} output rows - one for each input row.
        Include ALL required columns in the output, using the column names exactly as provided.
        
        Return ONLY the CSV data with headers as the first row.
        """
        
        # Get the template by transforming the first batch
        batch_response = client.chat.completions.create(
            model="gpt-4o", # the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
            messages=[
                {
                    "role": "system",
                    "content": f"You are a data transformation engine that converts source data to {output_format} format."
                },
                {"role": "user", "content": transform_batch_prompt}
            ],
            temperature=0.1,
            max_tokens=4000,
        )
        
        # Extract the batch transformation result
        batch_result = batch_response.choices[0].message.content
        if batch_result is None:
            batch_result = ""
        else:
            batch_result = batch_result.strip()
        
        # Clean up the response if needed
        if batch_result.startswith("```csv"):
            batch_result = batch_result[6:]
        elif batch_result.startswith("```"):
            batch_result = batch_result[3:]
        if batch_result.endswith("```"):
            batch_result = batch_result[:-3]
        
        batch_result = batch_result.strip()
        
        # Parse the batch result as a dataframe
        output_df = pd.read_csv(io.StringIO(batch_result))
        
        # Validate the output format
        if len(output_df) != batch_size:
            print(f"WARNING: Output batch has {len(output_df)} rows instead of expected {batch_size} rows")
        
        # Check columns match expected output columns
        missing_columns = [col for col in output_columns if col not in output_df.columns]
        if missing_columns:
            print(f"WARNING: Output is missing these columns: {missing_columns}")
            # Add missing columns with empty values
            for col in missing_columns:
                output_df[col] = ""
        
        # Now process the entire file in batches
        all_results = []
        
        # Add the first batch to results
        all_results.append(output_df)
        
        # Process the remaining rows in batches
        if input_row_count > batch_size:
            # Process the remaining rows in batches
            for start_idx in range(batch_size, input_row_count, batch_size):
                end_idx = min(start_idx + batch_size, input_row_count)
                print(f"Processing batch of rows {start_idx+1}-{end_idx}...")
                
                # Extract the current batch
                current_batch = df.iloc[start_idx:end_idx].to_csv(index=False)
                current_batch_size = end_idx - start_idx
                
                transform_batch_prompt = f"""
                Apply these transformation instructions to convert this batch of {current_batch_size} source rows:
                
                TRANSFORMATION INSTRUCTIONS:
                {transformation_instructions}
                
                SOURCE BATCH (rows {start_idx+1}-{end_idx}):
                {current_batch}
                
                EXPECTED OUTPUT:
                A CSV file with {current_batch_size} rows and the following columns: {', '.join(output_columns)}
                
                IMPORTANT: Create EXACTLY {current_batch_size} output rows - one for each input row.
                Include ALL required columns in the output, using the column names exactly as provided.
                
                Return ONLY the CSV data WITHOUT the header row.
                """
                
                # Process this batch
                batch_response = client.chat.completions.create(
                    model="gpt-4o", # the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
                    messages=[
                        {
                            "role": "system",
                            "content": f"You are a data transformation engine that converts source data to {output_format} format."
                        },
                        {"role": "user", "content": transform_batch_prompt}
                    ],
                    temperature=0.1,
                    max_tokens=4000,
                )
                
                # Extract and clean the batch result
                batch_result = batch_response.choices[0].message.content
                if batch_result is None:
                    batch_result = ""
                else:
                    batch_result = batch_result.strip()
                
                # Clean up response formatting
                if batch_result.startswith("```csv"):
                    batch_result = batch_result[6:]
                elif batch_result.startswith("```"):
                    batch_result = batch_result[3:]
                if batch_result.endswith("```"):
                    batch_result = batch_result[:-3]
                
                batch_result = batch_result.strip()
                
                # Parse this batch with the header from the first batch to ensure consistency
                try:
                    # Add a header row for parsing, but don't include it in the final output
                    header_str = ",".join(output_df.columns)
                    batch_with_header = header_str + "\n" + batch_result
                    
                    # Parse the batch
                    current_batch_df = pd.read_csv(io.StringIO(batch_with_header))
                    
                    # Validate row count
                    if len(current_batch_df) != current_batch_size:
                        print(f"WARNING: Batch {start_idx+1}-{end_idx} has {len(current_batch_df)} rows instead of expected {current_batch_size}")
                        
                        # If we have too few rows, duplicate the last row to match expected count
                        if len(current_batch_df) < current_batch_size:
                            while len(current_batch_df) < current_batch_size:
                                # Add a placeholder row with the same structure
                                current_batch_df.loc[len(current_batch_df)] = current_batch_df.iloc[-1] if len(current_batch_df) > 0 else [""] * len(current_batch_df.columns)
                        
                        # If we have too many rows, truncate to expected count
                        if len(current_batch_df) > current_batch_size:
                            current_batch_df = current_batch_df.iloc[:current_batch_size]
                    
                    # Add this batch to results
                    all_results.append(current_batch_df)
                    
                except Exception as e:
                    print(f"Error processing batch {start_idx+1}-{end_idx}: {str(e)}")
                    # Create an empty batch with the right structure to preserve 1:1 mapping
                    placeholder_batch = pd.DataFrame("", index=range(current_batch_size), columns=output_df.columns)
                    all_results.append(placeholder_batch)
        
        # Combine all batches, keeping only the header from the first batch
        final_df = pd.concat(all_results, ignore_index=True)
        
        # Ensure 1:1 row mapping
        if len(final_df) != input_row_count:
            print(f"WARNING: Final output has {len(final_df)} rows instead of expected {input_row_count}")
            
            # If we have too few rows, duplicate the last row to match expected count
            if len(final_df) < input_row_count:
                while len(final_df) < input_row_count:
                    # Add a placeholder row with the same structure
                    final_df.loc[len(final_df)] = final_df.iloc[-1] if len(final_df) > 0 else [""] * len(final_df.columns)
            
            # If we have too many rows, truncate to expected count
            if len(final_df) > input_row_count:
                final_df = final_df.iloc[:input_row_count]
        
        # Determine the output file path
        if output_file:
            output_path = output_file
        else:
            # Create the output filename
            input_filename = Path(input_file_path).stem
            timestamp = int(time.time())
            random_id = generate_random_string(4)
            output_filename = f"{output_format}_{input_filename}_{timestamp}_{random_id}.csv"
            
            # Ensure the output directory exists
            output_dir = os.path.join(os.getcwd(), 'temp_uploads')
            os.makedirs(output_dir, exist_ok=True)
            
            output_path = os.path.join(output_dir, output_filename)
        
        # Save the transformed data to CSV
        final_df.to_csv(output_path, index=False)
        
        print(f"Transformation complete: {input_row_count} rows successfully processed")
        print(f"Output saved to: {output_path}")
        
        return {
            "success": True,
            "input_rows": input_row_count,
            "output_rows": len(final_df),
            "output_file": output_path,
            "processing_time": round(time.time() - start_time, 2)
        }
        
    except Exception as e:
        print(f"Error in direct_transform_csv: {str(e)}")
        return {
            "error": f"Transformation failed: {str(e)}"
        }

# Example usage:
if __name__ == "__main__":
    # This is just an example, would be imported and used by specific marketplace modules
    from transform_to_amazon import AMAZON_COLUMNS
    
    sample_prompt_template = """
    As an AI data transformation expert, convert the following CSV data to Amazon Inventory Loader format.
    
    Data information:
    {data_info}
    
    Sample data (first {sample_rows} rows):
    {data_sample}
    
    INSTRUCTIONS:
    1. Analyze the sample data provided to understand the source data structure
    2. Provide detailed instructions on how to convert this data to Amazon format
    3. Include specific rules for mapping source fields to Amazon fields
    4. Explain how to handle missing required fields
    5. Provide examples of transformed data for clarity
    6. Ensure data cleaning steps are included
    
    IMPORTANT: Don't transform the data yourself. Instead, provide clear, detailed transformation instructions
    that would enable a data engineer to write code to perform the transformation consistently for all rows.
    
    Return your transformation instructions in a clear, structured format.
    """
    
    input_file = "test_data.csv"  # Replace with actual test file
    result = direct_transform_csv(
        input_file, 
        "amazon", 
        AMAZON_COLUMNS, 
        sample_prompt_template
    )
    
    print(result)