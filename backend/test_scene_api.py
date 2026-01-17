import requests
import json

BASE_URL = "http://localhost:8000"

# 登录获取token
login_data = {
    "username": "admin",
    "password": "admin123"
}

print("=" * 60)
print("1. 登录获取token")
print("=" * 60)

try:
    response = requests.post(f"{BASE_URL}/api/v1/auth/login", json=login_data)
    response.raise_for_status()
    token = response.json()["data"]["access_token"]
    print(f"✓ 登录成功，token: {token[:20]}...")
except Exception as e:
    print(f"✗ 登录失败: {e}")
    exit(1)

# 设置请求头
headers = {
    "Authorization": f"Bearer {token}"
}

# 查询场景列表
print("\n" + "=" * 60)
print("2. 查询场景列表")
print("=" * 60)

try:
    response = requests.get(f"{BASE_URL}/api/v1/sys-images/admin/scenes?page=1&page_size=10", headers=headers)
    response.raise_for_status()
    data = response.json()["data"]
    
    print(f"✓ 查询成功，共 {data['total']} 条记录")
    
    # 检查第一条记录是否包含style字段
    if data['items']:
        first_item = data['items'][0]
        print(f"\n第一条记录:")
        print(f"  ID: {first_item.get('id')}")
        print(f"  名称: {first_item.get('name')}")
        print(f"  风格: {first_item.get('style')}")
        print(f"  状态: {first_item.get('status')}")
        print(f"  图片URL: {first_item.get('image_url')}")
        
        if 'style' in first_item:
            print(f"\n✓ style字段存在，值为: {first_item['style']}")
        else:
            print(f"\n✗ style字段不存在")
            print(f"  实际字段: {list(first_item.keys())}")
    else:
        print("  没有记录")
        
except Exception as e:
    print(f"✗ 查询失败: {e}")
    if hasattr(e, 'response'):
        print(f"  响应内容: {e.response.text}")

# 测试创建场景
print("\n" + "=" * 60)
print("3. 测试创建场景")
print("=" * 60)

create_data = {
    "name": "测试场景",
    "style": 2,
    "status": "enabled"
}

try:
    response = requests.post(f"{BASE_URL}/api/v1/sys-images/admin/scenes", 
                             data=create_data, 
                             headers=headers)
    response.raise_for_status()
    result = response.json()["data"]
    print(f"✓ 创建成功")
    print(f"  ID: {result.get('id')}")
    print(f"  名称: {result.get('name')}")
    print(f"  风格: {result.get('style')}")
    
    if 'style' in result:
        print(f"✓ 创建返回的记录包含style字段")
    else:
        print(f"✗ 创建返回的记录不包含style字段")
        print(f"  实际字段: {list(result.keys())}")
        
except Exception as e:
    print(f"✗ 创建失败: {e}")
    if hasattr(e, 'response'):
        print(f"  响应内容: {e.response.text}")

print("\n" + "=" * 60)
print("测试完成")
print("=" * 60)
