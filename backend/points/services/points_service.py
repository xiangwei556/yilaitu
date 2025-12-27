from sqlalchemy.orm import Session
from typing import Optional
from decimal import Decimal
from datetime import datetime
from backend.points.models.points import PointsAccount, PointsTransaction
from backend.notification.services.websocket_manager import manager


class PointsService:
    
    @staticmethod
    def deduct_points(
        db: Session,
        user_id: int,
        amount: Decimal,
        source_type: str,
        source_id: Optional[str] = None,
        remark: Optional[str] = None
    ) -> tuple[PointsAccount, PointsTransaction]:
        """
        扣除用户积分
        
        Args:
            db: 数据库会话
            user_id: 用户ID
            amount: 扣除积分数量
            source_type: 来源类型（如：image_generation, purchase等）
            source_id: 来源ID
            remark: 备注
            
        Returns:
            (PointsAccount, PointsTransaction): 更新后的积分账户和交易记录
            
        Raises:
            ValueError: 积分不足时抛出异常
        """
        if amount <= 0:
            raise ValueError("扣除积分数量必须大于0")
        
        account = db.query(PointsAccount).filter(PointsAccount.user_id == user_id).first()
        
        if not account:
            raise ValueError(f"用户 {user_id} 的积分账户不存在")
        
        total_balance = account.balance_permanent + account.balance_limited
        
        if total_balance < amount:
            raise ValueError(f"积分不足，当前余额：{total_balance}，需要扣除：{amount}")
        
        # 优先扣除限时积分
        if account.balance_limited >= amount:
            account.balance_limited -= amount
        else:
            remaining = amount - account.balance_limited
            account.balance_limited = 0
            account.balance_permanent -= remaining
        
        # 记录交易
        transaction = PointsTransaction(
            user_id=user_id,
            type="burn",
            amount=amount,
            balance_after=account.balance_permanent + account.balance_limited,
            source_type=source_type,
            source_id=source_id,
            remark=remark,
            created_at=datetime.now()
        )
        
        db.add(transaction)
        db.commit()
        db.refresh(account)
        db.refresh(transaction)
        
        return account, transaction
    
    @staticmethod
    def get_user_points(db: Session, user_id: int) -> Optional[PointsAccount]:
        """
        获取用户积分账户
        
        Args:
            db: 数据库会话
            user_id: 用户ID
            
        Returns:
            PointsAccount: 积分账户，不存在则返回None
        """
        return db.query(PointsAccount).filter(PointsAccount.user_id == user_id).first()
