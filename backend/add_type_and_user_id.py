import sqlalchemy
from sqlalchemy import create_engine

# 数据库配置
SQLALCHEMY_DATABASE_URL = "mysql+pymysql://root:%21QAZ%40WSX@127.0.0.1:3306/image_edit_db"

# 创建数据库引擎
engine = create_engine(SQLALCHEMY_DATABASE_URL)

# 执行ALTER TABLE语句来添加新字段
try:
    with engine.connect() as conn:
        # 添加type字段
        conn.execute(sqlalchemy.text("ALTER TABLE yilaitu_models ADD COLUMN type VARCHAR(20) NOT NULL DEFAULT 'system';"))
        # 添加user_id字段
        conn.execute(sqlalchemy.text("ALTER TABLE yilaitu_models ADD COLUMN user_id BIGINT;"))
        conn.commit()
        print("成功为yilaitu_models表添加了type和user_id字段")
except Exception as e:
    print(f"修改表结构时出错: {e}")
