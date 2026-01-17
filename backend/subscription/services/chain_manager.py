"""
生效链管理器
实现订阅的优先级排序、链式管理、到期流转等核心功能
"""
from typing import Dict, List, Optional, Tuple
from datetime import datetime, timedelta
from dataclasses import dataclass
import logging

from sqlalchemy.orm import Session
from sqlalchemy import and_, or_

from backend.membership.models.subscription import (
    Subscription,
    SubscriptionStatus,
    SubscriptionType,
    SubscriptionSource
)

logger = logging.getLogger(__name__)


@dataclass
class UserChain:
    """用户生效链结构"""
    user_id: int
    active_subscription: Optional[Subscription]  # 当前生效中的订阅
    pending_subscriptions: List[Subscription]    # 待生效订阅列表（按优先级排序）
    paused_subscriptions: List[Subscription]     # 暂停的订阅


@dataclass
class InsertResult:
    """插入结果"""
    inserted_subscription: Subscription
    position: int                                 # 插入位置
    position_type: str                           # IMMEDIATE/QUEUE_INSERT
    affected_subscriptions: List[Subscription]   # 受影响的订阅
    paused_subscriptions: List[Subscription]     # 被暂停的订阅
    cancelled_subscriptions: List[Subscription]  # 被取消的订阅


class SubscriptionPriority:
    """订阅优先级计算器"""

    @staticmethod
    def compare(sub_a: Subscription, sub_b: Subscription) -> int:
        """
        比较两个订阅的优先级

        优先级规则：
        1. 等级权重（level_weight）降序
        2. 是否补偿订阅（正式订阅优先）
        3. 创建时间升序

        Returns:
            > 0: sub_a优先级高于sub_b
            = 0: 优先级相同
            < 0: sub_a优先级低于sub_b
        """
        # 1. 比较等级权重（降序，权重大的优先级高）
        if sub_a.level_weight != sub_b.level_weight:
            return sub_a.level_weight - sub_b.level_weight

        # 2. 比较是否补偿订阅（正式订阅优先）
        if sub_a.is_compensation != sub_b.is_compensation:
            # is_compensation=0是正式订阅，优先级高，返回正数
            return 1 if sub_a.is_compensation == 0 else -1

        # 3. 比较创建时间（早的优先，返回正数）
        if sub_a.create_time != sub_b.create_time:
            return 1 if sub_a.create_time < sub_b.create_time else -1

        return 0

    @staticmethod
    def calculate_score(subscription: Subscription) -> float:
        """
        计算订阅的优先级分数（用于排序）
        分数越大优先级越高

        Returns:
            float: 优先级分数
        """
        # 等级权重 * 10000
        score = subscription.level_weight * 10000

        # 正式订阅加100分
        if subscription.is_compensation == 0:
            score += 100

        # 创建时间越早，分数越高（按毫秒取反）
        if subscription.create_time:
            time_score = 9999999999999 - int(subscription.create_time.timestamp() * 1000)
            score += time_score / 10000000000000  # 归一化到较小范围

        return score


class ChainManager:
    """生效链管理器"""

    def __init__(self, db: Session):
        self.db = db

    def get_user_chain(self, user_id: int, exclude_id: int = None) -> UserChain:
        """
        获取用户的生效链

        Args:
            user_id: 用户ID
            exclude_id: 要排除的订阅ID（用于插入时避免查到正在插入的订阅）

        Returns:
            UserChain: 用户生效链结构
        """
        # 查询生效中的订阅
        active_query = self.db.query(Subscription).filter(
            Subscription.user_id == user_id,
            Subscription.status == SubscriptionStatus.ACTIVE,
            Subscription.type == SubscriptionType.COMBO_PACKAGE
        )
        if exclude_id:
            active_query = active_query.filter(Subscription.id != exclude_id)
        active_sub = active_query.first()

        # 查询待生效的订阅（按优先级排序）
        pending_query = self.db.query(Subscription).filter(
            Subscription.user_id == user_id,
            Subscription.status == SubscriptionStatus.PENDING,
            Subscription.type == SubscriptionType.COMBO_PACKAGE
        )
        if exclude_id:
            pending_query = pending_query.filter(Subscription.id != exclude_id)
        pending_subs = pending_query.order_by(
            Subscription.order_in_queue.asc()
        ).all()

        # 查询暂停的订阅
        paused_query = self.db.query(Subscription).filter(
            Subscription.user_id == user_id,
            Subscription.status == SubscriptionStatus.PAUSED,
            Subscription.type == SubscriptionType.COMBO_PACKAGE
        )
        if exclude_id:
            paused_query = paused_query.filter(Subscription.id != exclude_id)
        paused_subs = paused_query.all()

        return UserChain(
            user_id=user_id,
            active_subscription=active_sub,
            pending_subscriptions=pending_subs,
            paused_subscriptions=paused_subs
        )

    def insert_subscription(
        self,
        subscription: Subscription,
        chain: UserChain = None
    ) -> InsertResult:
        """
        将订阅插入到生效链中

        Args:
            subscription: 待插入的订阅
            chain: 用户生效链（如果不传则自动获取）

        Returns:
            InsertResult: 插入结果
        """
        if chain is None:
            # 排除正在插入的订阅，避免查到自己导致自引用
            chain = self.get_user_chain(subscription.user_id, exclude_id=subscription.id)

        # 自动续费逻辑：新订阅（非补偿）开启自动续费，其他订阅关闭
        if subscription.is_compensation == 0:
            # 关闭该用户所有其他订阅的自动续费
            self.db.query(Subscription).filter(
                Subscription.user_id == subscription.user_id,
                Subscription.id != subscription.id if subscription.id else True
            ).update({Subscription.is_auto_renewal: 0}, synchronize_session=False)
            # 新订阅开启自动续费
            subscription.is_auto_renewal = 1

        result = InsertResult(
            inserted_subscription=subscription,
            position=0,
            position_type='',
            affected_subscriptions=[],
            paused_subscriptions=[],
            cancelled_subscriptions=[]
        )

        # 计算插入位置
        insert_position = self._calculate_insert_position(subscription, chain)

        if insert_position['type'] == 'IMMEDIATE':
            # 需要立即生效
            self._handle_immediate_activation(subscription, chain, insert_position, result)
        else:
            # 插入队列
            self._handle_queue_insertion(subscription, chain, insert_position, result)

        return result

    def _calculate_insert_position(
        self,
        new_subscription: Subscription,
        chain: UserChain
    ) -> Dict:
        """
        计算新订阅的插入位置

        Args:
            new_subscription: 新订阅
            chain: 用户生效链

        Returns:
            Dict: 插入位置信息
        """
        # 规则1：如果没有生效中的订阅，立即生效
        if not chain.active_subscription:
            return {
                'type': 'IMMEDIATE',
                'reason': '无生效中订阅，立即生效',
                'should_pause_current': False
            }

        # 规则2：如果新订阅等级高于当前生效订阅，立即生效
        if new_subscription.level_weight > chain.active_subscription.level_weight:
            return {
                'type': 'IMMEDIATE',
                'reason': '更高等级订阅',
                'should_pause_current': True
            }

        # 规则3：在待生效队列中查找位置
        for index, pending_sub in enumerate(chain.pending_subscriptions):
            if SubscriptionPriority.compare(new_subscription, pending_sub) > 0:
                return {
                    'type': 'QUEUE_INSERT',
                    'index': index,
                    'reason': f'优先级高于第{index+1}个待生效订阅'
                }

        # 规则4：优先级最低，插入队尾
        return {
            'type': 'QUEUE_INSERT',
            'index': len(chain.pending_subscriptions),
            'reason': '优先级最低，插入队尾'
        }

    def _handle_immediate_activation(
        self,
        new_subscription: Subscription,
        chain: UserChain,
        position: Dict,
        result: InsertResult
    ):
        """
        处理立即生效场景

        Args:
            new_subscription: 新订阅
            chain: 用户生效链
            position: 插入位置信息
            result: 结果对象
        """
        result.position_type = 'IMMEDIATE'
        result.position = 0

        compensation_sub = None

        # 如果需要暂停当前生效订阅
        if position.get('should_pause_current') and chain.active_subscription:
            old_active = chain.active_subscription
            old_active.status = SubscriptionStatus.PAUSED
            result.paused_subscriptions.append(old_active)

            # 创建补偿订阅（如果有剩余价值）
            compensation_sub = self._create_compensation_subscription(
                old_active,
                new_subscription
            )

        # 新订阅立即生效（使用统一激活方法，自动发放权益）
        # 延迟导入避免循环依赖
        from backend.subscription.services.subscription_service import SubscriptionService
        subscription_service = SubscriptionService(self.db)
        subscription_service.activate_subscription(new_subscription)
        new_subscription.order_in_queue = 0
        new_subscription.previous_subscription_id = None

        # 设置与待生效队列的链关系
        if chain.pending_subscriptions:
            new_subscription.next_subscription_id = chain.pending_subscriptions[0].id
            chain.pending_subscriptions[0].previous_subscription_id = new_subscription.id
            result.affected_subscriptions.append(chain.pending_subscriptions[0])

        self.db.add(new_subscription)
        self.db.flush()  # 获取新订阅ID

        # 插入补偿订阅到生效链中
        if compensation_sub:
            logger.info(f"[ChainManager] 开始将补偿订阅插入生效链: user_id={chain.user_id}")
            # 注意：不要在这里 add/flush 补偿订阅，否则 get_user_chain 会查到它
            # 导致 insert_subscription 时补偿订阅已经在 pending_subscriptions 中
            # 从而造成自引用（指针指向自己）的死循环

            # 重新获取用户链（因为新订阅已经生效）
            updated_chain = self.get_user_chain(chain.user_id)
            # insert_subscription 内部会调用 db.add，所以这里不需要提前 add
            comp_insert_result = self.insert_subscription(compensation_sub, updated_chain)

            result.affected_subscriptions.append(compensation_sub)
            logger.info(f"[ChainManager] 补偿订阅插入完成: sub_id={compensation_sub.id}, position={comp_insert_result.position}")

        # 重新计算链的到期时间
        self.recalculate_chain_times(chain.user_id)

        # 重新更新用户会员信息（确保 end_time 是重算后的正确值）
        subscription_service._update_user_membership(chain.user_id)

        logger.info(f"[ChainManager] 订阅立即生效: user_id={chain.user_id}, sub_id={new_subscription.id}")

    def _handle_queue_insertion(
        self,
        new_subscription: Subscription,
        chain: UserChain,
        position: Dict,
        result: InsertResult
    ):
        """
        处理排队插入场景

        Args:
            new_subscription: 新订阅
            chain: 用户生效链
            position: 插入位置信息
            result: 结果对象
        """
        result.position_type = 'QUEUE_INSERT'
        result.position = position['index']

        index = position['index']
        pending_queue = chain.pending_subscriptions

        # 获取前后订阅
        prev_sub = None
        next_sub = None

        if index == 0:
            # 插入队首
            prev_sub = chain.active_subscription
            next_sub = pending_queue[0] if pending_queue else None
        elif index >= len(pending_queue):
            # 插入队尾
            prev_sub = pending_queue[-1] if pending_queue else chain.active_subscription
            next_sub = None
        else:
            # 插入中间
            prev_sub = pending_queue[index - 1]
            next_sub = pending_queue[index]

        # 设置新订阅的链关系
        new_subscription.status = SubscriptionStatus.PENDING
        new_subscription.previous_subscription_id = prev_sub.id if prev_sub else None
        new_subscription.next_subscription_id = next_sub.id if next_sub else None
        new_subscription.order_in_queue = index + 1  # 生效中的是0

        # 先添加并flush以获取ID（补偿订阅等新订阅需要先获取ID）
        self.db.add(new_subscription)
        self.db.flush()

        # 更新前后订阅的链关系
        if prev_sub:
            prev_sub.next_subscription_id = new_subscription.id
            result.affected_subscriptions.append(prev_sub)

        if next_sub:
            next_sub.previous_subscription_id = new_subscription.id
            result.affected_subscriptions.append(next_sub)

        # 更新后续订阅的顺序号
        for i, sub in enumerate(pending_queue[index:], start=index + 2):
            sub.order_in_queue = i
            result.affected_subscriptions.append(sub)

        # 重新计算从prev_sub开始的到期时间
        if prev_sub:
            self.recalculate_chain_times_from(chain.user_id, prev_sub.id)
        else:
            self.recalculate_chain_times(chain.user_id)

        # 更新用户会员信息（更新 end_time 为生效链最终到期时间）
        from backend.subscription.services.subscription_service import SubscriptionService
        subscription_service = SubscriptionService(self.db)
        subscription_service._update_user_membership(chain.user_id)

        logger.info(f"[ChainManager] 订阅插入队列: user_id={chain.user_id}, sub_id={new_subscription.id}, position={index}")

    def _create_compensation_subscription(
        self,
        paused_subscription: Subscription,
        new_subscription: Subscription
    ) -> Optional[Subscription]:
        """
        创建补偿订阅

        当高等级订阅打断低等级订阅时，为被打断的订阅创建补偿

        Args:
            paused_subscription: 被暂停的订阅
            new_subscription: 新的高等级订阅

        Returns:
            Subscription or None: 补偿订阅，如果无需补偿则返回None
        """
        # 计算剩余天数
        now = datetime.now()
        if paused_subscription.expiration_time <= now:
            return None  # 已过期，无需补偿

        remaining_days = (paused_subscription.expiration_time - now).days
        if remaining_days <= 0:
            return None

        # 创建补偿订阅
        compensation = Subscription(
            subscription_sn=f"COMP_{paused_subscription.subscription_sn}",
            user_id=paused_subscription.user_id,
            order_id=paused_subscription.order_id,
            type=SubscriptionType.COMBO_PACKAGE,
            level_code=paused_subscription.level_code,
            level_weight=paused_subscription.level_weight,
            points_amount=0,  # 补偿订阅不再赠送积分
            status=SubscriptionStatus.PENDING,
            cycle_days=remaining_days,
            is_compensation=1,
            subscription_source=SubscriptionSource.UPGRADE_COMP,
            expiration_time=now + timedelta(days=remaining_days),  # 临时值，会被重新计算
            is_auto_renewal=0
        )

        logger.info(f"[ChainManager] 创建补偿订阅: user_id={paused_subscription.user_id}, days={remaining_days}")

        return compensation

    def recalculate_chain_times(self, user_id: int):
        """
        重新计算用户整个生效链的到期时间

        Args:
            user_id: 用户ID
        """
        chain = self.get_user_chain(user_id)

        if not chain.active_subscription:
            return

        # 从生效中订阅开始
        current_end_time = chain.active_subscription.expiration_time

        # 依次计算待生效订阅的到期时间
        for sub in chain.pending_subscriptions:
            sub.expiration_time = current_end_time + timedelta(days=sub.cycle_days)
            current_end_time = sub.expiration_time

        self.db.flush()

        logger.debug(f"[ChainManager] 重新计算生效链时间: user_id={user_id}")

    def recalculate_chain_times_from(self, user_id: int, start_subscription_id: int):
        """
        从指定订阅开始重新计算到期时间

        Args:
            user_id: 用户ID
            start_subscription_id: 起始订阅ID
        """
        # 获取起始订阅
        start_sub = self.db.query(Subscription).filter(
            Subscription.id == start_subscription_id
        ).first()

        if not start_sub:
            return

        # 获取起始订阅的到期时间作为基准
        current_end_time = start_sub.expiration_time

        # 遍历后续订阅
        next_id = start_sub.next_subscription_id
        while next_id:
            next_sub = self.db.query(Subscription).filter(
                Subscription.id == next_id
            ).first()

            if not next_sub:
                break

            next_sub.expiration_time = current_end_time + timedelta(days=next_sub.cycle_days)
            current_end_time = next_sub.expiration_time
            next_id = next_sub.next_subscription_id

        self.db.flush()

    def remove_from_chain(self, subscription_id: int) -> bool:
        """
        从生效链中移除订阅

        Args:
            subscription_id: 订阅ID

        Returns:
            bool: 是否成功移除
        """
        sub = self.db.query(Subscription).filter(
            Subscription.id == subscription_id
        ).first()

        if not sub:
            return False

        prev_id = sub.previous_subscription_id
        next_id = sub.next_subscription_id

        # 修复前后订阅的链关系
        if prev_id:
            prev_sub = self.db.query(Subscription).filter(
                Subscription.id == prev_id
            ).first()
            if prev_sub:
                prev_sub.next_subscription_id = next_id

        if next_id:
            next_sub = self.db.query(Subscription).filter(
                Subscription.id == next_id
            ).first()
            if next_sub:
                next_sub.previous_subscription_id = prev_id

        # 清空被移除订阅的链关系
        sub.previous_subscription_id = None
        sub.next_subscription_id = None

        # 重新计算到期时间
        if prev_id:
            self.recalculate_chain_times_from(sub.user_id, prev_id)
        elif next_id:
            self.recalculate_chain_times(sub.user_id)

        logger.info(f"[ChainManager] 从链中移除订阅: sub_id={subscription_id}")

        return True

    def get_chain_visualization(self, user_id: int) -> str:
        """
        获取生效链的可视化字符串（调试用）

        Args:
            user_id: 用户ID

        Returns:
            str: 可视化字符串
        """
        chain = self.get_user_chain(user_id)

        parts = [f"用户 {user_id} 的生效链:"]

        if chain.active_subscription:
            active = chain.active_subscription
            parts.append(
                f"[生效中] ID:{active.id} {active.level_code} "
                f"权重:{active.level_weight} 到期:{active.expiration_time}"
            )
        else:
            parts.append("[无生效中订阅]")

        for i, sub in enumerate(chain.pending_subscriptions, 1):
            parts.append(
                f"  [{i}待生效] ID:{sub.id} {sub.level_code} "
                f"权重:{sub.level_weight} 周期:{sub.cycle_days}天"
            )

        if chain.paused_subscriptions:
            parts.append("已暂停:")
            for sub in chain.paused_subscriptions:
                parts.append(f"  [暂停] ID:{sub.id} {sub.level_code}")

        return '\n'.join(parts)

    def health_check(self, user_id: int) -> Dict:
        """
        检查生效链健康度

        Args:
            user_id: 用户ID

        Returns:
            Dict: 健康检查结果
        """
        chain = self.get_user_chain(user_id)
        issues = []

        # 检查1：确保只有一个生效中订阅
        active_count = self.db.query(Subscription).filter(
            Subscription.user_id == user_id,
            Subscription.status == SubscriptionStatus.ACTIVE,
            Subscription.type == SubscriptionType.COMBO_PACKAGE
        ).count()

        if active_count > 1:
            issues.append(f"存在多个生效中订阅: {active_count}")

        # 检查2：链关系完整性
        if chain.active_subscription and chain.pending_subscriptions:
            if chain.active_subscription.next_subscription_id != chain.pending_subscriptions[0].id:
                issues.append("生效中订阅与第一个待生效订阅链关系断裂")

        # 检查3：待生效订阅的链关系
        for i, sub in enumerate(chain.pending_subscriptions[:-1]):
            next_sub = chain.pending_subscriptions[i + 1]
            if sub.next_subscription_id != next_sub.id:
                issues.append(f"待生效订阅 {sub.id} 与 {next_sub.id} 链关系断裂")
            if next_sub.previous_subscription_id != sub.id:
                issues.append(f"待生效订阅 {next_sub.id} 的前序指针错误")

        # 检查4：顺序号连续性
        for i, sub in enumerate(chain.pending_subscriptions):
            expected_order = i + 1  # 生效中的是0
            if sub.order_in_queue != expected_order:
                issues.append(f"订阅 {sub.id} 顺序号错误: 期望{expected_order}, 实际{sub.order_in_queue}")

        return {
            'user_id': user_id,
            'healthy': len(issues) == 0,
            'issues': issues,
            'active_subscription_id': chain.active_subscription.id if chain.active_subscription else None,
            'pending_count': len(chain.pending_subscriptions),
            'paused_count': len(chain.paused_subscriptions)
        }

    def auto_fix_chain(self, user_id: int) -> Dict:
        """
        自动修复生效链

        Args:
            user_id: 用户ID

        Returns:
            Dict: 修复结果
        """
        chain = self.get_user_chain(user_id)
        fixes = []

        # 修复1：重新排序待生效订阅
        if chain.pending_subscriptions:
            # 按优先级重新排序
            sorted_pending = sorted(
                chain.pending_subscriptions,
                key=lambda x: SubscriptionPriority.calculate_score(x),
                reverse=True
            )

            # 重建链关系
            prev_sub = chain.active_subscription
            for i, sub in enumerate(sorted_pending):
                sub.order_in_queue = i + 1
                sub.previous_subscription_id = prev_sub.id if prev_sub else None
                sub.next_subscription_id = sorted_pending[i + 1].id if i < len(sorted_pending) - 1 else None

                if prev_sub:
                    prev_sub.next_subscription_id = sub.id

                prev_sub = sub

            fixes.append(f"重新排序并修复{len(sorted_pending)}个待生效订阅的链关系")

        # 修复2：重新计算到期时间
        self.recalculate_chain_times(user_id)
        fixes.append("重新计算到期时间")

        self.db.flush()

        logger.info(f"[ChainManager] 自动修复生效链: user_id={user_id}, fixes={fixes}")

        return {
            'user_id': user_id,
            'fixed': True,
            'fixes': fixes
        }
