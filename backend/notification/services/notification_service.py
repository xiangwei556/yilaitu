import json
from sqlalchemy.orm import Session
from backend.notification.models.message import Message, UnreadMessageCount
from backend.notification.schemas.message import MessageCreate
from backend.passport.app.db.redis import get_redis

class NotificationService:
    @staticmethod
    async def send_message(db: Session, message_in: MessageCreate):
        # 1. Save to DB
        db_msg = Message(**message_in.dict())
        db.add(db_msg)
        db.commit()
        db.refresh(db_msg)
        
        # 2. Update Unread Count
        unread_record = db.query(UnreadMessageCount).filter(UnreadMessageCount.user_id == message_in.receiver_id).first()
        if not unread_record:
            unread_record = UnreadMessageCount(user_id=message_in.receiver_id, count=1)
            db.add(unread_record)
        else:
            unread_record.count += 1
            
        db.commit()
        
        # 3. Publish to Redis
        try:
            redis = await get_redis()
            payload = {
                "id": db_msg.id,
                "title": db_msg.title,
                "content": db_msg.content,
                "type": db_msg.type,
                "created_at": str(db_msg.created_at),
                "receiver_id": db_msg.receiver_id
            }
            await redis.publish("notification_channel", json.dumps(payload))
        except Exception as e:
            print(f"Failed to publish to Redis: {e}")
            
        return db_msg

    @staticmethod
    def mark_as_read(db: Session, message_id: int, user_id: int):
        msg = db.query(Message).filter(Message.id == message_id, Message.receiver_id == user_id).first()
        if msg and msg.status == 'unread':
            msg.status = 'read'
            
            # Decrement unread count
            unread_record = db.query(UnreadMessageCount).filter(UnreadMessageCount.user_id == user_id).first()
            if unread_record and unread_record.count > 0:
                unread_record.count -= 1
                
            db.commit()
            return True
        return False

    @staticmethod
    def mark_all_as_read(db: Session, user_id: int):
        # Update all messages
        db.query(Message).filter(
            Message.receiver_id == user_id, 
            Message.status == 'unread'
        ).update({"status": "read"})
        
        # Reset count
        unread_record = db.query(UnreadMessageCount).filter(UnreadMessageCount.user_id == user_id).first()
        if unread_record:
            unread_record.count = 0
            
        db.commit()
        return True
