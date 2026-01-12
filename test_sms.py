import requests
import json

url = "http://127.0.0.1:8001/api/v1/auth/login/send_sms"
payload = {"phone_number": "13401022282"}
headers = {"Content-Type": "application/json"}

try:
    response = requests.post(url, json=payload, headers=headers)
    print(f"Status Code: {response.status_code}")
    print(f"Response Body: {json.dumps(response.json(), indent=2, ensure_ascii=False)}")
except Exception as e:
    print(f"Error: {e}")
