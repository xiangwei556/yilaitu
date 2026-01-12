import time
import hashlib
import random
import string
import requests

def generate_signature(token, timestamp, nonce):
    """
    生成微信签名
    """
    params = [token, timestamp, nonce]
    params.sort()
    tmp_str = ''.join(params)
    signature = hashlib.sha1(tmp_str.encode('utf-8')).hexdigest()
    return signature

def generate_random_string(length=32):
    """
    生成随机字符串
    """
    return ''.join(random.choices(string.ascii_letters + string.digits, k=length))

def test_wechat_validate():
    """
    测试微信服务器验证接口
    """
    url = "https://nonsecludedly-sewable-napoleon.ngrok-free.dev/api/v1/wechat/msg"
    
    token = "Ineedalotofmoneyand108girls"
    timestamp = str(int(time.time()))
    nonce = generate_random_string(16)
    echostr = generate_random_string(32)
    
    signature = generate_signature(token, timestamp, nonce)
    
    params = {
        "signature": signature,
        "timestamp": timestamp,
        "nonce": nonce,
        "echostr": echostr
    }
    
    print("=" * 60)
    print("微信服务器验证接口测试")
    print("=" * 60)
    print(f"\n请求URL: {url}")
    print(f"\n请求参数:")
    print(f"  - signature: {signature}")
    print(f"  - timestamp: {timestamp}")
    print(f"  - nonce: {nonce}")
    print(f"  - echostr: {echostr}")
    print(f"  - token: {token}")
    
    try:
        print(f"\n发送请求...")
        headers = {
            "ngrok-skip-browser-warning": "any_value",
            "User-Agent": "WeChat-Server-Validation/1.0"
        }
        response = requests.get(url, params=params, headers=headers, timeout=10)
        
        print(f"\n响应状态码: {response.status_code}")
        print(f"响应内容: {response.text}")
        
        if response.status_code == 200 and response.text == echostr:
            print("\n✅ 测试成功！服务器正确返回了 echostr")
            print("微信服务器验证逻辑正确！")
        else:
            print("\n❌ 测试失败！")
            print(f"期望返回: {echostr}")
            print(f"实际返回: {response.text}")
            
    except Exception as e:
        print(f"\n❌ 请求失败: {e}")

if __name__ == "__main__":
    test_wechat_validate()
