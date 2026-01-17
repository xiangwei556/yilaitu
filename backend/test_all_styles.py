import requests
import json

BASE_URL = "http://localhost:8000"

# 登录获取token
login_data = {
    "username": "admin",
    "password": "admin123"
}

try:
    response = requests.post(f"{BASE_URL}/api/v1/admin/login", json=login_data)
    response.raise_for_status()
    token = response.json()["data"]["access_token"]
except Exception as e:
    print(f"登录失败: {e}")
    exit(1)

headers = {
    "Authorization": f"Bearer {token}"
}

# 测试不同的style值
test_styles = [1, 2, 3]

for style_value in test_styles:
    print("=" * 60)
    print(f"测试 style={style_value}")
    print("=" * 60)
    
    url = f"{BASE_URL}/api/v1/sys-images/scenes?page=1&page_size=10&style={style_value}"
    
    try:
        response = requests.get(url, headers=headers)
        response.raise_for_status()
        data = response.json()["data"]
        
        print(f"返回记录数: {len(data.get('items', []))}")
        
        # 检查每条记录的style值
        has_wrong_style = False
        for item in data.get('items', []):
            if item.get('style') != style_value:
                print(f"  ✗ 错误！ID={item.get('id')}, name={item.get('name')}, style={item.get('style')}")
                has_wrong_style = True
        
        if has_wrong_style:
            print(f"✗ 发现错误：返回的数据中包含style不等于{style_value}的记录！")
        else:
            print(f"✓ 所有记录的style值都正确等于{style_value}")
            
    except Exception as e:
        print(f"✗ 请求失败: {e}")

print("\n" + "=" * 60)
print("测试完成")
print("=" * 60)
