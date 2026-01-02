import requests
import json


def get_token():
    base_url = "http://localhost:8001/api/v1"
    
    login_data = {
        "phone": "13800138000",
        "password": "password123"
    }
    
    response = requests.post(f"{base_url}/auth/login/phone", json=login_data)
    if response.status_code != 200:
        print(f"登录失败: {response.status_code}")
        print(response.text)
        return None
    
    result = response.json()
    return result.get("data", {}).get("access_token")


def check_feedback_status():
    base_url = "http://localhost:8001/api/v1"
    
    token = get_token()
    if not token:
        return
    
    headers = {
        "Authorization": f"Bearer {token}"
    }
    
    print("=== 检查反馈30的状态 ===")
    response = requests.get(f"{base_url}/admin/feedback/30", headers=headers)
    if response.status_code != 200:
        print(f"获取反馈详情失败: {response.status_code}")
        print(response.text)
        return
    
    detail = response.json()
    print(f"反馈ID: {detail['feedback']['id']}")
    print(f"用户ID: {detail['feedback']['user_id']}")
    print(f"当前状态: {detail['feedback']['status']}")
    print(f"反馈类型: {detail['feedback']['feedback_type']}")
    print(f"反馈内容: {detail['feedback']['content']}")
    print(f"回复内容: {detail['feedback']['reply_content']}")
    print(f"回复时间: {detail['feedback']['reply_time']}")
    print(f"积分交易ID: {detail['feedback']['points_transactions_id']}")
    
    if detail.get('original_image_record'):
        print(f"生图记录ID: {detail['original_image_record']['id']}")
        print(f"消耗积分: {detail['original_image_record']['cost_integral']}")
    
    print("\n=== 检查用户的消息 ===")
    user_id = detail['feedback']['user_id']
    response = requests.get(f"{base_url}/message/my?page=1&page_size=10", headers=headers)
    if response.status_code == 200:
        messages = response.json()
        print(f"找到 {len(messages)} 条消息")
        for msg in messages:
            print(f"  消息ID: {msg['id']}")
            print(f"  标题: {msg['title']}")
            print(f"  内容: {msg['content']}")
            print(f"  类型: {msg['type']}")
            print(f"  接收人ID: {msg['receiver_id']}")
            print(f"  创建时间: {msg['created_at']}")
            print()
    else:
        print(f"获取消息失败: {response.status_code}")
        print(response.text)


if __name__ == "__main__":
    check_feedback_status()
