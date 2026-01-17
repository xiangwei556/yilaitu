"""
自动续费服务
从 membership/services/auto_renewal_service.py 迁移
"""
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
import logging

from backend.membership.models.subscription import (
    Subscription,
    SubscriptionStatus,
    SubscriptionType,
    SubscriptionSource
)
from backend.subscription.services.subscription_service import SubscriptionService
from backend.subscription.services.chain_manager import ChainManager

logger = logging.getLogger(__name__)


class AutoRenewalService:
    """自动续费服务"""

    def __init__(self, db: Session, redis_client=None):
        """
        初始化自动续费服务

        Args:
            db: 数据库会话
            redis_client: Redis客户端（可选，用于分布式锁）
        """
        self.db = db
        self.redis = redis_client
        self.chain_manager = ChainManager(db)
        self.subscription_service = SubscriptionService(db, redis_client)

    def process_renewal(self, subscription_id: int) -> dict:
        """
        处理自动续费

        Args:
            subscription_id: 订阅ID

        Returns:
            dict: 处理结果
        """
        try:
            # 1. 获取原订阅
            original_sub = self.db.query(Subscription).filter(
                Subscription.id == subscription_id
            ).first()

            if not original_sub:
                return {'success': False, 'error': '订阅不存在'}

            if not original_sub.is_auto_renewal:
                return {'success': False, 'error': '订阅未开启自动续费'}

            # 2. 检查续费条件
            # 检查是否有更高等级的待生效订阅
            higher_pending = self.db.query(Subscription).filter(
                Subscription.user_id == original_sub.user_id,
                Subscription.status == SubscriptionStatus.PENDING,
                Subscription.level_weight > original_sub.level_weight
            ).first()

            if higher_pending:
                logger.info(f"[AutoRenewalService] 存在更高等级待生效订阅，跳过续费: subscription_id={subscription_id}")
                return {'success': False, 'error': '存在更高等级待生效订阅'}

            # 3. 创建续费订单并支付
            # 注意：实际实现应该调用订单服务创建订单，这里简化处理
            # renewal_order = order_service.create_renewal_order(original_sub)
            # if not payment_success: return
            renewal_order_id = None  # 实际应为订单ID

            # 4. 创建续费订阅
            renewal_sub = Subscription(
                subscription_sn=self._generate_subscription_sn(),
                user_id=original_sub.user_id,
                order_id=renewal_order_id or original_sub.order_id,
                type=SubscriptionType.COMBO_PACKAGE,
                level_code=original_sub.level_code,
                level_weight=original_sub.level_weight,
                points_amount=original_sub.points_amount,
                status=SubscriptionStatus.PENDING,
                expiration_time=original_sub.expiration_time + timedelta(days=original_sub.cycle_days),
                cycle_days=original_sub.cycle_days,
                is_compensation=0,
                subscription_source=SubscriptionSource.AUTO_RENEWAL,
                is_auto_renewal=1,
                auto_renewal_source_id=original_sub.id,
                contract_id=original_sub.contract_id,
            )

            self.db.add(renewal_sub)
            self.db.flush()

            # 5. 关闭原订阅的自动续费（新订阅会继承自动续费）
            original_sub.is_auto_renewal = 0
            self.db.add(original_sub)

            # 6. 插入生效链
            insert_result = self.chain_manager.insert_subscription(renewal_sub)

            self.db.commit()

            logger.info(f"[AutoRenewalService] 续费成功: original_id={subscription_id}, new_id={renewal_sub.id}")

            return {
                'success': True,
                'original_subscription_id': subscription_id,
                'new_subscription_id': renewal_sub.id,
                'insert_result': insert_result
            }

        except Exception as e:
            logger.error(f"[AutoRenewalService] 处理续费异常: {str(e)}")
            self.db.rollback()
            return {'success': False, 'error': str(e)}

    def _generate_subscription_sn(self) -> str:
        """生成订阅流水号"""
        import secrets
        timestamp = datetime.now().strftime('%Y%m%d%H%M%S')
        random_str = secrets.token_hex(4).upper()
        return f"SUB{timestamp}{random_str}"
