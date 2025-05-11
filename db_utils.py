import os
import time
import psycopg2
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Database connection parameters
def get_db_params():
    """Get database connection parameters from environment variables"""
    return {
        'dbname': os.getenv('PGDATABASE'),
        'user': os.getenv('PGUSER'),
        'password': os.getenv('PGPASSWORD'),
        'host': os.getenv('PGHOST'),
        'port': os.getenv('PGPORT')
    }

def get_db_connection():
    """Create a database connection"""
    try:
        params = get_db_params()
        # Filter out None values to avoid type errors
        filtered_params = {k: v for k, v in params.items() if v is not None}
        conn = psycopg2.connect(**filtered_params)
        return conn
    except Exception as e:
        print(f"Error connecting to database: {str(e)}")
        return None

def get_marketplace_id(marketplace_name):
    """Get the ID of a marketplace from its name"""
    conn = get_db_connection()
    if not conn:
        return None
        
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT id FROM marketplace_types WHERE name = %s", (marketplace_name,))
        result = cursor.fetchone()
        return result[0] if result else None
    except Exception as e:
        print(f"Error getting marketplace ID: {str(e)}")
        return None
    finally:
        conn.close()

def record_transformation(marketplace_name, source_filename, output_filename, 
                         source_row_count, output_row_count, transformation_time, user_id=None):
    """Record a transformation in the history table"""
    marketplace_id = get_marketplace_id(marketplace_name)
    if not marketplace_id:
        print(f"Unknown marketplace: {marketplace_name}")
        return False
    
    conn = get_db_connection()
    if not conn:
        return False
    
    try:
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO transformation_history (marketplace_id, source_filename, output_filename, " 
            "source_row_count, output_row_count, transformation_time, user_id) "
            "VALUES (%s, %s, %s, %s, %s, %s, %s)",
            (marketplace_id, source_filename, output_filename, source_row_count, 
             output_row_count, transformation_time, user_id)
        )
        conn.commit()
        return True
    except Exception as e:
        conn.rollback()
        print(f"Error recording transformation: {str(e)}")
        return False
    finally:
        conn.close()

def get_recent_transformations(limit=10):
    """Get recent transformation history"""
    conn = get_db_connection()
    if not conn:
        return []
    
    try:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT h.id, m.display_name, h.source_filename, h.output_filename, "
            "h.source_row_count, h.output_row_count, h.transformation_time, h.processed_at "
            "FROM transformation_history h "
            "JOIN marketplace_types m ON h.marketplace_id = m.id "
            "ORDER BY h.processed_at DESC LIMIT %s",
            (limit,)
        )
        columns = [desc[0] for desc in cursor.description]
        results = cursor.fetchall()
        
        # Convert to list of dictionaries
        transformations = []
        for row in results:
            transformation = dict(zip(columns, row))
            transformations.append(transformation)
            
        return transformations
    except Exception as e:
        print(f"Error getting transformation history: {str(e)}")
        return []
    finally:
        conn.close()

def save_template(name, marketplace_name, field_mappings, user_id=None):
    """Save a transformation template"""
    marketplace_id = get_marketplace_id(marketplace_name)
    if not marketplace_id:
        print(f"Unknown marketplace: {marketplace_name}")
        return False
    
    conn = get_db_connection()
    if not conn:
        return False
    
    try:
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO transformation_templates (name, marketplace_id, field_mappings, user_id) "
            "VALUES (%s, %s, %s, %s) RETURNING id",
            (name, marketplace_id, field_mappings, user_id)
        )
        template_id = cursor.fetchone()[0]
        conn.commit()
        return template_id
    except Exception as e:
        conn.rollback()
        print(f"Error saving template: {str(e)}")
        return False
    finally:
        conn.close()

def get_templates(marketplace_name=None):
    """Get transformation templates, optionally filtered by marketplace"""
    conn = get_db_connection()
    if not conn:
        return []
    
    try:
        cursor = conn.cursor()
        if marketplace_name:
            marketplace_id = get_marketplace_id(marketplace_name)
            if not marketplace_id:
                return []
                
            cursor.execute(
                "SELECT t.id, t.name, m.display_name as marketplace, t.field_mappings, t.created_at, t.updated_at "
                "FROM transformation_templates t "
                "JOIN marketplace_types m ON t.marketplace_id = m.id "
                "WHERE t.marketplace_id = %s "
                "ORDER BY t.updated_at DESC",
                (marketplace_id,)
            )
        else:
            cursor.execute(
                "SELECT t.id, t.name, m.display_name as marketplace, t.field_mappings, t.created_at, t.updated_at "
                "FROM transformation_templates t "
                "JOIN marketplace_types m ON t.marketplace_id = m.id "
                "ORDER BY t.updated_at DESC"
            )
            
        columns = [desc[0] for desc in cursor.description]
        results = cursor.fetchall()
        
        # Convert to list of dictionaries
        templates = []
        for row in results:
            template = dict(zip(columns, row))
            templates.append(template)
            
        return templates
    except Exception as e:
        print(f"Error getting templates: {str(e)}")
        return []
    finally:
        conn.close()

# Example usage with timing decorator
def time_transformation(func):
    """Decorator to time a transformation function and record the results"""
    def wrapper(*args, **kwargs):
        marketplace = kwargs.get('marketplace', args[1] if len(args) > 1 else None)
        source_file = kwargs.get('csv_file_path', args[0] if args else None)
        
        start_time = time.time()
        result = func(*args, **kwargs)
        end_time = time.time()
        
        if result:
            # Extract information about the transformation
            output_file = result
            
            try:
                # Get row counts from source and output files
                import pandas as pd
                source_df = pd.read_csv(source_file)
                output_df = pd.read_csv(output_file)
                
                source_rows = len(source_df)
                output_rows = len(output_df)
                
                # Record the transformation
                record_transformation(
                    marketplace_name=marketplace,
                    source_filename=os.path.basename(source_file),
                    output_filename=os.path.basename(output_file),
                    source_row_count=source_rows,
                    output_row_count=output_rows,
                    transformation_time=end_time - start_time,
                    user_id=None  # Set user_id if available
                )
            except Exception as e:
                print(f"Error recording transformation: {str(e)}")
        
        return result
    
    return wrapper