from fastapi import WebSocket
from typing import List, Dict
import json
import asyncio
from backend.passport.app.db.redis import get_redis
from backend.passport.app.core.config import settings

class WebSocketManager:
    def __init__(self):
        self.active_connections: Dict[int, List[WebSocket]] = {}
        self.redis_sub_task = None
        self.redis_sub_running = False

    async def connect(self, websocket: WebSocket, user_id: int):
        await websocket.accept()
        if user_id not in self.active_connections:
            self.active_connections[user_id] = []
        if websocket not in self.active_connections[user_id]:
            self.active_connections[user_id].append(websocket)

    def disconnect(self, websocket: WebSocket, user_id: int):
        if user_id in self.active_connections:
            if websocket in self.active_connections[user_id]:
                self.active_connections[user_id].remove(websocket)
            if not self.active_connections[user_id]:
                del self.active_connections[user_id]

    async def send_personal_message(self, message: str, user_id: int):
        if user_id in self.active_connections:
            for connection in self.active_connections[user_id]:
                try:
                    await connection.send_text(message)
                except Exception as e:
                    print(f"Error sending message to user {user_id}: {e}")
                    self.disconnect(connection, user_id)

    async def broadcast(self, message: str):
        for user_id in self.active_connections:
            for connection in self.active_connections[user_id]:
                try:
                    await connection.send_text(message)
                except Exception as e:
                    print(f"Error broadcasting message: {e}")
                    self.disconnect(connection, user_id)

    async def send_points_update(self, user_id: int, points: float):
        """
        发送积分更新通知到指定用户
        
        Args:
            user_id: 用户ID
            points: 更新后的积分数量
        """
        message = {
            "type": "points_update",
            "user_id": user_id,
            "points": points,
            "timestamp": asyncio.get_event_loop().time()
        }
        await self.send_personal_message(json.dumps(message), user_id)

    async def send_payment_success(self, user_id: int, order_no: str):
        """
        发送支付成功通知到指定用户
        
        Args:
            user_id: 用户ID
            order_no: 订单号
        """
        message = {
            "type": "payment_success",
            "user_id": user_id,
            "order_no": order_no,
            "timestamp": asyncio.get_event_loop().time()
        }
        await self.send_personal_message(json.dumps(message), user_id)

    async def subscribe_to_redis(self):
        """
        Listen to Redis Pub/Sub channel and broadcast to WebSockets
        With automatic reconnection on failure
        """
        self.redis_sub_running = True
        
        while self.redis_sub_running:
            try:
                redis = await get_redis()
                pubsub = redis.pubsub()
                await pubsub.subscribe("notification_channel")
                
                print("Redis Pub/Sub subscription started successfully")
                
                async for message in pubsub.listen():
                    if not self.redis_sub_running:
                        break
                        
                    if message["type"] == "message":
                        try:
                            data = json.loads(message["data"])
                            
                            # 处理积分更新消息
                            if data.get("type") == "points_update":
                                target_user_id = data.get("user_id")
                                if target_user_id:
                                    await self.send_personal_message(json.dumps(data), target_user_id)
                            # 处理普通消息通知
                            else:
                                target_user_id = data.get("receiver_id")
                                if target_user_id:
                                    await self.send_personal_message(json.dumps(data), target_user_id)
                                else:
                                    pass
                        except Exception as e:
                            print(f"Error processing Redis message: {e}")
                            
            except Exception as e:
                print(f"Redis subscription error: {e}, will retry in 5 seconds...")
                await asyncio.sleep(5)
                
            finally:
                try:
                    if 'pubsub' in locals():
                        await pubsub.close()
                except Exception as e:
                    print(f"Error closing pubsub: {e}")

    async def stop_redis_subscription(self):
        """Stop the Redis subscription"""
        self.redis_sub_running = False
        if self.redis_sub_task:
            self.redis_sub_task.cancel()
            try:
                await self.redis_sub_task
            except asyncio.CancelledError:
                pass

manager = WebSocketManager()
