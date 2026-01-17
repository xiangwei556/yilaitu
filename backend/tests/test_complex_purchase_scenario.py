"""
复杂购买场景测试
模拟用户连续购买：普通会员 -> 专业会员 -> 普通会员 -> 专业会员 -> 专业会员
验证订阅生效链的正确性
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from datetime import datetime, timedelta
from typing import List, Optional


class MockSubscription:
    """模拟订阅对象"""
    _id_counter = 0

    def __init__(self, level_code: str, level_weight: int, status: str,
                 is_compensation: int = 0, cycle_days: int = 30):
        MockSubscription._id_counter += 1
        self.id = MockSubscription._id_counter
        self.subscription_sn = f"SUB{datetime.now().strftime('%Y%m%d')}{self.id:04d}"
        self.level_code = level_code
        self.level_weight = level_weight
        self.status = status  # ACTIVE, PENDING, PAUSED, COMPLETED
        self.is_compensation = is_compensation
        self.cycle_days = cycle_days
        self.create_time = datetime.now()
        self.expiration_time = datetime.now() + timedelta(days=cycle_days)
        self.previous_id = None
        self.next_id = None
        self.paused_remaining_days = None

    def __repr__(self):
        comp_mark = "(补偿)" if self.is_compensation else ""
        return f"[{self.status}] {self.level_code}{comp_mark} (权重:{self.level_weight}, ID:{self.id})"


class MockChainManager:
    """模拟生效链管理器"""

    def __init__(self):
        self.subscriptions: List[MockSubscription] = []

    def get_level_weight(self, level_code: str) -> int:
        """获取等级权重"""
        weights = {
            'free': 0,
            'ordinary': 10,
            'professional': 30,
            'enterprise': 50,
        }
        return weights.get(level_code, 10)

    def get_active_subscription(self) -> Optional[MockSubscription]:
        """获取当前生效的订阅"""
        for sub in self.subscriptions:
            if sub.status == 'ACTIVE':
                return sub
        return None

    def get_pending_subscriptions(self) -> List[MockSubscription]:
        """获取待生效的订阅列表"""
        return [s for s in self.subscriptions if s.status == 'PENDING']

    def insert_subscription(self, new_sub: MockSubscription) -> str:
        """
        插入新订阅到生效链
        返回插入结果类型
        """
        current_active = self.get_active_subscription()

        # 场景1: 没有当前生效订阅 - 立即生效
        if not current_active:
            new_sub.status = 'ACTIVE'
            self.subscriptions.append(new_sub)
            return "immediate_active"

        # 场景2: 升级 - 新订阅权重更高
        if new_sub.level_weight > current_active.level_weight:
            # 暂停当前订阅
            remaining_days = (current_active.expiration_time - datetime.now()).days
            if remaining_days > 0:
                current_active.status = 'PAUSED'
                current_active.paused_remaining_days = remaining_days

                # 创建补偿订阅
                compensation = MockSubscription(
                    level_code=current_active.level_code,
                    level_weight=current_active.level_weight,
                    status='PENDING',
                    is_compensation=1,
                    cycle_days=remaining_days
                )
                self.subscriptions.append(compensation)
            else:
                current_active.status = 'COMPLETED'

            # 新订阅立即生效
            new_sub.status = 'ACTIVE'
            self.subscriptions.append(new_sub)
            return "upgrade_immediate"

        # 场景3: 降级或续费 - 排队等待
        new_sub.status = 'PENDING'
        self.subscriptions.append(new_sub)
        return "queued"

    def get_chain_order(self) -> List[MockSubscription]:
        """
        获取生效链顺序
        排序规则：
        1. 当前生效的在最前
        2. 待生效按优先级排序：等级权重降序 > 非补偿优先 > 创建时间升序
        """
        active = [s for s in self.subscriptions if s.status == 'ACTIVE']
        pending = [s for s in self.subscriptions if s.status == 'PENDING']
        paused = [s for s in self.subscriptions if s.status == 'PAUSED']
        completed = [s for s in self.subscriptions if s.status == 'COMPLETED']

        # 对待生效订阅排序
        pending.sort(key=lambda x: (-x.level_weight, x.is_compensation, x.create_time))

        return active + pending + paused + completed

    def print_chain_status(self):
        """打印生效链状态"""
        print("\n" + "="*70)
        print("订阅生效链状态")
        print("="*70)

        chain = self.get_chain_order()

        print(f"\n总订阅数: {len(self.subscriptions)}")
        print(f"  - 生效中: {len([s for s in self.subscriptions if s.status == 'ACTIVE'])}")
        print(f"  - 待生效: {len([s for s in self.subscriptions if s.status == 'PENDING'])}")
        print(f"  - 已暂停: {len([s for s in self.subscriptions if s.status == 'PAUSED'])}")
        print(f"  - 已完成: {len([s for s in self.subscriptions if s.status == 'COMPLETED'])}")

        print("\n" + "-"*70)
        print("生效顺序 (从上到下依次生效):")
        print("-"*70)

        order = 1
        for sub in chain:
            if sub.status in ['ACTIVE', 'PENDING']:
                comp_mark = " [补偿订阅]" if sub.is_compensation else ""
                status_mark = " <-- 当前生效" if sub.status == 'ACTIVE' else ""
                print(f"  {order}. {sub.level_code} (权重:{sub.level_weight}){comp_mark}{status_mark}")
                print(f"     订阅号: {sub.subscription_sn}")
                print(f"     周期: {sub.cycle_days}天")
                order += 1

        print("\n" + "-"*70)
        print("已暂停/已完成的订阅:")
        print("-"*70)
        for sub in chain:
            if sub.status in ['PAUSED', 'COMPLETED']:
                print(f"  - {sub.level_code} [{sub.status}]")
                if sub.paused_remaining_days:
                    print(f"    剩余天数: {sub.paused_remaining_days}天 (已转为补偿订阅)")


def run_test():
    """运行测试场景"""
    print("\n" + "="*70)
    print("  复杂购买场景测试")
    print("  模拟: 普通会员 -> 专业会员 -> 普通会员 -> 专业会员 -> 专业会员")
    print("="*70)

    chain_manager = MockChainManager()

    # 购买序列
    purchases = [
        ('ordinary', '普通会员'),
        ('professional', '专业会员'),
        ('ordinary', '普通会员'),
        ('professional', '专业会员'),
        ('professional', '专业会员'),
    ]

    for i, (level_code, name) in enumerate(purchases, 1):
        print(f"\n{'='*70}")
        print(f"第 {i} 次购买: {name}")
        print("="*70)

        level_weight = chain_manager.get_level_weight(level_code)

        # 创建新订阅
        new_sub = MockSubscription(
            level_code=level_code,
            level_weight=level_weight,
            status='PENDING',
            cycle_days=30
        )

        # 获取当前状态
        current_active = chain_manager.get_active_subscription()
        if current_active:
            print(f"当前生效: {current_active.level_code} (权重:{current_active.level_weight})")
            print(f"新购买: {level_code} (权重:{level_weight})")

            if level_weight > current_active.level_weight:
                print("场景判断: 升级 -> 新订阅立即生效，当前订阅暂停并生成补偿")
            elif level_weight < current_active.level_weight:
                print("场景判断: 降级 -> 新订阅排队等待")
            else:
                print("场景判断: 续费 -> 新订阅排队等待")
        else:
            print(f"当前无生效订阅")
            print(f"新购买: {level_code} (权重:{level_weight})")
            print("场景判断: 首购 -> 立即生效")

        # 插入订阅
        result = chain_manager.insert_subscription(new_sub)
        print(f"插入结果: {result}")

    # 打印最终状态
    chain_manager.print_chain_status()

    # 打印详细的生效顺序说明
    print("\n" + "="*70)
    print("生效顺序详细说明")
    print("="*70)

    chain = chain_manager.get_chain_order()
    active_pending = [s for s in chain if s.status in ['ACTIVE', 'PENDING']]

    print(f"""
根据优先级规则排序后的生效顺序:
(规则: 等级权重降序 > 正式订阅优先于补偿订阅 > 创建时间升序)

""")

    for i, sub in enumerate(active_pending, 1):
        comp_text = "补偿订阅" if sub.is_compensation else "正式订阅"
        status_text = "当前生效" if sub.status == 'ACTIVE' else "等待生效"
        print(f"{i}. {sub.level_code} ({comp_text})")
        print(f"   权重: {sub.level_weight}, 状态: {status_text}, 周期: {sub.cycle_days}天")
        print()

    print("="*70)
    print("测试完成!")
    print("="*70)


if __name__ == "__main__":
    run_test()
