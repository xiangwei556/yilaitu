import sys
import os
from urllib.parse import quote_plus

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import create_engine, text, inspect
from sqlalchemy.orm import sessionmaker
from passport.app.db.session import Base
from sys_images.models.sys_image import SysScene

DATABASE_URL = f"mysql+pymysql://root:{quote_plus('!QAZ@WSX')}@127.0.0.1:3306/image_edit_db"

engine = create_engine(DATABASE_URL)
Session = sessionmaker(bind=engine)
session = Session()

print("=" * 60)
print("检查 sys_scenes 表中 style 字段为 NULL 的记录")
print("=" * 60)

try:
    result = session.execute(text("SELECT id, name, style FROM sys_scenes WHERE style IS NULL"))
    null_style_records = result.fetchall()
    
    if null_style_records:
        print(f"\n找到 {len(null_style_records)} 条 style 为 NULL 的记录:")
        for record in null_style_records:
            print(f"  ID: {record[0]}, 名称: {record[1]}, style: {record[2]}")
    else:
        print("\n✓ 没有 style 为 NULL 的记录")
    
    # 检查所有记录的style值
    print("\n" + "=" * 60)
    print("所有记录的 style 值")
    print("=" * 60)
    
    result = session.execute(text("SELECT id, name, style FROM sys_scenes"))
    all_records = result.fetchall()
    
    for record in all_records:
        print(f"  ID: {record[0]}, 名称: {record[1]}, style: {record[2]} (类型: {type(record[2])})")
    
except Exception as e:
    print(f"查询出错: {e}")
finally:
    session.close()
