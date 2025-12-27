import sys
import os

# Add project root to sys.path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.orm import Session
from backend.passport.app.db.session import engine
from backend.points.models.points import PointsAccount

def recharge_points_for_user(user_id: int, permanent_points: int = 100, limited_points: int = 0):
    """
    为指定用户充值积分
    
    Args:
        user_id: 用户ID
        permanent_points: 充值的永久积分数量
        limited_points: 充值的限时积分数量
    """
    with Session(engine) as db:
        existing_account = db.query(PointsAccount).filter(PointsAccount.user_id == user_id).first()
        
        if existing_account:
            existing_account.balance_permanent += permanent_points
            existing_account.balance_limited += limited_points
            db.commit()
            db.refresh(existing_account)
            print(f"成功为用户 {user_id} 充值积分")
            print(f"永久积分: {existing_account.balance_permanent}")
            print(f"限时积分: {existing_account.balance_limited}")
            return existing_account
        
        account = PointsAccount(
            user_id=user_id,
            balance_permanent=permanent_points,
            balance_limited=limited_points
        )
        db.add(account)
        db.commit()
        db.refresh(account)
        
        print(f"成功为用户 {user_id} 创建积分账户并充值")
        print(f"永久积分: {account.balance_permanent}")
        print(f"限时积分: {account.balance_limited}")
        
        return account

if __name__ == "__main__":
    recharge_points_for_user(9, permanent_points=100, limited_points=0)
