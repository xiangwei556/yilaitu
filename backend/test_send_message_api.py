import requests
import json

BASE_URL = "http://localhost:8001/api/v1"

def login():
    """登录获取 token"""
    login_url = f"{BASE_URL}/auth/login/phone"
    login_data = {"phone": "13401022282", "code": "5567"}
    response = requests.post(login_url, json=login_data)
    if response.status_code == 200:
        return response.json().get("data", {}).get("access_token")
    return None

def send_message(token, receiver_id=9):
    """发送消息"""
    url = f"{BASE_URL}/message/send"
    headers = {"Authorization": f"Bearer {token}"}
    message_data = {
        "title": "测试消息",
        "content": "这是一条测试消息，用于验证小红点功能",
        "type": "system",
        "receiver_id": receiver_id
    }
    response = requests.post(url, json=message_data, headers=headers)
    print(f"发送消息响应状态码: {response.status_code}")
    print(f"发送消息响应内容: {response.text}")
    return response.json()

def get_unread_count(token):
    """获取未读消息数量"""
    url = f"{BASE_URL}/message/my/count"
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.get(url, headers=headers)
    print(f"获取未读数量响应状态码: {response.status_code}")
    print(f"获取未读数量响应内容: {response.text}")
    return response.json()

if __name__ == "__main__":
    print("=== 开始测试消息发送 ===")
    
    # 登录
    token = login()
    if not token:
        print("登录失败！")
        exit(1)
    print(f"登录成功，获取到 token")
    
    # 获取当前未读数量
    print("\n=== 发送消息前的未读数量 ===")
    unread_before = get_unread_count(token)
    
    # 发送消息
    print("\n=== 发送消息 ===")
    send_result = send_message(token, receiver_id=9)
    
    # 获取发送后的未读数量
    print("\n=== 发送消息后的未读数量 ===")
    unread_after = get_unread_count(token)
    
    print("\n=== 测试完成 ===")
    print(f"未读数量变化: {unread_before.get('count', 0)} -> {unread_after.get('count', 0)}")
