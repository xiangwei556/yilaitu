from sqlalchemy import Column, Integer, String, DateTime, Boolean, Enum
from sqlalchemy.sql import func
from app.database import Base
import enum

class UserRole(str, enum.Enum):
    """User role enumeration"""
    USER = "user"
    ADMIN = "admin"
    VIP = "vip"

class User(Base):
    """User model"""
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    phone = Column(String(11), unique=True, index=True)
    nickname = Column(String(50), nullable=True)
    avatar = Column(String(255), nullable=True)
    password_hash = Column(String(128), nullable=True)
    wechat_openid = Column(String(50), unique=True, nullable=True)
    wechat_unionid = Column(String(50), unique=True, nullable=True)
    role = Column(Enum(UserRole), default=UserRole.USER)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    vip_expire_at = Column(DateTime(timezone=True), nullable=True)