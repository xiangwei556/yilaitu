from sqlalchemy import Column, String, DateTime, Boolean, BigInteger
from sqlalchemy.sql import func
from backend.passport.app.db.session import Base

class LoginSession(Base):
    __tablename__ = "login_sessions"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    user_id = Column(BigInteger, nullable=False, index=True)
    device_id = Column(String(100)) # 设备指纹
    device_type = Column(String(20)) # web, app, h5, miniprogram
    access_token_jti = Column(String(64), index=True) # JWT ID
    refresh_token = Column(String(128), index=True)
    expires_at = Column(DateTime)
    is_active = Column(Boolean, default=True)
    last_ip = Column(String(50))
    created_at = Column(DateTime, default=func.now())
