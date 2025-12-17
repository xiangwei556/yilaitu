from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os

# 数据库配置 - 使用MySQL作为数据库
SQLALCHEMY_DATABASE_URL = "mysql+pymysql://root:%21QAZ%40WSX@127.0.0.1:3306/image_edit_db"

# 创建数据库引擎
engine = create_engine(SQLALCHEMY_DATABASE_URL)

# 创建会话工厂
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# 创建基类
Base = declarative_base()

# 依赖注入函数，用于获取数据库会话
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# 初始化数据库（创建所有表）
def init_db():
    # 导入所有模型，确保它们被注册到Base.metadata
    from app.models import user, background  # noqa
    
    # 创建所有表
    Base.metadata.create_all(bind=engine)
    print("数据库初始化完成，所有表已创建")
