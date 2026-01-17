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
    response = requests.post(f"{BASE_URL}/api/v1/admin/login", json=login_data)
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

# 查询场景列表，指定style=2
print("\n" + "=" * 60)
print("2. 查询场景列表 (style=2)")
print("=" * 60)

try:
    url = f"{BASE_URL}/api/v1/sys-images/scenes?page=1&page_size=5&style=2"
    print(f"请求URL: {url}")
    
    response = requests.get(url, headers=headers)
    response.raise_for_status()
    
    print(f"\n状态码: {response.status_code}")
    print(f"\n完整响应数据:")
    print(json.dumps(response.json(), indent=2, ensure_ascii=False))
    
    data = response.json()["data"]
    
    print(f"\n" + "=" * 60)
    print("3. 检查返回的数据")
    print("=" * 60)
    
    if 'items' in data and data['items']:
        print(f"返回了 {len(data['items'])} 条记录")
        
        # 检查每条记录的style值
        has_wrong_style = False
        for i, item in enumerate(data['items']):
            style_value = item.get('style')
            print(f"\n记录 {i+1}:")
            print(f"  ID: {item.get('id')}")
            print(f"  名称: {item.get('name')}")
            print(f"  style: {style_value}")
            print(f"  状态: {item.get('status')}")
            
            if style_value != 2:
                print(f"  ✗ 错误！style应该是2，但实际是{style_value}")
                has_wrong_style = True
            else:
                print(f"  ✓ style值正确")
        
        if has_wrong_style:
            print(f"\n✗ 发现错误：返回的数据中包含style不等于2的记录！")
        else:
            print(f"\n✓ 所有记录的style值都正确等于2")
    else:
        print(f"没有返回数据")
        
except Exception as e:
    print(f"✗ 请求失败: {e}")
    import traceback
    traceback.print_exc()
