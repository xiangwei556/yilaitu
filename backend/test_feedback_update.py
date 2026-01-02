import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy.orm import Session
from backend.passport.app.db.session import SessionLocal
from backend.feedback.models.feedback import Feedback
from backend.feedback.schemas.feedback import FeedbackUpdate
from backend.feedback.services.feedback_service import FeedbackService
from backend.passport.app.models.user import User


def test_feedback_update():
    db = SessionLocal()
    try:
        print("=== 查找待处理的反馈 ===")
        feedback = db.query(Feedback).filter(Feedback.status == 0).first()
        
        if not feedback:
            print("没有找到待处理的反馈")
            return
        
        print(f"找到反馈 ID: {feedback.id}")
        print(f"用户ID: {feedback.user_id}")
        print(f"当前状态: {feedback.status}")
        print(f"反馈内容: {feedback.content}")
        
        print("\n=== 测试更新反馈（状态从0变为1，返还积分）===")
        service = FeedbackService(db)
        
        update_data = FeedbackUpdate(
            status=1,
            reply_content="测试回复内容",
            refund_points=5.0
        )
        
        updated_feedback = service.update_feedback(feedback.id, update_data, 1)
        
        print(f"更新成功！")
        print(f"旧状态: {getattr(updated_feedback, 'old_status', '未知')}")
        print(f"新状态: {updated_feedback.status}")
        print(f"回复内容: {updated_feedback.reply_content}")
        print(f"积分交易ID: {updated_feedback.points_transactions_id}")
        
        print("\n=== 检查积分账户 ===")
        from backend.points.models.points import PointsAccount
        account = db.query(PointsAccount).filter(PointsAccount.user_id == feedback.user_id).first()
        if account:
            total_points = float(account.balance_permanent) + float(account.balance_limited)
            print(f"永久积分: {account.balance_permanent}")
            print(f"限时积分: {account.balance_limited}")
            print(f"总积分: {total_points}")
        
        print("\n=== 检查消息记录 ===")
        from backend.notification.models.message import Message
        messages = db.query(Message).filter(
            Message.receiver_id == feedback.user_id,
            Message.type == "feedback"
        ).order_by(Message.created_at.desc()).limit(3).all()
        
        print(f"找到 {len(messages)} 条反馈相关消息")
        for msg in messages:
            print(f"  消息ID: {msg.id}")
            print(f"  标题: {msg.title}")
            print(f"  内容: {msg.content}")
            print(f"  状态: {msg.status}")
            print(f"  创建时间: {msg.created_at}")
            print()
        
        print("\n=== 检查未读消息计数 ===")
        from backend.notification.models.message import UnreadMessageCount
        unread_count = db.query(UnreadMessageCount).filter(
            UnreadMessageCount.user_id == feedback.user_id
        ).first()
        
        if unread_count:
            print(f"未读消息数: {unread_count.count}")
        else:
            print("未找到未读消息计数记录")
        
    except Exception as e:
        print(f"测试失败: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()


if __name__ == "__main__":
    test_feedback_update()
