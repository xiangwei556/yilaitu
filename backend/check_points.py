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
        return login_result.get("data", {}).get("access_token")
    return None

def get_points_transactions(token):
    url = f"{BASE_URL}/points/my-transactions"
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
    response = requests.get(url, headers=headers)
    if response.status_code == 200:
        return response.json()
    return None

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
    print("=== 查看积分账户和交易记录 ===\n")
    
    token = login()
    if not token:
        print("登录失败")
        exit(1)
    
    print(f"获取到访问令牌: {token[:20]}...\n")
    
    account = get_points_account(token)
    if account:
        print("=== 积分账户信息 ===")
        print(json.dumps(account, ensure_ascii=False, indent=2))
        print()
    
    transactions = get_points_transactions(token)
    if transactions:
        print("=== 积分交易记录 ===")
        print(json.dumps(transactions, ensure_ascii=False, indent=2))
        print()
        
        print("=== 交易类型统计 ===")
        earn_count = sum(1 for tx in transactions if tx.get("type") == "earn")
        burn_count = sum(1 for tx in transactions if tx.get("type") == "burn")
        print(f"积分获得记录: {earn_count} 条")
        print(f"积分消耗记录: {burn_count} 条")
