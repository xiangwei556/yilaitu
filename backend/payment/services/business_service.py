"""
业务处理服务 - 处理支付成功后的业务逻辑
"""
from datetime import datetime, timedelta
from typing import Optional
from sqlalchemy.orm import Session
from backend.order.models.order import Order
from backend.membership.models.membership import MembershipPackage, UserMembership
from backend.points.models.points import PointsPackage, PointsAccount, PointsTransaction
from backend.points.services.points_service import PointsService
from backend.passport.app.core.logging import logger
import json


class BusinessService:
    """业务处理服务"""
    
    @staticmethod
    def process_membership_order(db: Session, order: Order) -> bool:
        """
        处理会员订单
        
        Args:
            db: 数据库会话
            order: 订单对象
            
        Returns:
            处理是否成功
        """
        try:
            # 获取会员套餐信息
            package = db.query(MembershipPackage).filter(
                MembershipPackage.id == order.product_id
            ).first()
            
            if not package:
                logger.error(f"会员套餐不存在: package_id={order.product_id}")
                return False
            
            # 计算会员开始和结束时间
            start_time = datetime.now()
            end_time = start_time + timedelta(days=30)  # 默认30天
            
            # 检查是否已有会员
            existing_membership = db.query(UserMembership).filter(
                UserMembership.user_id == order.user_id,
                UserMembership.status == 1,
                UserMembership.end_time > datetime.now()
            ).first()
            
            if existing_membership:
                # 如果已有会员，延长到期时间
                existing_membership.end_time = existing_membership.end_time + timedelta(days=30)
                existing_membership.updated_at = datetime.now()
                logger.info(f"延长会员到期时间: user_id={order.user_id}, new_end_time={existing_membership.end_time}")
            else:
                # 创建新会员记录
                membership = UserMembership(
                    user_id=order.user_id,
                    package_id=package.id,
                    start_time=start_time,
                    end_time=end_time,
                    status=1,
                    auto_renew=False
                )
                db.add(membership)
                logger.info(f"创建会员记录: user_id={order.user_id}, package_id={package.id}")
            
            # 如果套餐有赠送积分，则充值积分
            if package.points and package.points > 0:
                PointsService.add_points(
                    db=db,
                    user_id=order.user_id,
                    amount=package.points,
                    source_type="membership_gift",
                    source_id=str(order.order_no),
                    remark=f"会员套餐赠送积分: {package.name}"
                )
                logger.info(f"会员套餐赠送积分: user_id={order.user_id}, points={package.points}")
            
            db.commit()
            logger.info(f"会员订单处理成功: order_no={order.order_no}")
            return True
            
        except Exception as e:
            db.rollback()
            logger.error(f"会员订单处理失败: order_no={order.order_no}, error={str(e)}")
            return False
    
    @staticmethod
    def process_membership_upgrade(db: Session, order: Order) -> bool:
        """
        处理会员升级订单
        
        Args:
            db: 数据库会话
            order: 订单对象
            
        Returns:
            处理是否成功
        """
        try:
            # 获取目标会员套餐
            target_package = db.query(MembershipPackage).filter(
                MembershipPackage.id == order.product_id
            ).first()
            
            if not target_package:
                logger.error(f"会员套餐不存在: package_id={order.product_id}")
                return False
            
            # 获取当前会员
            current_membership = db.query(UserMembership).filter(
                UserMembership.user_id == order.user_id,
                UserMembership.status == 1,
                UserMembership.end_time > datetime.now()
            ).order_by(UserMembership.end_time.desc()).first()
            
            if not current_membership:
                # 如果没有当前会员，按新会员处理
                return BusinessService.process_membership_order(db, order)
            
            # 更新会员套餐
            current_membership.package_id = target_package.id
            current_membership.updated_at = datetime.now()
            
            # 如果新套餐有更多赠送积分，补充差额
            current_package = db.query(MembershipPackage).filter(
                MembershipPackage.id == current_membership.package_id
            ).first()
            
            if target_package.points > current_package.points:
                additional_points = target_package.points - current_package.points
                PointsService.add_points(
                    db=db,
                    user_id=order.user_id,
                    amount=additional_points,
                    source_type="membership_upgrade_gift",
                    source_id=str(order.order_no),
                    remark=f"会员升级赠送积分: {target_package.name}"
                )
            
            db.commit()
            logger.info(f"会员升级订单处理成功: order_no={order.order_no}")
            return True
            
        except Exception as e:
            db.rollback()
            logger.error(f"会员升级订单处理失败: order_no={order.order_no}, error={str(e)}")
            return False
    
    @staticmethod
    def process_points_order(db: Session, order: Order) -> bool:
        """
        处理积分包订单
        
        Args:
            db: 数据库会话
            order: 订单对象
            
        Returns:
            处理是否成功
        """
        try:
            # 获取积分包信息
            package = db.query(PointsPackage).filter(
                PointsPackage.id == order.product_id
            ).first()
            
            if not package:
                logger.error(f"积分包不存在: package_id={order.product_id}")
                return False
            
            # 计算积分过期时间
            expire_at = None
            if package.validity_days > 0:
                expire_at = datetime.now() + timedelta(days=package.validity_days)
            
            # 充值积分
            if package.validity_days == 0:
                # 永久积分
                PointsService.add_points(
                    db=db,
                    user_id=order.user_id,
                    amount=package.points,
                    source_type="points_purchase",
                    source_id=str(order.order_no),
                    remark=f"购买积分包: {package.name}"
                )
            else:
                # 限时积分 - 需要扩展PointsService支持限时积分
                # 这里简化处理，使用永久积分
                PointsService.add_points(
                    db=db,
                    user_id=order.user_id,
                    amount=package.points,
                    source_type="points_purchase",
                    source_id=str(order.order_no),
                    remark=f"购买积分包: {package.name} (有效期{package.validity_days}天)"
                )
            
            db.commit()
            logger.info(f"积分包订单处理成功: order_no={order.order_no}, points={package.points}")
            return True
            
        except Exception as e:
            db.rollback()
            logger.error(f"积分包订单处理失败: order_no={order.order_no}, error={str(e)}")
            return False
    
    @staticmethod
    def process_paid_order(db: Session, order: Order) -> bool:
        """
        处理已支付订单的业务逻辑
        
        Args:
            db: 数据库会话
            order: 订单对象
            
        Returns:
            处理是否成功
        """
        try:
            # 根据订单类型处理不同的业务逻辑
            if order.type == "membership":
                return BusinessService.process_membership_order(db, order)
            elif order.type == "membership_upgrade":
                return BusinessService.process_membership_upgrade(db, order)
            elif order.type == "points":
                return BusinessService.process_points_order(db, order)
            else:
                logger.error(f"未知的订单类型: order_type={order.type}")
                return False
                
        except Exception as e:
            logger.error(f"处理已支付订单失败: order_no={order.order_no}, error={str(e)}")
            return False