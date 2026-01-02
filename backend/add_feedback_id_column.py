import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.passport.app.db.session import engine
from sqlalchemy import text

def add_feedback_id_column():
    try:
        with engine.connect() as conn:
            result = conn.execute(text("""
                SELECT COLUMN_NAME 
                FROM INFORMATION_SCHEMA.COLUMNS 
                WHERE TABLE_SCHEMA = DATABASE() 
                AND TABLE_NAME = 'original_image_record' 
                AND COLUMN_NAME = 'feedback_id'
            """))
            column_exists = result.fetchone()
            
            if not column_exists:
                conn.execute(text("""
                    ALTER TABLE original_image_record 
                    ADD COLUMN feedback_id BIGINT
                """))
                conn.commit()
                print("Successfully added feedback_id column to original_image_record table")
            else:
                print("feedback_id column already exists in original_image_record table")
                
    except Exception as e:
        print(f"Error adding feedback_id column: {e}")
        raise

if __name__ == "__main__":
    add_feedback_id_column()
