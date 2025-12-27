from sqlalchemy.orm import Session
from sys import path
path.append('.')
from passport.app.db.session import SessionLocal
from notification.schemas.message import MessageCreate
from notification.services.notification_service import NotificationService

async def test_send_message():
    db = SessionLocal()
    try:
        # 发送消息给用户 9
        message_data = MessageCreate(
            title="测试消息",
            content="这是一条测试消息，用于验证小红点功能",
            type="system",
            receiver_id=9
        )
        
        result = await NotificationService.send_message(db, message_data)
        print(f"消息发送成功！消息ID: {result.id}")
        print(f"接收者ID: {result.receiver_id}")
        print(f"标题: {result.title}")
        print(f"内容: {result.content}")
        print(f"状态: {result.status}")
        
    except Exception as e:
        print(f"发送消息失败: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    import asyncio
    asyncio.run(test_send_message())
