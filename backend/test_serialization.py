import sys
import os
from urllib.parse import quote_plus

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from passport.app.db.session import Base
from sys_images.models.sys_image import SysScene
from sys_images.schemas.scene import SceneResponse
import json

DATABASE_URL = f"mysql+pymysql://root:{quote_plus('!QAZ@WSX')}@127.0.0.1:3306/image_edit_db"

engine = create_engine(DATABASE_URL)
Session = sessionmaker(bind=engine)
session = Session()

print("=" * 60)
print("测试 SQLAlchemy 模型序列化")
print("=" * 60)

try:
    # 查询一条记录
    scene = session.query(SysScene).first()
    
    if scene:
        print(f"\nSQLAlchemy 模型对象:")
        print(f"  ID: {scene.id}")
        print(f"  名称: {scene.name}")
        print(f"  风格: {scene.style}")
        print(f"  状态: {scene.status}")
        print(f"  图片URL: {scene.image_url}")
        
        # 尝试转换为字典
        print(f"\n模型对象的 __dict__:")
        for key, value in scene.__dict__.items():
            if not key.startswith('_'):
                print(f"  {key}: {value}")
        
        # 尝试使用 Pydantic schema 序列化
        print(f"\n使用 Pydantic SceneResponse 序列化:")
        scene_response = SceneResponse.model_validate(scene)
        print(f"  ID: {scene_response.id}")
        print(f"  名称: {scene_response.name}")
        print(f"  风格: {scene_response.style}")
        print(f"  状态: {scene_response.status}")
        
        # 转换为字典
        scene_dict = scene_response.model_dump()
        print(f"\nPydantic 序列化后的字典:")
        for key, value in scene_dict.items():
            print(f"  {key}: {value}")
        
        # 转换为JSON
        scene_json = scene_response.model_dump_json()
        print(f"\nPydantic 序列化后的JSON:")
        print(scene_json)
        
    else:
        print("  没有记录")
        
except Exception as e:
    print(f"测试出错: {e}")
    import traceback
    traceback.print_exc()
finally:
    session.close()
