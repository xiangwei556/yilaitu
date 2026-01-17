"""
业务处理服务 - 处理支付成功后的业务逻辑
集成订阅系统，支持生效链管理
"""
from datetime import datetime, timedelta
from typing import Optional
from sqlalchemy.orm import Session
from backend.order.models.order import Order, OrderPaid
from backend.membership.models.membership import MembershipPackage, UserMembership
from backend.membership.models.subscription import Subscription, SubscriptionStatus, SubscriptionType, SubscriptionSource
from backend.points.models.points import PointsPackage, PointsAccount, PointsTransaction
from backend.points.services.points_service import PointsService
from backend.subscription.services.subscription_service import generate_subscription_sn
from backend.subscription.services.chain_manager import ChainManager
from backend.passport.app.core.logging import logger
import json


class BusinessService:
    """业务处理服务"""

    @staticmethod
    def _get_level_weight(level_code: str) -> int:
        """
        获取等级权重

        Args:
            level_code: 等级代码

        Returns:
            权重值（越大等级越高）
        """
        level_weights = {
            'free': 0,
            'basic': 10,
            'ordinary': 10,    # 普通会员
            'standard': 20,
            'professional': 30,  # 专业会员
            'pro': 30,
            'premium': 40,
            'enterprise': 50,   # 企业会员
        }
        return level_weights.get(level_code.lower() if level_code else '', 10)

    @staticmethod
    def process_membership_order_with_subscription(db: Session, order: Order) -> bool:
        """
        使用订阅系统处理会员订单

        流程：
        1. 获取套餐信息
        2. 判断订单场景（首购/续费/升级/降级）
        3. 创建订阅记录
        4. 通过ChainManager插入生效链
        5. 发放积分权益

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

            # 获取等级权重
            level_weight = BusinessService._get_level_weight(package.type)

            # 获取用户当前生效的订阅
            chain_manager = ChainManager(db)
            user_chain = chain_manager.get_user_chain(order.user_id)

            # 判断订单场景
            order_scenario = 'new'  # 默认首购
            current_active = user_chain.active_subscription

            if current_active:
                if level_weight > current_active.level_weight:
                    order_scenario = 'upgrade'  # 升级
                elif level_weight < current_active.level_weight:
                    order_scenario = 'downgrade'  # 降级
                else:
                    order_scenario = 'renewal'  # 续费（同等级）

            logger.info(f"[BusinessService] 会员订单场景: order_no={order.order_no}, scenario={order_scenario}")

            logger.info(f"[BusinessService] 开始创建订阅记录...")
            # 创建订阅记录
            subscription = Subscription(
                subscription_sn=generate_subscription_sn(),
                user_id=order.user_id,
                order_id=order.id,
                type=SubscriptionType.COMBO_PACKAGE,
                level_code=package.type,
                level_weight=level_weight,
                points_amount=package.points or 0,
                status=SubscriptionStatus.PENDING,  # 初始为待生效，由ChainManager决定是否立即生效
                expiration_time=datetime.now() + timedelta(days=package.duration_days or 30),
                cycle_days=package.duration_days or 30,
                is_compensation=0,
                subscription_source=SubscriptionSource.MANUAL,
                is_auto_renewal=0,
            )

            db.add(subscription)
            logger.info(f"[BusinessService] 订阅对象已添加到session，准备flush...")
            db.flush()  # 获取ID
            logger.info(f"[BusinessService] flush完成，subscription_id={subscription.id}")

            # 通过ChainManager插入生效链
            logger.info(f"[BusinessService] 开始插入生效链...")
            insert_result = chain_manager.insert_subscription(subscription)

            logger.info(f"[BusinessService] 订阅插入结果: {insert_result}")

            # 订阅激活和权益发放由 ChainManager 自动处理
            logger.info(f"[BusinessService] 订阅已创建: subscription_id={subscription.id}, status={subscription.status}")

            db.commit()
            logger.info(f"[BusinessService] 会员订单处理成功: order_no={order.order_no}, subscription_sn={subscription.subscription_sn}")
            return True

        except Exception as e:
            db.rollback()
            logger.error(f"[BusinessService] 会员订单处理失败: order_no={order.order_no}, error={str(e)}")
            import traceback
            traceback.print_exc()
            return False
    @staticmethod
    def process_membership_order(db: Session, order: Order) -> bool:
        """
        处理会员订单（兼容旧接口，内部调用新的订阅系统）

        Args:
            db: 数据库会话
            order: 订单对象

        Returns:
            处理是否成功
        """
        return BusinessService.process_membership_order_with_subscription(db, order)

    @staticmethod
    def process_membership_upgrade(db: Session, order: Order) -> bool:
        """
        处理会员升级订单（使用订阅系统自动处理）

        Args:
            db: 数据库会话
            order: 订单对象

        Returns:
            处理是否成功
        """
        # 升级订单也通过订阅系统处理，ChainManager会自动识别并处理升级场景
        return BusinessService.process_membership_order_with_subscription(db, order)

    @staticmethod
    def process_points_order(db: Session, order: Order) -> bool:
        """
        处理积分包订单

        积分包不参与生效链，直接发放积分

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

            # 创建积分包订阅记录（立即完成）
            subscription = Subscription(
                subscription_sn=generate_subscription_sn(),
                user_id=order.user_id,
                order_id=order.id,
                type=SubscriptionType.POINTS_PACKAGE,
                level_code=None,
                level_weight=0,
                points_amount=package.points,
                status=SubscriptionStatus.COMPLETED,  # 立即完成
                expiration_time=datetime.now(),
                cycle_days=0,
                is_compensation=0,
                subscription_source=SubscriptionSource.MANUAL,
                is_auto_renewal=0,
            )
            db.add(subscription)

            # 充值积分
            PointsService.add_points(
                db=db,
                user_id=order.user_id,
                amount=package.points,
                source_type="points_purchase",
                source_id=str(order.order_no),
                remark=f"购买积分包: {package.name}"
            )

            db.commit()
            logger.info(f"[BusinessService] 积分包订单处理成功: order_no={order.order_no}, points={package.points}, subscription_sn={subscription.subscription_sn}")
            return True

        except Exception as e:
            db.rollback()
            logger.error(f"[BusinessService] 积分包订单处理失败: order_no={order.order_no}, error={str(e)}")
            return False

    @staticmethod
    def process_paid_order(db: Session, order: Order) -> bool:
        """
        处理已支付订单的业务逻辑

        根据订单类型分发到不同的处理方法：
        - membership/membership_upgrade: 使用订阅系统处理
        - points: 直接发放积分

        Args:
            db: 数据库会话
            order: 订单对象

        Returns:
            处理是否成功
        """
        try:
            logger.info(f"[BusinessService] 开始处理已支付订单: order_no={order.order_no}, type={order.type}")

            # 根据订单类型处理不同的业务逻辑
            if order.type == "membership":
                return BusinessService.process_membership_order_with_subscription(db, order)
            elif order.type == "membership_upgrade":
                return BusinessService.process_membership_order_with_subscription(db, order)
            elif order.type == "points":
                return BusinessService.process_points_order(db, order)
            else:
                logger.error(f"[BusinessService] 未知的订单类型: order_type={order.type}")
                return False

        except Exception as e:
            logger.error(f"[BusinessService] 处理已支付订单失败: order_no={order.order_no}, error={str(e)}")
            return False