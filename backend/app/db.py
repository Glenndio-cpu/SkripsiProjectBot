import os
import pymysql

_pool_args = dict(
    host=os.getenv('DB_HOST', 'localhost'),
    port=int(os.getenv('DB_PORT', '3306')),
    user=os.getenv('DB_USER', 'puskesbot'),
    password=os.getenv('DB_PASSWORD', ''),
    database=os.getenv('DB_NAME', 'puskesbot'),
    charset='utf8mb4',
    cursorclass=pymysql.cursors.DictCursor,
    autocommit=True,
)


def get_connection():
    """Get a new database connection."""
    return pymysql.connect(**_pool_args)


def query(sql, params=None):
    """Execute a query and return all rows."""
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(sql, params or ())
            return cur.fetchall()
    finally:
        conn.close()


def execute(sql, params=None):
    """Execute an INSERT/UPDATE/DELETE and return affected rows."""
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(sql, params or ())
            return cur.rowcount
    finally:
        conn.close()


# Test connection on import
try:
    conn = get_connection()
    conn.close()
    print(f"MySQL connected to database: {os.getenv('DB_NAME', 'puskesbot')}")
except Exception as e:
    print(f"MySQL connection failed: {e}")
