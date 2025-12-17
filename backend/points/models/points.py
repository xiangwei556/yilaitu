from sqlalchemy import Column, Integer, String, DateTime, Boolean, DECIMAL, JSON, BigInteger, ForeignKey
from sqlalchemy.sql import func
from backend.passport.app.db.session import Base

class PointsAccount(Base):
    __tablename__ = "points_accounts"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    user_id = Column(BigInteger, unique=True, index=True, nullable=False)
    balance_permanent = Column(DECIMAL(10, 2), default=0) # 永久积分
    balance_limited = Column(DECIMAL(10, 2), default=0) # 限时积分
    version = Column(Integer, default=1) # 乐观锁
    
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())

class PointsPackage(Base):
    __tablename__ = "points_packages"
    
    id = Column(BigInteger, primary_key=True, autoincrement=True)
    name = Column(String(50), nullable=False) # 积分包名称
    points = Column(Integer, nullable=False) # 点数
    price = Column(DECIMAL(10, 2), nullable=True) # 售价，可为空
    original_price = Column(DECIMAL(10, 2), nullable=True) # 原价，可为空
    description = Column(String(100), nullable=True) # 消耗说明
    is_active = Column(Boolean, default=True) # 状态：启用/禁止
    validity_days = Column(Integer, nullable=False, default=0) # 有效期天数，0表示永久
    package_type = Column(String(20), nullable=False, default="system") # 积分包类型：system、festival、share、invite
    
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())

class PointsRule(Base):
    __tablename__ = "points_rules"
    
    id = Column(BigInteger, primary_key=True, autoincrement=True)
    code = Column(String(50), unique=True, index=True) # 规则代码，如 sign_in
    name = Column(String(100), nullable=False)
    type = Column(String(20), nullable=False) # task, monthly, event
    amount = Column(Integer, default=0)
    condition = Column(JSON, nullable=True) # 触发条件
    frequency = Column(String(20), default="unlimited") # once, daily, unlimited
    description = Column(String(255), nullable=True) # 规则说明
    
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())

class PointsTransaction(Base):
    __tablename__ = "points_transactions"
    
    id = Column(BigInteger, primary_key=True, autoincrement=True)
    user_id = Column(BigInteger, index=True, nullable=False)
    type = Column(String(20), nullable=False) # earn, burn
    amount = Column(DECIMAL(10, 2), nullable=False)
    balance_after = Column(DECIMAL(10, 2), nullable=False)
    
    source_type = Column(String(50)) # order, task, admin_adjust
    source_id = Column(String(50)) # 关联ID
    
    remark = Column(String(255))
    expire_at = Column(DateTime, nullable=True) # 过期时间
    
    created_at = Column(DateTime, default=func.now())
