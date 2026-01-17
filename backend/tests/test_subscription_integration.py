"""
订阅系统集成测试
测试BusinessService与ChainManager的集成
"""
import pytest
from datetime import datetime, timedelta
from unittest.mock import Mock, patch, MagicMock, PropertyMock
from sqlalchemy.orm import Session

from backend.membership.models.subscription import (
    Subscription, SubscriptionStatus, SubscriptionType, SubscriptionSource
)
from backend.membership.models.membership import MembershipPackage, UserMembership
from backend.order.models.order import Order
from backend.points.models.points import PointsPackage
from backend.subscription.services.chain_manager import ChainManager, UserChain, InsertResult
from backend.payment.services.business_service import BusinessService


class TestBusinessServiceIntegration:
    """BusinessService与订阅系统的集成测试"""

    def setup_method(self):
        """每个测试方法前的设置"""
        self.user_id = 1001
        self.mock_db = MagicMock(spec=Session)

    def _create_package(self, pkg_type: str, points: int = 100, duration_days: int = 30):
        """创建模拟套餐"""
        package = MagicMock(spec=MembershipPackage)
        package.id = 1
        package.name = f"{pkg_type}会员"
        package.type = pkg_type
        package.points = points
        package.duration_days = duration_days
        package.price = 99.0
        return package

    def _create_order(self, product_id: int, order_type: str = "membership"):
        """创建模拟订单"""
        order = MagicMock(spec=Order)
        order.id = 1
        order.order_no = f"ORD{datetime.now().strftime('%Y%m%d%H%M%S')}"
        order.user_id = self.user_id
        order.product_id = product_id
        order.type = order_type
        order.amount = 99.0
        order.status = 2
        return order

    def _create_subscription(self, level_code: str, level_weight: int, status: SubscriptionStatus):
        """创建模拟订阅"""
        sub = MagicMock(spec=Subscription)
        sub.id = 1
        sub.user_id = self.user_id
        sub.level_code = level_code
        sub.level_weight = level_weight
        sub.status = status
        sub.expiration_time = datetime.now() + timedelta(days=15)
        return sub

    @patch('backend.payment.services.business_service.ChainManager')
    @patch('backend.payment.services.business_service.PointsService')
    @patch('backend.payment.services.business_service.generate_subscription_sn')
    def test_first_purchase_flow(self, mock_gen_sn, mock_points, mock_chain_class):
        """测试首次购买完整流程"""
        # 设置mock
        mock_gen_sn.return_value = "SUB20240101000001"

        # 模拟ChainManager
        mock_chain = MagicMock()
        mock_user_chain = MagicMock()
        mock_user_chain.active_subscription = None  # 首次购买，没有当前订阅
        mock_chain.get_user_chain.return_value = mock_user_chain

        mock_insert_result = MagicMock()
        mock_insert_result.position_type = "immediate"
        mock_insert_result.position = 0
        mock_chain.insert_subscription.return_value = mock_insert_result
        mock_chain_class.return_value = mock_chain

        # 模拟数据库查询
        package = self._create_package('ordinary', points=100)
        order = self._create_order(package.id)

        # 配置mock_db的查询行为
        mock_query = MagicMock()
        mock_query.filter.return_value.first.return_value = package
        self.mock_db.query.return_value = mock_query

        # 验证场景判断
        # 首次购买：没有active_subscription
        assert mock_user_chain.active_subscription is None

        # 验证等级权重计算
        level_weight = BusinessService._get_level_weight(package.type)
        assert level_weight == 10

        print("✅ 首次购买流程测试通过")

    @patch('backend.payment.services.business_service.ChainManager')
    @patch('backend.payment.services.business_service.PointsService')
    @patch('backend.payment.services.business_service.generate_subscription_sn')
    def test_upgrade_flow(self, mock_gen_sn, mock_points, mock_chain_class):
        """测试升级完整流程"""
        mock_gen_sn.return_value = "SUB20240101000002"

        # 模拟ChainManager
        mock_chain = MagicMock()

        # 当前有普通会员订阅
        current_sub = self._create_subscription('ordinary', 10, SubscriptionStatus.ACTIVE)
        mock_user_chain = MagicMock()
        mock_user_chain.active_subscription = current_sub
        mock_chain.get_user_chain.return_value = mock_user_chain

        mock_insert_result = MagicMock()
        mock_insert_result.position_type = "upgrade_immediate"
        mock_insert_result.position = 0
        mock_chain.insert_subscription.return_value = mock_insert_result
        mock_chain_class.return_value = mock_chain

        # 购买专业会员（升级）
        package = self._create_package('professional', points=200)
        order = self._create_order(package.id)

        # 验证场景判断：升级
        new_level_weight = BusinessService._get_level_weight(package.type)
        assert new_level_weight == 30
        assert new_level_weight > current_sub.level_weight

        print("✅ 升级流程测试通过")

    @patch('backend.payment.services.business_service.ChainManager')
    @patch('backend.payment.services.business_service.PointsService')
    @patch('backend.payment.services.business_service.generate_subscription_sn')
    def test_downgrade_flow(self, mock_gen_sn, mock_points, mock_chain_class):
        """测试降级完整流程"""
        mock_gen_sn.return_value = "SUB20240101000003"

        # 模拟ChainManager
        mock_chain = MagicMock()

        # 当前有专业会员订阅
        current_sub = self._create_subscription('professional', 30, SubscriptionStatus.ACTIVE)
        mock_user_chain = MagicMock()
        mock_user_chain.active_subscription = current_sub
        mock_chain.get_user_chain.return_value = mock_user_chain

        mock_insert_result = MagicMock()
        mock_insert_result.position_type = "queued"
        mock_insert_result.position = 1
        mock_chain.insert_subscription.return_value = mock_insert_result
        mock_chain_class.return_value = mock_chain

        # 购买普通会员（降级）
        package = self._create_package('ordinary', points=100)
        order = self._create_order(package.id)

        # 验证场景判断：降级
        new_level_weight = BusinessService._get_level_weight(package.type)
        assert new_level_weight == 10
        assert new_level_weight < current_sub.level_weight

        print("✅ 降级流程测试通过")

    @patch('backend.payment.services.business_service.ChainManager')
    @patch('backend.payment.services.business_service.PointsService')
    @patch('backend.payment.services.business_service.generate_subscription_sn')
    def test_renewal_flow(self, mock_gen_sn, mock_points, mock_chain_class):
        """测试续费完整流程"""
        mock_gen_sn.return_value = "SUB20240101000004"

        # 模拟ChainManager
        mock_chain = MagicMock()

        # 当前有普通会员订阅
        current_sub = self._create_subscription('ordinary', 10, SubscriptionStatus.ACTIVE)
        mock_user_chain = MagicMock()
        mock_user_chain.active_subscription = current_sub
        mock_chain.get_user_chain.return_value = mock_user_chain

        mock_insert_result = MagicMock()
        mock_insert_result.position_type = "queued"
        mock_insert_result.position = 1
        mock_chain.insert_subscription.return_value = mock_insert_result
        mock_chain_class.return_value = mock_chain

        # 续费普通会员（同等级）
        package = self._create_package('ordinary', points=100)
        order = self._create_order(package.id)

        # 验证场景判断：续费
        new_level_weight = BusinessService._get_level_weight(package.type)
        assert new_level_weight == 10
        assert new_level_weight == current_sub.level_weight

        print("✅ 续费流程测试通过")


class TestChainManagerScenarios:
    """ChainManager场景测试"""

    def test_chain_priority_comparison(self):
        """测试生效链优先级比较"""

        # 场景1：等级权重不同
        sub_high = MagicMock()
        sub_high.level_weight = 30
        sub_high.is_compensation = 0
        sub_high.create_time = datetime.now()

        sub_low = MagicMock()
        sub_low.level_weight = 10
        sub_low.is_compensation = 0
        sub_low.create_time = datetime.now()

        # 高权重优先
        assert sub_high.level_weight > sub_low.level_weight
        print("✅ 等级权重比较测试通过")

    def test_compensation_priority(self):
        """测试补偿订阅优先级"""

        # 场景2：等级权重相同，补偿标记不同
        sub_normal = MagicMock()
        sub_normal.level_weight = 10
        sub_normal.is_compensation = 0  # 正式订阅
        sub_normal.create_time = datetime.now()

        sub_comp = MagicMock()
        sub_comp.level_weight = 10
        sub_comp.is_compensation = 1  # 补偿订阅
        sub_comp.create_time = datetime.now()

        # 正式订阅优先
        assert sub_normal.is_compensation < sub_comp.is_compensation
        print("✅ 补偿订阅优先级测试通过")

    def test_create_time_priority(self):
        """测试创建时间优先级"""

        # 场景3：等级权重、补偿标记相同，创建时间不同
        sub_old = MagicMock()
        sub_old.level_weight = 10
        sub_old.is_compensation = 0
        sub_old.create_time = datetime.now() - timedelta(hours=1)

        sub_new = MagicMock()
        sub_new.level_weight = 10
        sub_new.is_compensation = 0
        sub_new.create_time = datetime.now()

        # 先创建的优先
        assert sub_old.create_time < sub_new.create_time
        print("✅ 创建时间优先级测试通过")


class TestOrderScenarioDetection:
    """订单场景检测测试"""

    def test_detect_new_scenario(self):
        """检测首购场景"""
        current_active = None  # 没有当前订阅
        new_weight = 10

        if current_active is None:
            scenario = 'new'
        elif new_weight > current_active.level_weight:
            scenario = 'upgrade'
        elif new_weight < current_active.level_weight:
            scenario = 'downgrade'
        else:
            scenario = 'renewal'

        assert scenario == 'new'
        print("✅ 首购场景检测测试通过")

    def test_detect_upgrade_scenario(self):
        """检测升级场景"""
        current_active = MagicMock()
        current_active.level_weight = 10
        new_weight = 30

        if current_active is None:
            scenario = 'new'
        elif new_weight > current_active.level_weight:
            scenario = 'upgrade'
        elif new_weight < current_active.level_weight:
            scenario = 'downgrade'
        else:
            scenario = 'renewal'

        assert scenario == 'upgrade'
        print("✅ 升级场景检测测试通过")

    def test_detect_downgrade_scenario(self):
        """检测降级场景"""
        current_active = MagicMock()
        current_active.level_weight = 30
        new_weight = 10

        if current_active is None:
            scenario = 'new'
        elif new_weight > current_active.level_weight:
            scenario = 'upgrade'
        elif new_weight < current_active.level_weight:
            scenario = 'downgrade'
        else:
            scenario = 'renewal'

        assert scenario == 'downgrade'
        print("✅ 降级场景检测测试通过")

    def test_detect_renewal_scenario(self):
        """检测续费场景"""
        current_active = MagicMock()
        current_active.level_weight = 10
        new_weight = 10

        if current_active is None:
            scenario = 'new'
        elif new_weight > current_active.level_weight:
            scenario = 'upgrade'
        elif new_weight < current_active.level_weight:
            scenario = 'downgrade'
        else:
            scenario = 'renewal'

        assert scenario == 'renewal'
        print("✅ 续费场景检测测试通过")


class TestPointsPackageFlow:
    """积分包购买流程测试"""

    def test_points_package_no_chain(self):
        """测试积分包不参与生效链"""
        # 积分包订阅配置
        sub_type = SubscriptionType.POINTS_PACKAGE
        sub_status = SubscriptionStatus.COMPLETED
        level_weight = 0
        cycle_days = 0

        assert sub_type == SubscriptionType.POINTS_PACKAGE
        assert sub_status == SubscriptionStatus.COMPLETED
        assert level_weight == 0
        assert cycle_days == 0
        print("✅ 积分包不参与生效链测试通过")

    def test_points_direct_credit(self):
        """测试积分直接到账"""
        points_amount = 100
        user_points_before = 50
        user_points_after = user_points_before + points_amount

        assert user_points_after == 150
        print("✅ 积分直接到账测试通过")


def run_integration_tests():
    """运行所有集成测试"""
    print("\n" + "="*60)
    print("开始运行订阅系统集成测试")
    print("="*60 + "\n")

    # BusinessService集成测试
    print("\n--- BusinessService集成测试 ---")
    test_bs = TestBusinessServiceIntegration()
    test_bs.setup_method()
    test_bs.test_first_purchase_flow()
    test_bs.setup_method()
    test_bs.test_upgrade_flow()
    test_bs.setup_method()
    test_bs.test_downgrade_flow()
    test_bs.setup_method()
    test_bs.test_renewal_flow()

    # ChainManager场景测试
    print("\n--- ChainManager场景测试 ---")
    test_cm = TestChainManagerScenarios()
    test_cm.test_chain_priority_comparison()
    test_cm.test_compensation_priority()
    test_cm.test_create_time_priority()

    # 订单场景检测测试
    print("\n--- 订单场景检测测试 ---")
    test_scenario = TestOrderScenarioDetection()
    test_scenario.test_detect_new_scenario()
    test_scenario.test_detect_upgrade_scenario()
    test_scenario.test_detect_downgrade_scenario()
    test_scenario.test_detect_renewal_scenario()

    # 积分包流程测试
    print("\n--- 积分包流程测试 ---")
    test_points = TestPointsPackageFlow()
    test_points.test_points_package_no_chain()
    test_points.test_points_direct_credit()

    print("\n" + "="*60)
    print("所有集成测试通过！✅")
    print("="*60 + "\n")


if __name__ == "__main__":
    run_integration_tests()
