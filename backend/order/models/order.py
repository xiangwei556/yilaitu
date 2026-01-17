from sqlalchemy import Column, Integer, String, DateTime, Boolean, DECIMAL, BigInteger, Text, Index
from sqlalchemy.sql import func
from backend.passport.app.db.session import Base


class Order(Base):
    """预订单表 - 存储待支付的订单"""
    __tablename__ = "order_reservation"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    order_no = Column(String(50), unique=True, index=True, nullable=False)
    user_id = Column(BigInteger, index=True, nullable=False)

    amount = Column(DECIMAL(10, 2), nullable=False)
    original_amount = Column(DECIMAL(10, 2), nullable=True)

    type = Column(String(20), nullable=False) # membership, membership_upgrade, points
    status = Column(String(20), default="pending") # pending, paid, cancelled, refunded

    product_id = Column(BigInteger) # 关联的商品ID (package_id)
    product_snapshot = Column(String(1000)) # 商品快照JSON

    payment_method = Column(String(20)) # wechat, alipay
    payment_time = Column(DateTime, nullable=True)

    # 支付相关字段
    payment_no = Column(String(100), index=True, nullable=True) # 支付平台订单号
    qr_code_url = Column(Text, nullable=True) # 支付二维码URL
    qr_code_expire_at = Column(DateTime, nullable=True) # 二维码过期时间
    callback_data = Column(Text, nullable=True) # 支付回调原始数据(JSON)
    notify_url = Column(String(255), nullable=True) # 支付回调通知地址
    expire_at = Column(DateTime, nullable=True) # 订单过期时间
    retry_count = Column(Integer, default=0) # 支付状态查询重试次数

    # 自动扣款相关字段
    is_auto_deduct = Column(Integer, default=0) # 是否自动扣款订单：0-否 1-是
    contract_id = Column(BigInteger, nullable=True) # 关联签约协议ID

    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())

    # 添加复合索引
    __table_args__ = (
        Index('idx_payment_no', 'payment_no'),
        Index('idx_status_created', 'status', 'created_at'),
    )


class OrderPaid(Base):
    """已支付订单表 - 存储支付成功的订单"""
    __tablename__ = "order"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    order_no = Column(String(50), unique=True, index=True, nullable=False)
    user_id = Column(BigInteger, index=True, nullable=False)

    amount = Column(DECIMAL(10, 2), nullable=False)
    original_amount = Column(DECIMAL(10, 2), nullable=True)

    type = Column(String(20), nullable=False) # membership, membership_upgrade, points
    status = Column(String(20), default="paid") # paid, refunded

    product_id = Column(BigInteger) # 关联的商品ID (package_id)
    product_snapshot = Column(String(1000)) # 商品快照JSON

    payment_method = Column(String(20)) # wechat, alipay
    payment_time = Column(DateTime, nullable=True)

    # 支付相关字段
    payment_no = Column(String(100), index=True, nullable=True) # 支付平台订单号
    qr_code_url = Column(Text, nullable=True) # 支付二维码URL
    qr_code_expire_at = Column(DateTime, nullable=True) # 二维码过期时间
    callback_data = Column(Text, nullable=True) # 支付回调原始数据(JSON)
    notify_url = Column(String(255), nullable=True) # 支付回调通知地址
    expire_at = Column(DateTime, nullable=True) # 订单过期时间
    retry_count = Column(Integer, default=0) # 支付状态查询重试次数

    # 自动扣款相关字段
    is_auto_deduct = Column(Integer, default=0) # 是否自动扣款订单：0-否 1-是
    contract_id = Column(BigInteger, nullable=True) # 关联签约协议ID

    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())

    # 添加复合索引
    __table_args__ = (
        Index('idx_order_payment_no', 'payment_no'),
        Index('idx_order_status_created', 'status', 'created_at'),
    )


class OrderHistory(Base):
    """订单历史表 - 存储已取消/过期的订单"""
    __tablename__ = "order_history"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    order_no = Column(String(50), unique=True, index=True, nullable=False)
    user_id = Column(BigInteger, index=True, nullable=False)

    amount = Column(DECIMAL(10, 2), nullable=False)
    original_amount = Column(DECIMAL(10, 2), nullable=True)

    type = Column(String(20), nullable=False) # membership, membership_upgrade, points
    status = Column(String(20), default="cancelled") # cancelled, expired

    product_id = Column(BigInteger) # 关联的商品ID (package_id)
    product_snapshot = Column(String(1000)) # 商品快照JSON

    payment_method = Column(String(20)) # wechat, alipay
    payment_time = Column(DateTime, nullable=True)

    # 支付相关字段
    payment_no = Column(String(100), index=True, nullable=True) # 支付平台订单号
    qr_code_url = Column(Text, nullable=True) # 支付二维码URL
    qr_code_expire_at = Column(DateTime, nullable=True) # 二维码过期时间
    callback_data = Column(Text, nullable=True) # 支付回调原始数据(JSON)
    notify_url = Column(String(255), nullable=True) # 支付回调通知地址
    expire_at = Column(DateTime, nullable=True) # 订单过期时间
    retry_count = Column(Integer, default=0) # 支付状态查询重试次数

    # 自动扣款相关字段
    is_auto_deduct = Column(Integer, default=0) # 是否自动扣款订单：0-否 1-是
    contract_id = Column(BigInteger, nullable=True) # 关联签约协议ID

    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())

    # 添加复合索引
    __table_args__ = (
        Index('idx_history_payment_no', 'payment_no'),
        Index('idx_history_status_created', 'status', 'created_at'),
    )
