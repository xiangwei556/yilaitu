from sqlalchemy import Column, Integer, String, DateTime, Boolean, Text, BigInteger
from sqlalchemy.sql import func
from backend.passport.app.db.session import Base

class NotificationTemplate(Base):
    __tablename__ = "notification_templates"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    code = Column(String(50), unique=True, index=True)
    title_template = Column(String(255), nullable=False)
    content_template = Column(Text, nullable=False)
    channels = Column(String(255)) # sms, internal, email (comma separated)
    
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())

class NotificationLog(Base):
    __tablename__ = "notification_logs"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    user_id = Column(BigInteger, index=True)
    type = Column(String(50)) # system, activity, etc.
    title = Column(String(255))
    content = Column(Text)
    channel = Column(String(20))
    status = Column(String(20)) # sent, failed, read
    
    created_at = Column(DateTime, default=func.now())
