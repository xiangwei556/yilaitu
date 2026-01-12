"""
订单服务 - 处理订单相关业务逻辑
"""
from datetime import datetime, timedelta
from typing import Optional, List
from decimal import Decimal
from sqlalchemy.orm import Session
from sqlalchemy import and_
from backend.order.models.order import Order, OrderHistory
from backend.passport.app.core.config import settings
from backend.passport.app.core.logging import logger
from backend.passport.app.utils.id_generator import generate_order_no
import json


class OrderService:
    """订单服务"""
    
    @staticmethod
    def create_pre_order(
        db: Session,
        user_id: int,
        product_type: str,
        product_id: int,
        payment_method: str,
        amount: Decimal,
        original_amount: Optional[Decimal] = None,
        product_snapshot: Optional[dict] = None,
        is_upgrade: bool = False
    ) -> Order:
        """
        创建预订单
        
        Args:
            db: 数据库会话
            user_id: 用户ID
            product_type: 商品类型 (membership, points)
            product_id: 商品ID
            payment_method: 支付方式 (wechat, alipay)
            amount: 金额
            original_amount: 原价
            product_snapshot: 商品快照
            is_upgrade: 是否为升级订单
            
        Returns:
            创建的订单对象
        """
        # 生成订单号（15位，10开头）
        order_no = generate_order_no()
        
        # 计算过期时间
        expire_at = datetime.now() + timedelta(minutes=settings.ORDER_EXPIRE_MINUTES)
        
        # 订单类型
        order_type = "membership_upgrade" if (is_upgrade and product_type == "membership") else product_type
        
        # 创建订单
        order = Order(
            order_no=order_no,
            user_id=user_id,
            amount=amount,
            original_amount=original_amount,
            type=order_type,
            status="pending",
            product_id=product_id,
            product_snapshot=json.dumps(product_snapshot, ensure_ascii=False) if product_snapshot else None,
            payment_method=payment_method,
            expire_at=expire_at
        )
        
        db.add(order)
        db.commit()
        db.refresh(order)
        
        logger.info(f"创建预订单成功: order_no={order_no}, user_id={user_id}, amount={amount}")
        
        return order
    
    @staticmethod
    def get_order_by_no(db: Session, order_no: str) -> Optional[Order]:
        """根据订单号获取订单"""
        return db.query(Order).filter(Order.order_no == order_no).first()
    
    @staticmethod
    def update_order_status(
        db: Session,
        order_no: str,
        status: str,
        payment_no: Optional[str] = None,
        payment_time: Optional[datetime] = None,
        callback_data: Optional[dict] = None
    ) -> Optional[Order]:
        """
        更新订单状态
        
        Args:
            db: 数据库会话
            order_no: 订单号
            status: 订单状态
            payment_no: 支付平台订单号
            payment_time: 支付时间
            callback_data: 回调数据
            
        Returns:
            更新后的订单对象
        """
        order = db.query(Order).filter(Order.order_no == order_no).first()
        if not order:
            return None
        
        order.status = status
        if payment_no:
            order.payment_no = payment_no
        if payment_time:
            order.payment_time = payment_time
        if callback_data:
            order.callback_data = json.dumps(callback_data, ensure_ascii=False)
        
        order.updated_at = datetime.now()
        
        db.commit()
        db.refresh(order)
        
        logger.info(f"更新订单状态: order_no={order_no}, status={status}")
        
        return order
    
    @staticmethod
    def update_order_qr_code(
        db: Session,
        order_no: str,
        qr_code_url: str,
        payment_no: Optional[str] = None
    ) -> Optional[Order]:
        """
        更新订单二维码信息
        
        Args:
            db: 数据库会话
            order_no: 订单号
            qr_code_url: 二维码URL
            payment_no: 支付平台订单号
            
        Returns:
            更新后的订单对象
        """
        order = db.query(Order).filter(Order.order_no == order_no).first()
        if not order:
            return None
        
        order.qr_code_url = qr_code_url
        if payment_no:
            order.payment_no = payment_no
        
        # 设置二维码过期时间
        qr_code_expire_at = datetime.now() + timedelta(minutes=settings.QR_CODE_EXPIRE_MINUTES)
        order.qr_code_expire_at = qr_code_expire_at
        
        order.updated_at = datetime.now()
        
        db.commit()
        db.refresh(order)
        
        return order
    
    @staticmethod
    def cancel_order(db: Session, order_no: str) -> Optional[Order]:
        """
        取消订单
        
        Args:
            db: 数据库会话
            order_no: 订单号
            
        Returns:
            更新后的订单对象
        """
        order = db.query(Order).filter(Order.order_no == order_no).first()
        if not order:
            return None
        
        # 只能取消pending状态的订单
        if order.status != "pending":
            raise ValueError(f"订单状态为{order.status}，无法取消")
        
        order.status = "cancelled"
        order.updated_at = datetime.now()
        
        db.commit()
        db.refresh(order)
        
        logger.info(f"取消订单: order_no={order_no}")
        
        return order
    
    @staticmethod
    def cancel_expired_orders(db: Session) -> int:
        """
        取消过期订单并迁移到order_history表

        Args:
            db: 数据库会话

        Returns:
            取消的订单数量
        """
        from backend.order.services.order_history_service import OrderHistoryService

        now = datetime.now()
        expired_orders = db.query(Order).filter(
            and_(
                Order.status == "pending",
                Order.expire_at < now
            )
        ).all()

        count = 0
        for order in expired_orders:
            try:
                # 将订单迁移到order_history表
                order.status = "cancelled"
                order.updated_at = now

                result = OrderHistoryService.move_to_history(db, order, status="cancelled")
                if result:
                    count += 1
                    logger.info(f"取消过期订单并迁移到历史表: order_no={order.order_no}")
                else:
                    logger.error(f"取消过期订单迁移失败: order_no={order.order_no}")
            except Exception as e:
                logger.error(f"取消过期订单异常: order_no={order.order_no}, error={str(e)}")
                db.rollback()

        if count > 0:
            logger.info(f"取消过期订单: {count}个")

        return count
    
    @staticmethod
    def get_pending_orders_for_query(db: Session, limit: int = 100) -> list:
        """
        获取需要查询支付状态的订单（pending状态且重试次数未超限）
        
        Args:
            db: 数据库会话
            limit: 查询数量限制
            
        Returns:
            订单列表
        """
        return db.query(Order).filter(
            and_(
                Order.status == "pending",
                Order.retry_count < settings.PAYMENT_QUERY_RETRY_MAX,
                Order.payment_no.isnot(None)
            )
        ).limit(limit).all()
    
    @staticmethod
    def increment_retry_count(db: Session, order_no: str) -> Optional[Order]:
        """
        增加订单重试次数

        Args:
            db: 数据库会话
            order_no: 订单号

        Returns:
            更新后的订单对象
        """
        order = db.query(Order).filter(Order.order_no == order_no).first()
        if not order:
            return None

        order.retry_count += 1
        order.updated_at = datetime.now()

        db.commit()
        db.refresh(order)

        return order

    @staticmethod
    def migrate_paid_orders(db: Session) -> int:
        """
        将已支付订单从order_reservation表迁移到order表

        Args:
            db: 数据库会话

        Returns:
            迁移的订单数量
        """
        from backend.order.services.order_history_service import OrderPaidService

        # 查询所有已支付但还在order_reservation表中的订单
        paid_orders = db.query(Order).filter(Order.status == "paid").all()

        count = 0
        for order in paid_orders:
            try:
                result = OrderPaidService.move_to_paid(db, order)
                if result:
                    count += 1
                    logger.info(f"迁移已支付订单到order表: order_no={order.order_no}")
                else:
                    logger.error(f"迁移已支付订单失败: order_no={order.order_no}")
            except Exception as e:
                logger.error(f"迁移已支付订单异常: order_no={order.order_no}, error={str(e)}")
                db.rollback()

        return count