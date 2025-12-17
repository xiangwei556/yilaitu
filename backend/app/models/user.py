from sqlalchemy import Column, Integer, String, DateTime, Boolean
from sqlalchemy.sql import func
from app.database import Base

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    email = Column(String(100), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    
    # 用户状态和权限
    is_active = Column(Boolean, default=True)
    is_admin = Column(Boolean, default=False)
    
    # 创建和更新时间
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # 用户配额信息
    credits = Column(Integer, default=1000)  # 初始赠送1000点易点
    max_upload_size = Column(Integer, default=10)  # 最大上传文件大小（MB）
    
    def __repr__(self):
        return f"<User {self.username} ({self.email})>"
