from sqlalchemy import Column, Integer, String, DateTime, Boolean, DECIMAL, BigInteger
from sqlalchemy.sql import func
from backend.passport.app.db.session import Base

class Order(Base):
    __tablename__ = "orders"

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
    
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
