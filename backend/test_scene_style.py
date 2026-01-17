import sys
import os
from urllib.parse import quote_plus

# 添加项目根目录到路径
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
print("检查 sys_scenes 表结构")
print("=" * 60)

inspector = inspect(engine)
columns = inspector.get_columns('sys_scenes')

print("\n表字段列表:")
for col in columns:
    print(f"  - {col['name']}: {col['type']} (nullable: {col['nullable']}, default: {col.get('default', 'None')})")

print("\n" + "=" * 60)
print("检查 sys_scenes 表数据")
print("=" * 60)

scenes = session.query(SysScene).all()

if not scenes:
    print("\n表中暂无数据")
else:
    print(f"\n共有 {len(scenes)} 条记录:")
    for scene in scenes:
        print(f"\nID: {scene.id}")
        print(f"  名称: {scene.name}")
        print(f"  图片URL: {scene.image_url}")
        print(f"  风格: {scene.style}")
        print(f"  状态: {scene.status}")
        print(f"  创建时间: {scene.created_at}")

print("\n" + "=" * 60)
print("检查 style 字段是否存在")
print("=" * 60)

try:
    result = session.execute(text("SELECT style FROM sys_scenes LIMIT 1"))
    print("\n✓ style 字段存在，可以正常查询")
except Exception as e:
    print(f"\n✗ style 字段不存在或查询失败: {e}")

session.close()
