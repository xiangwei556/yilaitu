import sqlalchemy
from sqlalchemy import create_engine

SQLALCHEMY_DATABASE_URL = "mysql+pymysql://root:%21QAZ%40WSX@127.0.0.1:3306/image_edit_db"

engine = create_engine(SQLALCHEMY_DATABASE_URL)

try:
    with engine.connect() as conn:
        conn.execute(sqlalchemy.text("ALTER TABLE sys_scenes ADD COLUMN style BIGINT DEFAULT 1 COMMENT '风格: 1-日常生活风, 2-时尚杂志风, 3-运动活力风' AFTER name;"))
        conn.commit()
        print("成功给sys_scenes表添加style列")
except Exception as e:
    print(f"修改表结构时出错: {e}")
