from sqlalchemy import Column, Integer, String, DateTime, Boolean, BigInteger
from sqlalchemy.sql import func
from backend.passport.app.db.session import Base

class User(Base):
    __tablename__ = "users"

    id = Column(BigInteger, primary_key=True, autoincrement=False)  # 使用generate_user_id()生成
    username = Column(String(50), unique=True, index=True)
    nickname = Column(String(50))
    avatar = Column(String(255))
    gender = Column(Integer, default=0) # 0:未知, 1:男, 2:女
    hashed_password = Column(String(255))
    status = Column(Integer, default=1) # 1:启用, 0:禁用, -1:注销中
    role = Column(String(20), default="user") # user, admin, super_admin
    cancel_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
