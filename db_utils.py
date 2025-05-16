import os
import time
import psycopg2
from dotenv import load_dotenv
import pandas as pd

# Load env vars for DB config
load_dotenv()

def get_db_params():
    return {
        'dbname': os.getenv('PGDATABASE'),
        'user': os.getenv('PGUSER'),
        'password': os.getenv('PGPASSWORD'),
        'host': os.getenv('PGHOST'),
        'port': os.getenv('PGPORT')
    }

def get_db_connection():
    try:
        params = {k: v for k, v in get_db_params().items() if v is not None}
        return psycopg2.connect(**params)
    except Exception as e:
        print(f"[DB ERROR] Connection failed: {e}")
        return None

def run_query(query, values=None, fetch=False):
    conn = get_db_connection()
    if not conn:
        return None if fetch else False

    try:
        with conn:
            with conn.cursor() as cur:
                cur.execute(query, values or ())
                if fetch:
                    return cur.fetchall(), [desc[0] for desc in cur.description]
                return True
    except Exception as e:
        print(f"[DB ERROR] Query failed: {e}")
        return None if fetch else False
    finally:
        conn.close()

def fetch_dicts(query, values=None):
    rows, cols = run_query(query, values, fetch=True) or ([], [])
    return [dict(zip(cols, row)) for row in rows]

# --------------------------------------------
# Marketplace Helpers
# --------------------------------------------

def get_marketplace_id(name):
    rows = fetch_dicts("SELECT id FROM marketplace_types WHERE name = %s", (name,))
    return rows[0]['id'] if rows else None

# --------------------------------------------
# Transformation History
# --------------------------------------------

def record_transformation(marketplace_name, source_filename, output_filename,
                          source_row_count, output_row_count, transformation_time, user_id=None):
    marketplace_id = get_marketplace_id(marketplace_name)

    if not marketplace_id:
        print(f"[WARN] Unknown marketplace: {marketplace_name}")
        return None

    conn = get_db_connection()
    if not conn:
        print("[ERROR] Could not connect to DB")
        return None

    try:
        cursor = conn.cursor()

        print("[DEBUG] Inserting transformation:")
        print(f"  marketplace_id = {marketplace_id}")
        print(f"  source_filename = {source_filename}")
        print(f"  output_filename = {output_filename}")
        print(f"  source_row_count = {source_row_count}")
        print(f"  output_row_count = {output_row_count}")
        print(f"  transformation_time = {transformation_time}")
        print(f"  user_id = {user_id}")

        cursor.execute(
            """
            INSERT INTO transformation_history (
                marketplace_id, source_filename, output_filename,
                source_row_count, output_row_count, transformation_time, user_id
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            RETURNING id
            """,
            (
                marketplace_id,
                source_filename or "",
                output_filename or "",
                source_row_count or 0,
                output_row_count or 0,
                transformation_time or 0.0,
                user_id
            )
        )
        new_id = cursor.fetchone()[0]
        conn.commit()
        print(f"[SUCCESS] Transformation recorded with ID {new_id}")
        return new_id
    except Exception as e:
        conn.rollback()
        print(f"[ERROR] Failed to record transformation: {e}")
        return None
    finally:
        conn.close()


def get_recent_transformations(limit=10):
    return fetch_dicts(
        """
        SELECT h.id, m.display_name, h.source_filename, h.output_filename,
               h.source_row_count, h.output_row_count, h.transformation_time, h.processed_at
        FROM transformation_history h
        JOIN marketplace_types m ON h.marketplace_id = m.id
        ORDER BY h.processed_at DESC
        LIMIT %s
        """,
        (limit,)
    )

# --------------------------------------------
# Templates
# --------------------------------------------

def save_template(name, marketplace_name, field_mappings, user_id=None):
    marketplace_id = get_marketplace_id(marketplace_name)
    if not marketplace_id:
        print(f"[WARN] Unknown marketplace: {marketplace_name}")
        return False

    result = run_query(
        """
        INSERT INTO transformation_templates (name, marketplace_id, field_mappings, user_id)
        VALUES (%s, %s, %s, %s)
        RETURNING id
        """,
        (name, marketplace_id, field_mappings, user_id),
        fetch=True
    )
    return result[0][0] if result else False

def get_templates(marketplace_name=None):
    if marketplace_name:
        marketplace_id = get_marketplace_id(marketplace_name)
        if not marketplace_id:
            return []
        query = """
            SELECT t.id, t.name, m.display_name AS marketplace, t.field_mappings, t.created_at, t.updated_at
            FROM transformation_templates t
            JOIN marketplace_types m ON t.marketplace_id = m.id
            WHERE t.marketplace_id = %s
            ORDER BY t.updated_at DESC
        """
        return fetch_dicts(query, (marketplace_id,))
    
    query = """
        SELECT t.id, t.name, m.display_name AS marketplace, t.field_mappings, t.created_at, t.updated_at
        FROM transformation_templates t
        JOIN marketplace_types m ON t.marketplace_id = m.id
        ORDER BY t.updated_at DESC
    """
    return fetch_dicts(query)

# --------------------------------------------
# Decorator: Record Timing
# --------------------------------------------

def time_transformation(func):
    def wrapper(*args, **kwargs):
        marketplace = kwargs.get('marketplace', args[1] if len(args) > 1 else None)
        csv_file = kwargs.get('csv_file_path', args[0] if args else None)

        start = time.time()
        result = func(*args, **kwargs)
        end = time.time()

        if result and isinstance(result, dict) and 'output_file' in result:
            try:
                src_rows = len(pd.read_csv(csv_file))
                out_rows = len(pd.read_csv(result['output_file']))
                record_transformation(
                    marketplace_name=marketplace,
                    source_filename=os.path.basename(csv_file),
                    output_filename=os.path.basename(result['output_file']),
                    source_row_count=src_rows,
                    output_row_count=out_rows,
                    transformation_time=end - start,
                    user_id=None
                )
            except Exception as e:
                print(f"[WARN] Failed to record transformation: {e}")
        return result
    return wrapper

def get_transformation_by_id(feed_id):
    """Get a transformation record by its ID"""
    conn = get_db_connection()
    if not conn:
        return None

    try:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT h.id, m.display_name AS marketplace, h.source_filename, h.output_filename, "
            "h.source_row_count, h.output_row_count, h.transformation_time, h.processed_at "
            "FROM transformation_history h "
            "JOIN marketplace_types m ON h.marketplace_id = m.id "
            "WHERE h.id = %s",
            (feed_id,)
        )
        row = cursor.fetchone()
        if not row:
            return None

        columns = [desc[0] for desc in cursor.description]
        return dict(zip(columns, row))
    except Exception as e:
        print(f"Error fetching transformation by ID: {str(e)}")
        return None
    finally:
        conn.close()
