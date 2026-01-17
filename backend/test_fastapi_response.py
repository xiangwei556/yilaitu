import sys
import os
from urllib.parse import quote_plus

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from passport.app.db.session import Base
from sys_images.models.sys_image import SysScene
from sys_images.schemas.scene import SceneResponse, SceneListResponse
from passport.app.schemas.common import Response
import json

DATABASE_URL = f"mysql+pymysql://root:{quote_plus('!QAZ@WSX')}@127.0.0.1:3306/image_edit_db"

engine = create_engine(DATABASE_URL)
Session = sessionmaker(bind=engine)
session = Session()

print("=" * 60)
print("测试FastAPI Response序列化")
print("=" * 60)

try:
    # 模拟查询场景列表
    query = session.query(SysScene)
    items = query.limit(10).all()
    total = query.count()
    
    # 创建SceneListResponse
    scene_list_response = SceneListResponse(
        total=total,
        items=items  # 直接传入SQLAlchemy对象列表
    )
    
    # 创建Response
    api_response = Response(data=scene_list_response)
    
    # 转换为字典
    response_dict = api_response.model_dump()
    
    print(f"\nResponse 字典:")
    print(f"  code: {response_dict['code']}")
    print(f"  msg: {response_dict['msg']}")
    print(f"  data.total: {response_dict['data']['total']}")
    print(f"  data.items count: {len(response_dict['data']['items'])}")
    
    # 检查第一个item是否包含style字段
    if response_dict['data']['items']:
        first_item = response_dict['data']['items'][0]
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
