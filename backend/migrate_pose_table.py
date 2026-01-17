import sys
import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv()

MYSQL_USER = os.getenv("MYSQL_USER")
MYSQL_PASSWORD = os.getenv("MYSQL_PASSWORD")
MYSQL_SERVER = os.getenv("MYSQL_SERVER")
MYSQL_PORT = os.getenv("MYSQL_PORT")
MYSQL_DB = os.getenv("MYSQL_DB")

import urllib.parse
encoded_password = urllib.parse.quote_plus(MYSQL_PASSWORD)

DATABASE_URL = f"mysql+pymysql://{MYSQL_USER}:{encoded_password}@{MYSQL_SERVER}:{MYSQL_PORT}/{MYSQL_DB}?charset=utf8mb4"

def migrate():
    engine = create_engine(DATABASE_URL)
    
    with engine.connect() as conn:
        with conn.begin():
            print("开始迁移sys_poses表...")
            
            try:
                conn.execute(text("ALTER TABLE sys_poses DROP COLUMN gender"))
                print("已删除gender列")
            except Exception as e:
                print(f"删除gender列失败（可能不存在）: {e}")
            
            try:
                conn.execute(text("ALTER TABLE sys_poses MODIFY COLUMN image_url VARCHAR(500) NULL"))
                print("已修改image_url列为可空")
            except Exception as e:
                print(f"修改image_url列失败: {e}")
            
            print("迁移完成！")

if __name__ == "__main__":
    migrate()
