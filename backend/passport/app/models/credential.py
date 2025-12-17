from sqlalchemy import Column, String, DateTime, Boolean, BigInteger, ForeignKey, Text, Index
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from backend.passport.app.db.session import Base

class UserCredential(Base):
    __tablename__ = "user_credentials"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    user_id = Column(BigInteger, ForeignKey("users.id"), nullable=False)
    identifier = Column(String(255), nullable=False) # 手机号(加密)、OpenID、UnionID
    credential_type = Column(String(20), nullable=False) # phone, wechat_openid, wechat_unionid
    credential_info = Column(Text) # 额外信息 (JSON)
    verified = Column(Boolean, default=False)
    created_at = Column(DateTime, default=func.now())

    user = relationship("User", backref="credentials")

    __table_args__ = (
        Index('idx_identifier_type', 'identifier', 'credential_type'),
    )
