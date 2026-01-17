import requests
import json

# 测试API接口返回的数据是否包含style字段
url = "http://127.0.0.1:8000/api/v1/sys-images/admin/scenes?page=1&page_size=10"

try:
    # 先尝试不带认证的请求
    response = requests.get(url)
    
    print(f"状态码: {response.status_code}")
    print(f"\n响应头:")
    print(json.dumps(dict(response.headers), indent=2, ensure_ascii=False))
    
    if response.status_code == 200:
        data = response.json()
        print(f"\n响应数据:")
        print(json.dumps(data, indent=2, ensure_ascii=False))
        
        # 检查style字段
        if 'data' in data and 'items' in data['data']:
            items = data['data']['items']
            if items:
                print(f"\n检查第一个item的字段:")
                first_item = items[0]
                print(f"字段列表: {list(first_item.keys())}")
                if 'style' in first_item:
                    print(f"✓ style字段存在，值为: {first_item['style']}")
                else:
                    print(f"✗ style字段缺失！")
            else:
                print(f"\n没有数据项")
        else:
            print(f"\n响应数据格式不符合预期")
    else:
        print(f"\n请求失败，状态码: {response.status_code}")
        print(f"响应内容: {response.text}")
        
except Exception as e:
    print(f"请求出错: {e}")
