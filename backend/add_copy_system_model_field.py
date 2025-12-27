#!/usr/bin/env python3
"""
添加 copy_system_model 字段到 yilaitu_models 表
"""
import os
import sys
from sqlalchemy import create_engine, Column, Integer, text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv

# 加载环境变量
load_dotenv()

# 获取数据库连接参数
MYSQL_USER = os.getenv("MYSQL_USER")
MYSQL_PASSWORD = os.getenv("MYSQL_PASSWORD")
MYSQL_SERVER = os.getenv("MYSQL_SERVER")
MYSQL_PORT = os.getenv("MYSQL_PORT")
MYSQL_DB = os.getenv("MYSQL_DB")

# 构建数据库连接字符串
if not all([MYSQL_USER, MYSQL_PASSWORD, MYSQL_SERVER, MYSQL_PORT, MYSQL_DB]):
    print("ERROR: Missing database configuration in .env file")
    sys.exit(1)

# 对密码进行URL编码，处理特殊字符
import urllib.parse
encoded_password = urllib.parse.quote_plus(MYSQL_PASSWORD)

DATABASE_URL = f"mysql+pymysql://{MYSQL_USER}:{encoded_password}@{MYSQL_SERVER}:{MYSQL_PORT}/{MYSQL_DB}?charset=utf8mb4"

# 创建数据库引擎
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# 定义模型类
class YiLaiTuModel(Base):
    __tablename__ = "yilaitu_models"
    id = Column(Integer, primary_key=True, index=True)
    # 这里只需要定义我们要添加的字段
    copy_system_model = Column(Integer, default=0)

# 创建字段
def main():
    print("Adding copy_system_model field to yilaitu_models table...")
    
    # 使用原始SQL来添加字段，这样更直接
    with engine.connect() as conn:
        # 先检查字段是否已存在
        result = conn.execute(text("SELECT column_name FROM information_schema.columns WHERE table_schema = 'image_edit_db' AND table_name = 'yilaitu_models' AND column_name = 'copy_system_model'"))
        if result.fetchone():
            print("Field already exists")
            return
            
        # 添加字段
        conn.execute(text("ALTER TABLE image_edit_db.yilaitu_models ADD COLUMN copy_system_model INT DEFAULT 0"))
        conn.commit()
        print("Field added successfully")

if __name__ == "__main__":
    main()
