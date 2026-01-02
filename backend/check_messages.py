import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.passport.app.db.session import SessionLocal
from backend.notification.models.message import Message, UnreadMessageCount
from backend.feedback.models.feedback import Feedback

def check_messages():
    db = SessionLocal()
    try:
        print("=== 检查消息记录 ===")
        messages = db.query(Message).order_by(Message.created_at.desc()).limit(10).all()
        print(f"消息总数: {len(messages)}")
        
        for msg in messages:
            print(f"ID: {msg.id}, 接收者: {msg.receiver_id}, 类型: {msg.type}, 状态: {msg.status}, 标题: {msg.title}, 内容: {msg.content[:50]}...")
        
        print("\n=== 检查未读消息计数 ===")
        unread_counts = db.query(UnreadMessageCount).all()
        print(f"未读消息计数记录数: {len(unread_counts)}")
        for uc in unread_counts:
            print(f"用户ID: {uc.user_id}, 未读数: {uc.count}")
        
        print("\n=== 检查反馈记录 ===")
        feedbacks = db.query(Feedback).order_by(Feedback.created_at.desc()).limit(5).all()
        print(f"反馈总数: {len(feedbacks)}")
        for fb in feedbacks:
            print(f"ID: {fb.id}, 用户ID: {fb.user_id}, 状态: {fb.status}, 回复: {fb.reply_content or '无'}")
        
    finally:
        db.close()

if __name__ == "__main__":
    check_messages()
