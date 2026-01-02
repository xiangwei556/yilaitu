import sys
import os

# Add project root to sys.path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text
from backend.passport.app.db.session import engine

def add_composite_index():
    print("Adding composite index idx_user_id_create_time to original_image_record table...")
    
    try:
        with engine.connect() as conn:
            # Check if index already exists
            check_sql = text("""
                SELECT COUNT(*) as count
                FROM information_schema.statistics
                WHERE table_schema = DATABASE()
                AND table_name = 'original_image_record'
                AND index_name = 'idx_user_id_create_time'
            """)
            result = conn.execute(check_sql).fetchone()
            
            if result and result[0] > 0:
                print("Index idx_user_id_create_time already exists. Skipping.")
                return
            
            # Add the composite index
            create_sql = text("""
                CREATE INDEX idx_user_id_create_time 
                ON original_image_record(user_id, create_time)
            """)
            conn.execute(create_sql)
            conn.commit()
            print("Composite index added successfully!")
            
    except Exception as e:
        print(f"Error adding index: {e}")
        raise

if __name__ == "__main__":
    add_composite_index()