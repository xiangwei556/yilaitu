import sqlalchemy
from sqlalchemy import create_engine

# 数据库配置
SQLALCHEMY_DATABASE_URL = "mysql+pymysql://root:%21QAZ%40WSX@127.0.0.1:3306/image_edit_db"

# 创建数据库引擎
engine = create_engine(SQLALCHEMY_DATABASE_URL)

# 执行ALTER TABLE语句来修改name列的约束
try:
    with engine.connect() as conn:
        conn.execute(sqlalchemy.text("ALTER TABLE yilaitu_models MODIFY COLUMN name VARCHAR(100) NULL;"))
        conn.commit()
        print("成功将yilaitu_models表的name列修改为允许NULL值")
except Exception as e:
    print(f"修改表结构时出错: {e}")
