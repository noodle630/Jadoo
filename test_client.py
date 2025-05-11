import requests
import os
import sys

def test_clean_endpoint(csv_file_path):
    """
    Test the /clean endpoint by sending a CSV file and receiving the cleaned version.
    
    Args:
        csv_file_path: Path to the CSV file to be cleaned
    """
    # API endpoint
    url = "http://localhost:5000/clean"
    
    # Check if file exists
    if not os.path.exists(csv_file_path):
        print(f"Error: File {csv_file_path} does not exist")
        return
    
    # Open the file for sending
    with open(csv_file_path, 'rb') as file:
        files = {'file': (os.path.basename(csv_file_path), file, 'text/csv')}
        
        try:
            print(f"Sending {csv_file_path} to {url}...")
            response = requests.post(url, files=files)
            
            # Check the response
            if response.status_code == 200:
                # Save the cleaned CSV to a new file
                output_file = f"cleaned_{os.path.basename(csv_file_path)}"
                with open(output_file, 'w') as f:
                    f.write(response.text)
                print(f"Success! Cleaned data saved to {output_file}")
                print("\nSample of cleaned data:")
                print("------------------------")
                print('\n'.join(response.text.split('\n')[:6]))  # Print first 5 lines
                print("------------------------")
            else:
                print(f"Error: {response.status_code}")
                print(response.text)
        
        except requests.exceptions.RequestException as e:
            print(f"Error making request: {e}")

if __name__ == "__main__":
    # Use command line argument or default to test_data.csv
    csv_file = sys.argv[1] if len(sys.argv) > 1 else "test_data.csv"
    test_clean_endpoint(csv_file)