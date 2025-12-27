import requests
import json

BASE_URL = "http://yilaitu.com/api/v1"

def login():
    """登录获取 token"""
    login_url = f"{BASE_URL}/auth/login/phone"
    login_data = {"phone": "13401022282", "code": "5567"}
    response = requests.post(login_url, json=login_data)
    if response.status_code == 200:
        data = response.json()
        return data.get("data", {}).get("access_token"), data.get("data", {}).get("user")
    return None, None

def get_my_messages(token, page=3, page_size=6):
    """获取我的消息"""
    url = f"{BASE_URL}/message/my"
    headers = {"Authorization": f"Bearer {token}"}
    params = {"page": page, "page_size": page_size}
    response = requests.get(url, params=params, headers=headers)
    print(f"\n请求URL: {url}")
    print(f"请求参数: {params}")
    print(f"响应状态码: {response.status_code}")
    if response.status_code == 200:
        return response.json()
    return None

if __name__ == "__main__":
    print("=== 测试前端接口调用 ===")
    
    # 登录
    token, user = login()
    if not token:
        print("登录失败！")
        exit(1)
    
    print(f"\n当前登录用户信息：")
    print(f"  用户ID: {user.get('id')}")
    print(f"  手机号: {user.get('phone')}")
    
    # 调用前端接口
    print(f"\n=== 调用接口: {BASE_URL}/message/my?page=3&page_size=6 ===")
    messages = get_my_messages(token, page=3, page_size=6)
    
    if messages:
        print(f"\n=== 接口返回数据 ===")
        print(json.dumps(messages, indent=2, ensure_ascii=False))
        
        if messages.get('items'):
            print(f"\n=== 消息详情分析 ===")
            for i, msg in enumerate(messages['items'], 1):
                print(f"\n第{i}条消息：")
                print(f"  消息ID: {msg.get('id')}")
                print(f"  标题: {msg.get('title')}")
                print(f"  发送者ID (sender_id): {msg.get('sender_id')}")
                print(f"  接收者ID (receiver_id): {msg.get('receiver_id')}")
                
                if msg.get('receiver_id') == user.get('id'):
                    print(f"  ✓ 这条消息是发给你的")
                else:
                    print(f"  ✗ 这条消息不是发给你的！receiver_id={msg.get('receiver_id')}, 你的ID={user.get('id')}")
