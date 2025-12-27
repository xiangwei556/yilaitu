import asyncio
import websockets
import json

async def test_websocket_points_update():
    """
    测试 WebSocket 积分更新通知
    """
    uri = "ws://localhost:8001/api/v1/message/ws/9"
    
    print(f"=== 连接到 WebSocket: {uri} ===")
    
    try:
        async with websockets.connect(uri) as websocket:
            print("=== WebSocket 连接成功 ===")
            
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
                
    except Exception as e:
        print(f"=== WebSocket 连接失败: {e} ===")

if __name__ == "__main__":
    asyncio.run(test_websocket_points_update())
