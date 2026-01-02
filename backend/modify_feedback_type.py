import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.passport.app.db.session import engine
from sqlalchemy import text

def modify_feedback_type_column():
    try:
        with engine.connect() as conn:
            result = conn.execute(text("""
                SELECT COLUMN_NAME, DATA_TYPE 
                FROM INFORMATION_SCHEMA.COLUMNS 
                WHERE TABLE_SCHEMA = DATABASE() 
                AND TABLE_NAME = 'feedback' 
                AND COLUMN_NAME = 'feedback_type'
            """))
            column_info = result.fetchone()
            
            if column_info:
                current_type = column_info[1]
                if current_type.lower() == 'int' or current_type.lower() == 'integer':
                    conn.execute(text("""
                        ALTER TABLE feedback 
                        MODIFY COLUMN feedback_type VARCHAR(50) COMMENT '反馈类型的枚举（1、背景不符，2、人物变形，3、服装失真，4、色彩偏差，5、细节模糊，6、其他问题），支持多选，用逗号分隔'
                    """))
                    conn.commit()
                    print("Successfully modified feedback_type column to VARCHAR(50)")
                else:
                    print(f"feedback_type column is already {current_type}, no need to modify")
            else:
                print("feedback_type column does not exist in feedback table")
                
    except Exception as e:
        print(f"Error modifying feedback_type column: {e}")
        raise

if __name__ == "__main__":
    modify_feedback_type_column()
