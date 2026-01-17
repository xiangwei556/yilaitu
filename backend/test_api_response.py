import sys
import os
from urllib.parse import quote_plus

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from passport.app.db.session import Base
from sys_images.models.sys_image import SysScene
from sys_images.schemas.scene import SceneResponse, SceneListResponse
import json

DATABASE_URL = f"mysql+pymysql://root:{quote_plus('!QAZ@WSX')}@127.0.0.1:3306/image_edit_db"

engine = create_engine(DATABASE_URL)
Session = sessionmaker(bind=engine)
session = Session()

print("=" * 60)
print("模拟API响应格式")
print("=" * 60)

try:
    # 模拟查询场景列表
    query = session.query(SysScene)
    items = query.limit(10).all()
    total = query.count()
    
    # 使用SceneResponse序列化每个item
    serialized_items = []
    for item in items:
        scene_response = SceneResponse.model_validate(item)
        serialized_items.append(scene_response.model_dump())
    
    # 创建SceneListResponse
    scene_list_response = SceneListResponse(
        total=total,
        items=serialized_items
    )
    
    # 转换为字典
    response_dict = scene_list_response.model_dump()
    
    print(f"\nSceneListResponse 字典:")
    print(f"  total: {response_dict['total']}")
    print(f"  items count: {len(response_dict['items'])}")
    
    # 检查第一个item是否包含style字段
    if serialized_items:
        first_item = serialized_items[0]
        print(f"\n第一个item:")
        print(f"  id: {first_item['id']}")
        print(f"  name: {first_item['name']}")
        print(f"  style: {first_item['style']}")
        print(f"  status: {first_item['status']}")
        
        if 'style' in first_item:
            print(f"\n✓ 第一个item包含style字段: {first_item['style']}")
        else:
            print(f"\n✗ 第一个item不包含style字段")
            print(f"  实际字段: {list(first_item.keys())}")
    
except Exception as e:
    print(f"测试出错: {e}")
    import traceback
    traceback.print_exc()
finally:
    session.close()
