from sqlalchemy import Column, Integer, String, DateTime, Boolean, DECIMAL, Text, JSON, BigInteger
from sqlalchemy.sql import func
from backend.passport.app.db.session import Base

class MembershipPackage(Base):
    __tablename__ = "membership_packages"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    name = Column(String(50), nullable=False) # 套餐名称
    description = Column(String(255), nullable=True) # 套餐说明
    price = Column(DECIMAL(10, 2), nullable=False) # 月度定价
    original_price = Column(DECIMAL(10, 2), nullable=True) # 原价（用于展示优惠力度）
    rights = Column(Text, nullable=True) # 权益列表（500字的大字段）

    status = Column(String(20), default="enabled") # 状态：enabled（启动）、disabled（禁止）
    type = Column(String(20), nullable=False) # 类型：ordinary（普通会员）、professional（专业会员）、enterprise（企业会员）
    points = Column(Integer, nullable=False, default=0) # 每月赠送积分

    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())

class UserMembership(Base):
    __tablename__ = "user_memberships"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    user_id = Column(BigInteger, index=True, nullable=False)
    package_id = Column(BigInteger, index=True, nullable=False)
    
    start_time = Column(DateTime, nullable=False)
    end_time = Column(DateTime, nullable=False)
    
    status = Column(Integer, default=1) # 1:生效中, 0:已过期, -1:已退订
    auto_renew = Column(Boolean, default=False)
    
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
