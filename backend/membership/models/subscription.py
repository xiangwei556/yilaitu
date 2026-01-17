from sqlalchemy import Column, Integer, String, DateTime, Boolean, BigInteger, SmallInteger
from sqlalchemy.sql import func
from backend.passport.app.db.session import Base


class SubscriptionStatus:
    """订阅状态"""
    PENDING = 1      # 待生效
    ACTIVE = 2       # 生效中
    COMPLETED = 3    # 已完成
    CANCELLED = 4    # 已取消
    PAUSED = 5       # 已暂停


class SubscriptionType:
    """订阅类型"""
    POINTS_PACKAGE = 1   # 积分包
    COMBO_PACKAGE = 2    # 组合包


class SubscriptionSource:
    """订阅来源"""
    MANUAL = 'MANUAL'                # 手动购买
    AUTO_RENEWAL = 'AUTO_RENEWAL'    # 自动续费
    UPGRADE_COMP = 'UPGRADE_COMP'    # 升级补偿


class Subscription(Base):
    __tablename__ = "subscription"

    # 基础信息
    id = Column(Integer, primary_key=True, autoincrement=True, comment='主键ID')
    subscription_sn = Column(String(32), nullable=False, unique=True, comment='订阅业务流水号')
    user_id = Column(BigInteger, nullable=False, index=True, comment='用户ID')
    order_id = Column(BigInteger, nullable=False, comment='订单ID')

    # 订阅内容
    type = Column(SmallInteger, nullable=False, comment='订阅类型：1-积分包 2-组合包')
    level_code = Column(String(20), comment='会员等级代码')
    level_weight = Column(Integer, nullable=False, default=0, index=True, comment='等级权重（数字越大等级越高）')
    points_amount = Column(Integer, nullable=False, default=0, comment='积分数')

    # 生效链管理
    previous_subscription_id = Column(BigInteger, comment='前序订阅ID')
    next_subscription_id = Column(BigInteger, comment='后序订阅ID')
    order_in_queue = Column(Integer, nullable=False, default=0, comment='队列顺序号')

    # 状态控制
    status = Column(SmallInteger, nullable=False, default=1, index=True, comment='状态：1-待生效 2-生效中 3-已完成 4-已取消 5-已暂停')
    expiration_time = Column(DateTime, nullable=False, index=True, comment='到期时间')
    cycle_days = Column(Integer, nullable=False, comment='周期天数')

    # 业务标记
    is_compensation = Column(SmallInteger, nullable=False, default=0, comment='是否补偿订阅：0-否 1-是')
    subscription_source = Column(String(20), nullable=False, default='MANUAL', comment='订阅来源：MANUAL-手动 AUTO_RENEWAL-自动续费 UPGRADE_COMP-升级补偿')

    # 自动续费
    is_auto_renewal = Column(SmallInteger, nullable=False, default=0, index=True, comment='是否开启自动续费：0-否 1-是')
    auto_renewal_source_id = Column(BigInteger, comment='自动续费来源订阅ID（仅自动续费订阅有此字段）')

    # 权益发放标记
    benefits_granted = Column(SmallInteger, nullable=False, default=0, comment='是否已发放权益：0-否 1-是')

    # 签约协议关联
    contract_id = Column(BigInteger, index=True, comment='关联签约协议ID')

    # 取消信息
    cancel_reason = Column(String(255), comment='取消原因')
    cancel_time = Column(DateTime, comment='取消时间')

    # 乐观锁版本号
    version = Column(Integer, nullable=False, default=0, comment='乐观锁版本号')

    # 时间戳
    create_time = Column(DateTime, nullable=False, default=func.now())
    update_time = Column(DateTime, nullable=False, default=func.now(), onupdate=func.now())
