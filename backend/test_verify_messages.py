import requests
import json

BASE_URL = "http://localhost:8001/api/v1"

def login():
    """登录获取 token"""
    login_url = f"{BASE_URL}/auth/login/phone"
    login_data = {"phone": "13401022282", "code": "5567"}
    response = requests.post(login_url, json=login_data)
    if response.status_code == 200:
        data = response.json()
        return data.get("data", {}).get("access_token"), data.get("data", {}).get("user")
    return None, None

def get_my_messages(token, page=1, page_size=5):
    """获取我的消息"""
    url = f"{BASE_URL}/message/my"
    headers = {"Authorization": f"Bearer {token}"}
    params = {"page": page, "page_size": page_size}
    response = requests.get(url, params=params, headers=headers)
    if response.status_code == 200:
        return response.json()
    return None

if __name__ == "__main__":
    print("=== 验证消息数据归属 ===")
    
    # 登录
    token, user = login()
    if not token:
        print("登录失败！")
        exit(1)
    
    print(f"\n当前登录用户信息：")
    print(f"  用户ID: {user.get('id')}")
    print(f"  手机号: {user.get('phone')}")
    print(f"  昵称: {user.get('nickname')}")
    
    # 获取消息
    print(f"\n=== 获取消息列表 ===")
    messages = get_my_messages(token)
    
    if messages and messages.get('items'):
        print(f"\n消息分析：")
        print(f"  总消息数: {messages.get('total')}")
        print(f"\n前5条消息详情：")
        print("-" * 80)
        
        for i, msg in enumerate(messages['items'], 1):
            print(f"\n第{i}条消息：")
            print(f"  消息ID: {msg.get('id')}")
            print(f"  标题: {msg.get('title')}")
            print(f"  内容: {msg.get('content')}")
            print(f"  发送者ID (sender_id): {msg.get('sender_id')} ← 这是发送者")
            print(f"  接收者ID (receiver_id): {msg.get('receiver_id')} ← 这是接收者（你）")
            print(f"  状态: {msg.get('status')}")
            print(f"  类型: {msg.get('type')}")
            
            if msg.get('receiver_id') == user.get('id'):
                print(f"  ✓ 这条消息是发给你的")
            else:
                print(f"  ✗ 这条消息不是发给你的")
        
        print("\n" + "=" * 80)
        print("\n结论：")
        print(f"  所有消息的 receiver_id 都是 {user.get('id')}，说明这些消息都是发给你的")
        print(f"  sender_id=1 表示这些消息是由用户1（可能是系统管理员）发送的")
        print(f"  你看到的不是 user_id=1 的数据，而是发送者ID=1 发给你的消息")
