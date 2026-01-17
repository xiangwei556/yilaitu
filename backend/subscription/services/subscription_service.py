"""
订阅服务
协调签约、扣款、生效链等功能的核心服务
"""
import secrets
from typing import Dict, Optional, List
from datetime import datetime, timedelta
from decimal import Decimal
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_
import logging

from backend.passport.app.core.config import settings
from backend.payment.models.contract import (
    PaymentContract,
    AutoDeductRecord,
    ContractStatus,
    DeductRecordStatus,
)
from backend.membership.models.subscription import (
    Subscription,
    SubscriptionStatus,
    SubscriptionType,
    SubscriptionSource,
)
from backend.membership.models.membership import MembershipPackage, UserMembership
from backend.order.models.order import Order, OrderPaid
from backend.points.models.points import PointsPackage
from backend.subscription.services.chain_manager import ChainManager
from backend.subscription.services.wechat_deduct_service import WeChatDeductService
from backend.subscription.services.alipay_deduct_service import AlipayDeductService
from backend.subscription.config import subscription_config, deduct_retry_config
from backend.common.distributed_lock import DistributedLock
from backend.points.services.points_service import PointsService

logger = logging.getLogger(__name__)


def generate_subscription_sn() -> str:
    """生成订阅流水号"""
    timestamp = datetime.now().strftime('%Y%m%d%H%M%S')
    random_str = secrets.token_hex(4).upper()
    return f"SUB{timestamp}{random_str}"


def generate_record_sn() -> str:
    """生成扣款记录流水号"""
    timestamp = datetime.now().strftime('%Y%m%d%H%M%S')
    random_str = secrets.token_hex(4).upper()
    return f"DR{timestamp}{random_str}"


class SubscriptionService:
    """订阅服务"""

    def __init__(self, db: Session, redis_client=None):
        """
        初始化订阅服务

        Args:
            db: 数据库会话
            redis_client: Redis客户端（用于分布式锁）
        """
        self.db = db
        self.redis = redis_client
        self.chain_manager = ChainManager(db)

    def create_subscription_from_order(
        self,
        order: OrderPaid,
        is_auto_renewal: bool = False,
        contract_id: int = None,
        source: str = SubscriptionSource.MANUAL
    ) -> Optional[Subscription]:
        """
        从已支付订单创建订阅

        Args:
            order: 已支付订单
            is_auto_renewal: 是否开启自动续费
            contract_id: 签约协议ID
            source: 订阅来源

        Returns:
            创建的订阅对象
        """
        try:
            logger.info(f"[SubscriptionService] 创建订阅: order_no={order.order_no}, source={source}")

            # 解析商品信息
            if order.type == 'membership':
                package = self.db.query(MembershipPackage).filter(
                    MembershipPackage.id == order.product_id
                ).first()
                if not package:
                    logger.error(f"[SubscriptionService] 会员套餐不存在: product_id={order.product_id}")
                    return None

                subscription_type = SubscriptionType.COMBO_PACKAGE
                level_code = package.type
                level_weight = self._get_level_weight(package.type)
                points_amount = package.points or 0
                cycle_days = package.duration_days or 30

            elif order.type == 'points':
                package = self.db.query(PointsPackage).filter(
                    PointsPackage.id == order.product_id
                ).first()
                if not package:
                    logger.error(f"[SubscriptionService] 积分包不存在: product_id={order.product_id}")
                    return None

                subscription_type = SubscriptionType.POINTS_PACKAGE
                level_code = None
                level_weight = 0
                points_amount = package.points
                cycle_days = package.validity_days or 30
            else:
                logger.error(f"[SubscriptionService] 不支持的订单类型: type={order.type}")
                return None

            # 计算到期时间
            expiration_time = datetime.now() + timedelta(days=cycle_days)

            # 创建订阅记录
            subscription = Subscription(
                subscription_sn=generate_subscription_sn(),
                user_id=order.user_id,
                order_id=order.id,
                type=subscription_type,
                level_code=level_code,
                level_weight=level_weight,
                points_amount=points_amount,
                status=SubscriptionStatus.PENDING,  # 初始为待生效
                expiration_time=expiration_time,
                cycle_days=cycle_days,
                is_compensation=0,
                subscription_source=source,
                is_auto_renewal=1 if is_auto_renewal else 0,
                contract_id=contract_id,
            )

            self.db.add(subscription)
            self.db.flush()  # 获取ID

            # 插入生效链
            insert_result = self.chain_manager.insert_subscription(subscription)

            if not insert_result.get('success'):
                logger.error(f"[SubscriptionService] 插入生效链失败: {insert_result.get('error')}")
                self.db.rollback()
                return None

            self.db.commit()
            self.db.refresh(subscription)

            logger.info(f"[SubscriptionService] 订阅创建成功: subscription_sn={subscription.subscription_sn}, status={subscription.status}")

            return subscription

        except Exception as e:
            logger.error(f"[SubscriptionService] 创建订阅异常: {str(e)}")
            self.db.rollback()
            return None

    def _get_level_weight(self, level_code: str) -> int:
        """
        获取等级权重

        Args:
            level_code: 等级代码

        Returns:
            权重值（越大等级越高）
        """
        # 根据项目实际等级定义
        level_weights = {
            'free': 0,
            'basic': 10,
            'standard': 20,
            'premium': 30,
            'enterprise': 40,
        }
        return level_weights.get(level_code, 0)

    async def process_auto_renewal(self, contract_id: int) -> Dict:
        """
        处理自动续费

        Args:
            contract_id: 签约协议ID

        Returns:
            处理结果
        """
        try:
            # 获取签约协议
            contract = self.db.query(PaymentContract).filter(
                PaymentContract.id == contract_id,
                PaymentContract.status == ContractStatus.SIGNED
            ).first()

            if not contract:
                return {'success': False, 'error': '签约协议不存在或已失效'}

            # 检查是否有需要续费的订阅
            active_sub = self.db.query(Subscription).filter(
                and_(
                    Subscription.user_id == contract.user_id,
                    Subscription.contract_id == contract.id,
                    Subscription.status == SubscriptionStatus.ACTIVE,
                    Subscription.is_auto_renewal == 1
                )
            ).first()

            if not active_sub:
                return {'success': False, 'error': '没有需要自动续费的订阅'}

            # 检查是否即将到期（提前N天）
            days_to_expire = (active_sub.expiration_time - datetime.now()).days
            if days_to_expire > subscription_config.AUTO_RENEWAL_NOTIFY_DAYS:
                return {'success': False, 'error': f'订阅还有{days_to_expire}天到期，暂不需要续费'}

            # 创建扣款记录
            record = AutoDeductRecord(
                record_sn=generate_record_sn(),
                contract_id=contract.id,
                user_id=contract.user_id,
                subscription_id=active_sub.id,
                amount=contract.deduct_amount,
                payment_method=contract.payment_method,
                status=DeductRecordStatus.PENDING,
            )
            self.db.add(record)
            self.db.commit()
            self.db.refresh(record)

            # 发起扣款
            deduct_result = await self._do_deduct(contract, record)

            return deduct_result

        except Exception as e:
            logger.error(f"[SubscriptionService] 处理自动续费异常: {str(e)}")
            return {'success': False, 'error': str(e)}

    async def _do_deduct(self, contract: PaymentContract, record: AutoDeductRecord) -> Dict:
        """
        执行扣款

        Args:
            contract: 签约协议
            record: 扣款记录

        Returns:
            扣款结果
        """
        try:
            # 生成商户订单号
            out_trade_no = f"AD{record.id}_{int(datetime.now().timestamp())}"
            record.out_trade_no = out_trade_no
            record.status = DeductRecordStatus.DEDUCTING
            record.deduct_time = datetime.now()
            self.db.commit()

            # 根据支付方式调用不同的扣款服务
            if contract.payment_method == 'wechat':
                deduct_service = WeChatDeductService()
                result = await deduct_service.apply_deduct(
                    contract_id=contract.contract_id,
                    out_trade_no=out_trade_no,
                    amount=int(record.amount * 100),  # 微信金额单位是分
                    description=f"自动续费-{contract.product_type}"
                )
            else:
                deduct_service = AlipayDeductService()
                result = await deduct_service.apply_deduct(
                    agreement_no=contract.contract_id,
                    out_trade_no=out_trade_no,
                    amount=str(record.amount),
                    subject=f"自动续费-{contract.product_type}"
                )

            # 处理扣款结果
            if result.get('success'):
                status = result.get('status')
                if status == 'paid':
                    # 扣款成功
                    record.status = DeductRecordStatus.SUCCESS
                    record.transaction_id = result.get('trade_no') or result.get('transaction_id')
                    record.complete_time = datetime.now()
                    self.db.commit()

                    # 创建新的订阅
                    await self._create_renewal_subscription(contract, record)

                    return {'success': True, 'status': 'paid', 'record_sn': record.record_sn}
                elif status == 'pending':
                    # 等待支付
                    return {'success': True, 'status': 'pending', 'record_sn': record.record_sn}
                else:
                    # 需要查询
                    return {'success': True, 'status': 'unknown', 'record_sn': record.record_sn}
            else:
                # 扣款失败
                record.status = DeductRecordStatus.FAILED
                record.fail_code = result.get('error_code')
                record.fail_reason = result.get('error')
                record.retry_count += 1
                self.db.commit()

                # 判断是否需要重试
                if self._should_retry(record):
                    logger.info(f"[SubscriptionService] 扣款失败，将重试: record_sn={record.record_sn}")
                else:
                    # 超过重试次数，关闭自动续费
                    logger.warning(f"[SubscriptionService] 扣款失败超过重试次数，关闭自动续费: contract_id={contract.id}")
                    self._disable_auto_renewal(contract)

                return {'success': False, 'error': result.get('error'), 'record_sn': record.record_sn}

        except Exception as e:
            logger.error(f"[SubscriptionService] 执行扣款异常: {str(e)}")
            record.status = DeductRecordStatus.FAILED
            record.fail_reason = str(e)
            self.db.commit()
            return {'success': False, 'error': str(e)}

    async def _create_renewal_subscription(self, contract: PaymentContract, record: AutoDeductRecord):
        """
        创建续费订阅

        Args:
            contract: 签约协议
            record: 扣款记录
        """
        try:
            # 获取原订阅
            original_sub = self.db.query(Subscription).filter(
                Subscription.id == record.subscription_id
            ).first()

            if not original_sub:
                logger.error(f"[SubscriptionService] 原订阅不存在: subscription_id={record.subscription_id}")
                return

            # 创建新订阅
            new_sub = Subscription(
                subscription_sn=generate_subscription_sn(),
                user_id=contract.user_id,
                order_id=original_sub.order_id,  # 关联原订单
                type=original_sub.type,
                level_code=original_sub.level_code,
                level_weight=original_sub.level_weight,
                points_amount=original_sub.points_amount,
                status=SubscriptionStatus.PENDING,
                expiration_time=original_sub.expiration_time + timedelta(days=original_sub.cycle_days),
                cycle_days=original_sub.cycle_days,
                is_compensation=0,
                subscription_source=SubscriptionSource.AUTO_RENEWAL,
                is_auto_renewal=1,
                contract_id=contract.id,
                auto_renewal_source_id=original_sub.id,
            )

            self.db.add(new_sub)
            self.db.flush()

            # 插入生效链
            self.chain_manager.insert_subscription(new_sub)

            # 更新扣款记录关联
            record.subscription_id = new_sub.id

            self.db.commit()

            logger.info(f"[SubscriptionService] 续费订阅创建成功: subscription_sn={new_sub.subscription_sn}")

        except Exception as e:
            logger.error(f"[SubscriptionService] 创建续费订阅异常: {str(e)}")
            self.db.rollback()

    def _should_retry(self, record: AutoDeductRecord) -> bool:
        """
        判断是否应该重试

        Args:
            record: 扣款记录

        Returns:
            是否应该重试
        """
        # 检查重试次数
        if record.retry_count >= deduct_retry_config.MAX_RETRY_COUNT:
            return False

        # 检查失败原因
        fail_code = record.fail_code or ''
        action = deduct_retry_config.FAIL_ACTIONS.get(fail_code, 'retry')

        return action == 'retry'

    def _disable_auto_renewal(self, contract: PaymentContract):
        """
        禁用自动续费

        Args:
            contract: 签约协议
        """
        try:
            # 更新签约协议状态
            contract.deduct_fail_count += 1

            # 关闭相关订阅的自动续费
            self.db.query(Subscription).filter(
                and_(
                    Subscription.contract_id == contract.id,
                    Subscription.is_auto_renewal == 1
                )
            ).update({'is_auto_renewal': 0})

            self.db.commit()

            logger.info(f"[SubscriptionService] 已禁用自动续费: contract_id={contract.id}")

        except Exception as e:
            logger.error(f"[SubscriptionService] 禁用自动续费异常: {str(e)}")

    def process_subscription_expiration(self, subscription_id: int) -> bool:
        """
        处理订阅到期

        Args:
            subscription_id: 订阅ID

        Returns:
            是否处理成功
        """
        try:
            subscription = self.db.query(Subscription).filter(
                Subscription.id == subscription_id
            ).first()

            if not subscription:
                return False

            if subscription.status != SubscriptionStatus.ACTIVE:
                return False

            # 检查是否真的到期了
            if subscription.expiration_time > datetime.now():
                return False

            logger.info(f"[SubscriptionService] 处理订阅到期: subscription_id={subscription_id}")

            # 更新状态为已完成
            subscription.status = SubscriptionStatus.COMPLETED
            subscription.update_time = datetime.now()

            # 激活下一个订阅
            if subscription.next_subscription_id:
                next_sub = self.db.query(Subscription).filter(
                    Subscription.id == subscription.next_subscription_id
                ).first()

                if next_sub and next_sub.status == SubscriptionStatus.PENDING:
                    # 使用统一激活方法（自动发放权益）
                    self.activate_subscription(next_sub)
                    logger.info(f"[SubscriptionService] 激活下一个订阅: subscription_id={next_sub.id}")

                    self.db.commit()
                    return True

            self.db.commit()

            # 没有下一个订阅时，只更新用户会员信息
            self._update_user_membership(subscription.user_id)

            return True

        except Exception as e:
            logger.error(f"[SubscriptionService] 处理订阅到期异常: {str(e)}")
            self.db.rollback()
            return False

    def _update_user_membership(self, user_id: int):
        """
        更新用户会员信息

        Args:
            user_id: 用户ID
        """
        try:
            # 获取当前生效的订阅
            active_sub = self.db.query(Subscription).filter(
                and_(
                    Subscription.user_id == user_id,
                    Subscription.status == SubscriptionStatus.ACTIVE,
                    Subscription.type == SubscriptionType.COMBO_PACKAGE
                )
            ).first()

            # 计算整个生效链的最终到期时间（包含待生效订阅）
            chain_end_time = None
            if active_sub:
                # 查询该用户所有生效中和待生效的订阅，取最大的到期时间
                max_expiration = self.db.query(Subscription.expiration_time).filter(
                    and_(
                        Subscription.user_id == user_id,
                        Subscription.status.in_([SubscriptionStatus.ACTIVE, SubscriptionStatus.PENDING]),
                        Subscription.type == SubscriptionType.COMBO_PACKAGE
                    )
                ).order_by(Subscription.expiration_time.desc()).first()

                if max_expiration:
                    chain_end_time = max_expiration[0]

            # 更新或创建用户会员记录
            user_membership = self.db.query(UserMembership).filter(
                UserMembership.user_id == user_id
            ).first()

            if active_sub:
                if user_membership:
                    user_membership.status = 1
                    user_membership.end_time = chain_end_time or active_sub.expiration_time
                    user_membership.level = active_sub.level_code
                else:
                    user_membership = UserMembership(
                        user_id=user_id,
                        level=active_sub.level_code,
                        status=1,
                        start_time=datetime.now(),
                        end_time=chain_end_time or active_sub.expiration_time
                    )
                    self.db.add(user_membership)
            else:
                # 没有生效的订阅，降级为免费用户
                if user_membership:
                    user_membership.status = 0

            self.db.commit()

        except Exception as e:
            logger.error(f"[SubscriptionService] 更新用户会员信息异常: {str(e)}")

    def get_expiring_subscriptions(self, days: int = 3) -> List[Subscription]:
        """
        获取即将到期的订阅

        Args:
            days: 几天内到期

        Returns:
            订阅列表
        """
        expire_before = datetime.now() + timedelta(days=days)

        return self.db.query(Subscription).filter(
            and_(
                Subscription.status == SubscriptionStatus.ACTIVE,
                Subscription.is_auto_renewal == 1,
                Subscription.expiration_time <= expire_before,
                Subscription.expiration_time > datetime.now()
            )
        ).all()

    def get_contracts_for_deduct(self, days: int = 3) -> List[PaymentContract]:
        """
        获取需要扣款的签约协议

        Args:
            days: 几天内需要扣款

        Returns:
            签约协议列表
        """
        deduct_before = datetime.now() + timedelta(days=days)

        return self.db.query(PaymentContract).filter(
            and_(
                PaymentContract.status == ContractStatus.SIGNED,
                or_(
                    PaymentContract.next_deduct_date <= deduct_before.date(),
                    PaymentContract.next_deduct_date.is_(None)
                )
            )
        ).all()

    def activate_subscription(self, subscription: Subscription) -> bool:
        """
        激活订阅（统一的激活入口）
        状态变为 ACTIVE 时自动发放权益，确保幂等性

        Args:
            subscription: 待激活的订阅

        Returns:
            是否成功
        """
        try:
            # 已激活状态，检查是否需要补发权益
            if subscription.status == SubscriptionStatus.ACTIVE:
                if subscription.benefits_granted == 0:
                    self._grant_benefits_internal(subscription)
                return True

            # 更新状态为激活
            subscription.status = SubscriptionStatus.ACTIVE
            subscription.update_time = datetime.now()

            # 自动发放权益
            self._grant_benefits_internal(subscription)

            logger.info(f"[SubscriptionService] 订阅激活成功: subscription_id={subscription.id}")
            return True

        except Exception as e:
            logger.error(f"[SubscriptionService] 订阅激活失败: {str(e)}")
            return False

    def _grant_benefits_internal(self, subscription: Subscription):
        """
        内部权益发放方法（带幂等性检查）

        Args:
            subscription: 已生效的订阅
        """
        try:
            # 幂等性检查：已发放则跳过
            if subscription.benefits_granted == 1:
                logger.debug(f"[SubscriptionService] 权益已发放，跳过: subscription_id={subscription.id}")
                return

            # 1. 发放积分
            if subscription.points_amount and subscription.points_amount > 0:
                PointsService.add_points(
                    db=self.db,
                    user_id=subscription.user_id,
                    amount=subscription.points_amount,
                    source_type='membership_benefit',
                    source_id=str(subscription.id),
                    remark=f'会员权益发放: {subscription.level_code}'
                )
                logger.info(f"[SubscriptionService] 发放积分: user_id={subscription.user_id}, points={subscription.points_amount}")

            # 2. 更新用户会员状态
            self._update_user_membership(subscription.user_id)

            # 3. 标记已发放权益
            subscription.benefits_granted = 1

            logger.info(f"[SubscriptionService] 权益发放完成: subscription_id={subscription.id}")

        except Exception as e:
            logger.error(f"[SubscriptionService] 权益发放失败: {str(e)}")
            # 不抛出异常，避免影响主流程

    def grant_benefits(self, subscription: Subscription):
        """
        发放订阅权益（保留用于手动触发/补发场景）

        Args:
            subscription: 已生效的订阅
        """
        self._grant_benefits_internal(subscription)
