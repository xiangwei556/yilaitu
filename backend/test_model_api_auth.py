import requests
import json

def test_model_api_with_auth():
    # 首先进行登录，获取访问令牌
    login_url = "http://localhost:8001/api/v1/auth/login/phone"
    login_data = {
        "phone": "13800138000",  # 假设管理员的手机号是13800138000
        "code": "5567"  # 使用万能验证码登录
    }
    
    print(f"发送登录请求到 {login_url}")
    login_response = requests.post(login_url, json=login_data)
    print(f"登录响应状态码: {login_response.status_code}")
    
    if login_response.status_code == 200:
        login_data = login_response.json()
        # 实际响应格式是 {"data": {"access_token": "...", ...}}
        access_token = login_data.get("data", {}).get("access_token")
        print(f"获取到访问令牌: {access_token[:20]}...")
        
        # 使用获取到的令牌测试模型API
        model_url = "http://localhost:8001/api/v1/yilaitumodel/admin/models?page=1&page_size=10"
        headers = {
            "Authorization": f"Bearer {access_token}"
        }
        
        print(f"\n发送请求到 {model_url}")
        model_response = requests.get(model_url, headers=headers)
        print(f"模型API响应状态码: {model_response.status_code}")
        
        if model_response.status_code == 200:
            print("响应内容:", json.dumps(model_response.json(), ensure_ascii=False, indent=2))
        else:
            print("响应内容:", model_response.text)
            print("错误信息:", model_response.reason)
    else:
        print("登录失败，响应内容:", login_response.text)

if __name__ == "__main__":
    test_model_api_with_auth()