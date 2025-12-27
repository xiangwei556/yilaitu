import asyncio
import websockets
import json
import requests
import threading

BASE_URL = "http://localhost:8001/api/v1"

def login():
    """登录获取 token"""
    login_url = f"{BASE_URL}/auth/login/phone"
    login_data = {"phone": "13401022282", "code": "5567"}
    response = requests.post(login_url, json=login_data)
    if response.status_code == 200:
        return response.json().get("data", {}).get("access_token")
    return None

def create_image_record(token):
    """创建生图记录"""
    url = f"{BASE_URL}/original_image_record"
    headers = {"Authorization": f"Bearer {token}"}
    params = {
        "model_id": 1,
        "model_name": "测试模型",
        "params": {"prompt": "测试提示词"},
        "cost_integral": "10.00"
    }
    response = requests.post(url, params=params, headers=headers)
    print(f"创建生图记录响应: {response.status_code}")
    if response.status_code == 200:
        print(f"创建成功: {response.json()}")
    else:
        print(f"创建失败: {response.text}")

async def test_websocket_points_update():
    """
    测试 WebSocket 积分更新通知
    """
    uri = "ws://localhost:8001/api/v1/message/ws/9"
    
    print(f"=== 连接到 WebSocket: {uri} ===")
    
    try:
        async with websockets.connect(uri) as websocket:
            print("=== WebSocket 连接成功 ===")
            
            # 获取 token 并创建生图记录
            print("=== 获取登录 token... ===")
            token = login()
            if not token:
                print("=== 登录失败 ===")
                return
            
            # 在后台线程中创建生图记录
            print("=== 在后台线程中创建生图记录... ===")
            def create_record():
                create_image_record(token)
            thread = threading.Thread(target=create_record)
            thread.start()
            
            # 等待接收消息
            print("=== 等待接收消息... ===")
            
            try:
                message = await asyncio.wait_for(websocket.recv(), timeout=10)
                print(f"=== 收到消息: {message} ===")
                
                data = json.loads(message)
                print(f"=== 解析后的数据: {json.dumps(data, ensure_ascii=False, indent=2)} ===")
                
                if data.get("type") == "points_update":
                    print("=== 收到积分更新通知 ===")
                    print(f"用户ID: {data.get('user_id')}")
                    print(f"积分: {data.get('points')}")
                else:
                    print(f"=== 收到其他类型消息: {data.get('type')} ===")
                    
            except asyncio.TimeoutError:
                print("=== 10秒内未收到任何消息 ===")
            
            thread.join()
                
    except Exception as e:
        print(f"=== WebSocket 连接失败: {e} ===")

if __name__ == "__main__":
    asyncio.run(test_websocket_points_update())
