"""
签约协议相关模型
- PaymentContract: 自动扣款签约协议表
- AutoDeductRecord: 自动扣款记录表
"""
from sqlalchemy import Column, Integer, String, DateTime, DECIMAL, BigInteger, Text, Index, SmallInteger, Date
from sqlalchemy.sql import func
from backend.passport.app.db.session import Base


class ContractStatus:
    """签约协议状态"""
    SIGNING = 0      # 签约中
    SIGNED = 1       # 已签约
    UNSIGNED = 2     # 已解约
    SIGN_FAILED = 3  # 签约失败


class DeductRecordStatus:
    """扣款记录状态"""
    PENDING = 0          # 待扣款
    NOTIFIED = 1         # 预通知已发
    DEDUCTING = 2        # 扣款中
    SUCCESS = 3          # 成功
    FAILED = 4           # 失败


class PaymentContract(Base):
    """自动扣款签约协议表"""
    __tablename__ = "payment_contract"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    contract_sn = Column(String(32), nullable=False, unique=True, comment='协议流水号')
    user_id = Column(BigInteger, nullable=False, index=True, comment='用户ID')

    # 支付平台信息
    payment_method = Column(String(20), nullable=False, comment='支付方式：wechat/alipay')
    contract_id = Column(String(64), index=True, comment='支付平台返回的协议ID')
    contract_code = Column(String(64), comment='商户侧协议号')
    plan_id = Column(String(32), comment='微信签约模板ID/支付宝签约场景码')

    # 协议状态
    status = Column(SmallInteger, nullable=False, default=ContractStatus.SIGNING,
                    comment='状态：0-签约中 1-已签约 2-已解约 3-签约失败')
    signed_time = Column(DateTime, comment='签约成功时间')
    unsigned_time = Column(DateTime, comment='解约时间')
    unsigned_reason = Column(String(255), comment='解约原因')

    # 签约场景
    product_type = Column(String(20), nullable=False, comment='产品类型：membership/points')
    product_id = Column(BigInteger, comment='关联商品ID')
    display_account = Column(String(64), comment='签约展示账号')

    # 扣款配置
    deduct_amount = Column(DECIMAL(10, 2), comment='扣款金额')
    deduct_cycle = Column(Integer, default=30, comment='扣款周期(天)')
    next_deduct_date = Column(Date, comment='下次扣款日期')
    last_deduct_time = Column(DateTime, comment='上次扣款时间')
    deduct_fail_count = Column(Integer, default=0, comment='连续扣款失败次数')

    # 用户标识
    openid = Column(String(64), comment='微信openid')
    alipay_user_id = Column(String(64), comment='支付宝用户ID')

    # 元数据
    extra_data = Column(Text, comment='扩展数据JSON')
    create_time = Column(DateTime, nullable=False, default=func.now())
    update_time = Column(DateTime, nullable=False, default=func.now(), onupdate=func.now())

    __table_args__ = (
        Index('idx_contract_user_status', 'user_id', 'status'),
        Index('idx_contract_next_deduct', 'status', 'next_deduct_date'),
    )


class AutoDeductRecord(Base):
    """自动扣款记录表"""
    __tablename__ = "auto_deduct_record"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    record_sn = Column(String(32), nullable=False, unique=True, comment='记录流水号')
    contract_id = Column(BigInteger, nullable=False, index=True, comment='关联签约协议ID')
    user_id = Column(BigInteger, nullable=False, index=True, comment='用户ID')
    subscription_id = Column(BigInteger, comment='关联订阅ID')
    order_id = Column(BigInteger, comment='关联订单ID')

    # 扣款信息
    amount = Column(DECIMAL(10, 2), nullable=False, comment='扣款金额')
    payment_method = Column(String(20), nullable=False, comment='支付方式：wechat/alipay')
    out_trade_no = Column(String(64), index=True, comment='商户订单号')
    transaction_id = Column(String(64), comment='支付平台交易号')

    # 状态
    status = Column(SmallInteger, nullable=False, default=DeductRecordStatus.PENDING,
                    comment='状态：0-待扣款 1-预通知已发 2-扣款中 3-成功 4-失败')
    notify_time = Column(DateTime, comment='预通知发送时间')
    deduct_time = Column(DateTime, comment='扣款时间')
    complete_time = Column(DateTime, comment='完成时间')

    # 失败信息
    fail_reason = Column(String(255), comment='失败原因')
    fail_code = Column(String(32), comment='失败错误码')
    retry_count = Column(Integer, default=0, comment='重试次数')

    # 回调数据
    callback_data = Column(Text, comment='回调原始数据JSON')

    create_time = Column(DateTime, nullable=False, default=func.now())
    update_time = Column(DateTime, nullable=False, default=func.now(), onupdate=func.now())

    __table_args__ = (
        Index('idx_deduct_status_time', 'status', 'create_time'),
    )
