import sys
import os
import asyncio
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.passport.app.db.session import SessionLocal
from backend.notification.schemas.message import MessageCreate
from backend.notification.services.notification_service import NotificationService

async def test_send_message():
    db = SessionLocal()
    try:
        message_data = MessageCreate(
            title="测试消息",
            content="这是一条测试消息，用于验证消息系统是否正常工作",
            type="system",
            receiver_id=9,
            extra_data='{"test": true}'
        )
        
        result = await NotificationService.send_message(db, message_data)
        print(f"消息发送成功！消息ID: {result.id}")
        print(f"标题: {result.title}")
        print(f"内容: {result.content}")
        print(f"接收者: {result.receiver_id}")
        print(f"状态: {result.status}")
        
    except Exception as e:
        print(f"消息发送失败: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    asyncio.run(test_send_message())
