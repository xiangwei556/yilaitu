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

def get_my_messages(token, page=1, page_size=20):
    """获取我的消息"""
    url = f"{BASE_URL}/message/my"
    headers = {"Authorization": f"Bearer {token}"}
    params = {"page": page, "page_size": page_size}
    response = requests.get(url, params=params, headers=headers)
    print(f"获取消息响应状态码: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        print(f"获取消息响应内容: {json.dumps(data, indent=2, ensure_ascii=False)}")
        return data
    return None

if __name__ == "__main__":
    print("=== 开始检查消息数据 ===")
    
    # 登录
    token, user = login()
    if not token:
        print("登录失败！")
        exit(1)
    print(f"登录成功")
    print(f"当前用户ID: {user.get('id')}")
    print(f"当前用户手机号: {user.get('phone')}")
    
    # 获取消息
    print("\n=== 获取消息列表 ===")
    messages = get_my_messages(token)
    
    if messages and messages.get('items'):
        print(f"\n=== 消息详情 ===")
        for msg in messages['items']:
            print(f"消息ID: {msg.get('id')}")
            print(f"接收者ID: {msg.get('receiver_id')}")
            print(f"标题: {msg.get('title')}")
            print(f"状态: {msg.get('status')}")
            print(f"类型: {msg.get('type')}")
            print(f"创建时间: {msg.get('created_at')}")
            print("-" * 50)
