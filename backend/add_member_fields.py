import sqlalchemy
from sqlalchemy import create_engine

SQLALCHEMY_DATABASE_URL = "mysql+pymysql://root:%21QAZ%40WSX@127.0.0.1:3306/image_edit_db"

engine = create_engine(SQLALCHEMY_DATABASE_URL)

try:
    with engine.connect() as conn:
        # 添加 member_level 字段
        try:
            conn.execute(sqlalchemy.text("""
                ALTER TABLE users
                ADD COLUMN member_level INT DEFAULT 0
                COMMENT '会员等级: 0-非会员, 1-普通会员, 2-专业会员, 3-企业会员'
                AFTER role
            """))
            conn.commit()
            print("成功给users表添加member_level列")
        except Exception as e:
            print(f"添加member_level列时出错（可能已存在）: {e}")

        # 添加 member_expire_time 字段
        try:
            conn.execute(sqlalchemy.text("""
                ALTER TABLE users
                ADD COLUMN member_expire_time DATETIME NULL
                COMMENT '会员过期时间'
                AFTER member_level
            """))
            conn.commit()
            print("成功给users表添加member_expire_time列")
        except Exception as e:
            print(f"添加member_expire_time列时出错（可能已存在）: {e}")

        print("迁移完成！")
except Exception as e:
    print(f"连接数据库时出错: {e}")
