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
    return result.get("access_token")


def test_feedback_api():
    base_url = "http://localhost:8001/api/v1"
    
    token = get_token()
    if not token:
        return
    
    headers = {
        "Authorization": f"Bearer {token}"
    }
    
    print("=== 查找待处理的反馈 ===")
    response = requests.get(f"{base_url}/admin/feedback?page=1&page_size=10", headers=headers)
    if response.status_code != 200:
        print(f"获取反馈列表失败: {response.status_code}")
        print(response.text)
        return
    
    feedbacks = response.json()
    print(f"找到 {len(feedbacks['items'])} 条反馈")
    
    pending_feedback = None
    for fb in feedbacks['items']:
        if fb['status'] == 0:
            pending_feedback = fb
            break
    
    if not pending_feedback:
        print("没有找到待处理的反馈")
        return
    
    print(f"\n找到待处理反馈 ID: {pending_feedback['id']}")
    print(f"用户ID: {pending_feedback['user_id']}")
    print(f"当前状态: {pending_feedback['status']}")
    print(f"反馈内容: {pending_feedback['content']}")
    
    print("\n=== 测试更新反馈（状态从0变为1，返还积分）===")
    
    update_data = {
        "status": 1,
        "reply_content": "API测试回复内容",
        "refund_points": 5.0
    }
    
    response = requests.put(
        f"{base_url}/admin/feedback/{pending_feedback['id']}",
        json=update_data,
        headers=headers
    )
    
    if response.status_code != 200:
        print(f"更新反馈失败: {response.status_code}")
        print(response.text)
        return
    
    result = response.json()
    print(f"更新成功！")
    print(f"状态: {result['status']}")
    print(f"回复内容: {result['reply_content']}")
    print(f"积分交易ID: {result['points_transactions_id']}")
    
    print("\n=== 检查消息记录 ===")
    response = requests.get(f"{base_url}/message/my?page=1&page_size=5&status=unread", headers=headers)
    if response.status_code == 200:
        messages = response.json()
        print(f"找到 {len(messages)} 条未读消息")
        for msg in messages:
            print(f"  消息ID: {msg['id']}")
            print(f"  标题: {msg['title']}")
            print(f"  内容: {msg['content']}")
            print(f"  类型: {msg['type']}")
            print()
    else:
        print(f"获取消息失败: {response.status_code}")
        print(response.text)


if __name__ == "__main__":
    test_feedback_api()
