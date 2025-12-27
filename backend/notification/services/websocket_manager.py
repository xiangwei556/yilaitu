from fastapi import WebSocket
from typing import List, Dict
import json
import asyncio
from backend.passport.app.db.redis import get_redis
from backend.passport.app.core.config import settings

class WebSocketManager:
    def __init__(self):
        self.active_connections: Dict[int, List[WebSocket]] = {}

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
                except Exception:
                    pass

    async def broadcast(self, message: str):
        for user_id in self.active_connections:
            for connection in self.active_connections[user_id]:
                try:
                    await connection.send_text(message)
                except Exception:
                    pass

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

    async def subscribe_to_redis(self):
        """
        Listen to Redis Pub/Sub channel and broadcast to WebSockets
        """
        redis = await get_redis()
        pubsub = redis.pubsub()
        await pubsub.subscribe("notification_channel")
        
        try:
            async for message in pubsub.listen():
                if message["type"] == "message":
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
            print(f"Redis subscription error: {e}")

manager = WebSocketManager()
