import requests
import json

BASE_URL = "http://localhost:8001/api/v1"

def login():
    login_url = f"{BASE_URL}/auth/login/phone"
    login_data = {
        "phone": "13401022282",
        "code": "5567"
    }
    
    response = requests.post(login_url, json=login_data)
    if response.status_code == 200:
        login_result = response.json()
        return login_result.get("data", {}).get("access_token"), login_result.get("data", {}).get("user", {}).get("id")
    return None, None

def get_points_account(token):
    url = f"{BASE_URL}/points/my-account"
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
    response = requests.get(url, headers=headers)
    if response.status_code == 200:
        return response.json()
    return None

if __name__ == "__main__":
    print("=== 查询账户 13401022282 的积分信息 ===\n")
    
    token, user_id = login()
    if not token:
        print("登录失败")
        exit(1)
    
    print(f"用户ID: {user_id}")
    print(f"手机号: 13401022282\n")
    
    account = get_points_account(token)
    if account:
        print("=== 积分账户信息 ===")
        print(f"表名: points_accounts")
        print(f"用户ID (user_id): {account['user_id']}")
        print(f"永久积分 (balance_permanent): {account['balance_permanent']}")
        print(f"限时积分 (balance_limited): {account['balance_limited']}")
        
        total = float(account['balance_permanent']) + float(account['balance_limited'])
        print(f"\n总积分 = balance_permanent + balance_limited")
        print(f"总积分 = {account['balance_permanent']} + {account['balance_limited']} = {total}")
