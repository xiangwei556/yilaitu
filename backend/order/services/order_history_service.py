"""
订单历史服务 - 处理订单历史表的增删改查
"""
from datetime import datetime
from typing import Optional, List
from sqlalchemy.orm import Session
from sqlalchemy import and_, desc
from backend.order.models.order import Order, OrderHistory, OrderPaid
from backend.passport.app.core.logging import logger


class OrderHistoryService:
    """订单历史服务 - 管理已取消/过期的订单"""

    @staticmethod
    def create(db: Session, order: Order, status: str = "cancelled") -> OrderHistory:
        """
        创建订单历史记录

        Args:
            db: 数据库会话
            order: 原订单对象
            status: 状态 (cancelled, expired)

        Returns:
            创建的订单历史记录
        """
        order_history = OrderHistory(
            order_no=order.order_no,
            user_id=order.user_id,
            amount=order.amount,
            original_amount=order.original_amount,
            type=order.type,
            status=status,
            product_id=order.product_id,
            product_snapshot=order.product_snapshot,
            payment_method=order.payment_method,
            payment_time=order.payment_time,
            payment_no=order.payment_no,
            qr_code_url=order.qr_code_url,
            qr_code_expire_at=order.qr_code_expire_at,
            callback_data=order.callback_data,
            notify_url=order.notify_url,
            expire_at=order.expire_at,
            retry_count=order.retry_count,
            created_at=order.created_at,
            updated_at=datetime.now()
        )

        db.add(order_history)
        db.commit()
        db.refresh(order_history)

        logger.info(f"创建订单历史记录: order_no={order.order_no}, status={status}")

        return order_history

    @staticmethod
    def get_by_order_no(db: Session, order_no: str) -> Optional[OrderHistory]:
        """根据订单号获取订单历史"""
        return db.query(OrderHistory).filter(OrderHistory.order_no == order_no).first()

    @staticmethod
    def get_by_id(db: Session, id: int) -> Optional[OrderHistory]:
        """根据ID获取订单历史"""
        return db.query(OrderHistory).filter(OrderHistory.id == id).first()

    @staticmethod
    def list_all(
        db: Session,
        skip: int = 0,
        limit: int = 100,
        user_id: Optional[int] = None,
        status: Optional[str] = None
    ) -> List[OrderHistory]:
        """
        获取订单历史列表

        Args:
            db: 数据库会话
            skip: 跳过记录数
            limit: 返回记录数
            user_id: 用户ID过滤
            status: 状态过滤

        Returns:
            订单历史列表
        """
        query = db.query(OrderHistory)

        if user_id:
            query = query.filter(OrderHistory.user_id == user_id)
        if status:
            query = query.filter(OrderHistory.status == status)

        return query.order_by(desc(OrderHistory.created_at)).offset(skip).limit(limit).all()

    @staticmethod
    def count(
        db: Session,
        user_id: Optional[int] = None,
        status: Optional[str] = None
    ) -> int:
        """
        统计订单历史数量

        Args:
            db: 数据库会话
            user_id: 用户ID过滤
            status: 状态过滤

        Returns:
            记录数量
        """
        query = db.query(OrderHistory)

        if user_id:
            query = query.filter(OrderHistory.user_id == user_id)
        if status:
            query = query.filter(OrderHistory.status == status)

        return query.count()

    @staticmethod
    def update(
        db: Session,
        order_no: str,
        **kwargs
    ) -> Optional[OrderHistory]:
        """
        更新订单历史记录

        Args:
            db: 数据库会话
            order_no: 订单号
            **kwargs: 要更新的字段

        Returns:
            更新后的订单历史记录
        """
        order_history = db.query(OrderHistory).filter(OrderHistory.order_no == order_no).first()
        if not order_history:
            return None

        for key, value in kwargs.items():
            if hasattr(order_history, key):
                setattr(order_history, key, value)

        order_history.updated_at = datetime.now()

        db.commit()
        db.refresh(order_history)

        logger.info(f"更新订单历史记录: order_no={order_no}")

        return order_history

    @staticmethod
    def delete(db: Session, order_no: str) -> bool:
        """
        删除订单历史记录

        Args:
            db: 数据库会话
            order_no: 订单号

        Returns:
            是否删除成功
        """
        order_history = db.query(OrderHistory).filter(OrderHistory.order_no == order_no).first()
        if not order_history:
            return False

        db.delete(order_history)
        db.commit()

        logger.info(f"删除订单历史记录: order_no={order_no}")

        return True

    @staticmethod
    def move_to_history(db: Session, order: Order, status: str = "cancelled") -> Optional[OrderHistory]:
        """
        将订单从order_reservation表迁移到order_history表

        Args:
            db: 数据库会话
            order: 要迁移的订单对象
            status: 迁移后的状态 (cancelled, expired)

        Returns:
            创建的订单历史记录，失败返回None
        """
        try:
            # 创建历史记录
            order_history = OrderHistoryService.create(db, order, status)

            # 删除原订单
            db.delete(order)
            db.commit()

            logger.info(f"订单迁移到历史表成功: order_no={order.order_no}, status={status}")

            return order_history
        except Exception as e:
            db.rollback()
            logger.error(f"订单迁移到历史表失败: order_no={order.order_no}, error={str(e)}")
            return None


class OrderPaidService:
    """已支付订单服务 - 管理支付成功的订单"""

    @staticmethod
    def create(db: Session, order: Order) -> OrderPaid:
        """
        创建已支付订单记录

        Args:
            db: 数据库会话
            order: 原订单对象

        Returns:
            创建的已支付订单记录
        """
        order_paid = OrderPaid(
            order_no=order.order_no,
            user_id=order.user_id,
            amount=order.amount,
            original_amount=order.original_amount,
            type=order.type,
            status=order.status,
            product_id=order.product_id,
            product_snapshot=order.product_snapshot,
            payment_method=order.payment_method,
            payment_time=order.payment_time,
            payment_no=order.payment_no,
            qr_code_url=order.qr_code_url,
            qr_code_expire_at=order.qr_code_expire_at,
            callback_data=order.callback_data,
            notify_url=order.notify_url,
            expire_at=order.expire_at,
            retry_count=order.retry_count,
            created_at=order.created_at,
            updated_at=datetime.now()
        )

        db.add(order_paid)
        db.commit()
        db.refresh(order_paid)

        logger.info(f"创建已支付订单记录: order_no={order.order_no}")

        return order_paid

    @staticmethod
    def get_by_order_no(db: Session, order_no: str) -> Optional[OrderPaid]:
        """根据订单号获取已支付订单"""
        return db.query(OrderPaid).filter(OrderPaid.order_no == order_no).first()

    @staticmethod
    def get_by_id(db: Session, id: int) -> Optional[OrderPaid]:
        """根据ID获取已支付订单"""
        return db.query(OrderPaid).filter(OrderPaid.id == id).first()

    @staticmethod
    def list_all(
        db: Session,
        skip: int = 0,
        limit: int = 100,
        user_id: Optional[int] = None
    ) -> List[OrderPaid]:
        """
        获取已支付订单列表

        Args:
            db: 数据库会话
            skip: 跳过记录数
            limit: 返回记录数
            user_id: 用户ID过滤

        Returns:
            已支付订单列表
        """
        query = db.query(OrderPaid)

        if user_id:
            query = query.filter(OrderPaid.user_id == user_id)

        return query.order_by(desc(OrderPaid.created_at)).offset(skip).limit(limit).all()

    @staticmethod
    def count(db: Session, user_id: Optional[int] = None) -> int:
        """
        统计已支付订单数量

        Args:
            db: 数据库会话
            user_id: 用户ID过滤

        Returns:
            记录数量
        """
        query = db.query(OrderPaid)

        if user_id:
            query = query.filter(OrderPaid.user_id == user_id)

        return query.count()

    @staticmethod
    def move_to_paid(db: Session, order: Order) -> Optional[OrderPaid]:
        """
        将订单从order_reservation表迁移到order表

        Args:
            db: 数据库会话
            order: 要迁移的订单对象

        Returns:
            创建的已支付订单记录，失败返回None
        """
        try:
            # 创建已支付订单记录
            order_paid = OrderPaidService.create(db, order)

            # 删除原订单
            db.delete(order)
            db.commit()

            logger.info(f"订单迁移到已支付表成功: order_no={order.order_no}")

            return order_paid
        except Exception as e:
            db.rollback()
            logger.error(f"订单迁移到已支付表失败: order_no={order.order_no}, error={str(e)}")
            return None
