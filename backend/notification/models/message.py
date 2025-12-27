from sqlalchemy import Column, Integer, String, DateTime, Boolean, Text, BigInteger, Index
from sqlalchemy.sql import func
from backend.passport.app.db.session import Base

class Message(Base):
    __tablename__ = "messages"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    sender_id = Column(BigInteger, nullable=True) # Null for system messages
    receiver_id = Column(BigInteger, index=True, nullable=False)
    type = Column(String(50), default="system") # system, private, business
    title = Column(String(255), nullable=False)
    content = Column(Text, nullable=False)
    status = Column(String(20), default="unread") # unread, read, deleted
    priority = Column(String(20), default="normal") # normal, high, urgent
    
    # Optional metadata for business logic (e.g., jump link, related object id)
    link = Column(String(500), nullable=True)
    extra_data = Column(Text, nullable=True) # JSON string
    
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())

class UnreadMessageCount(Base):
    __tablename__ = "unread_message_counts"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    user_id = Column(BigInteger, unique=True, index=True, nullable=False)
    count = Column(Integer, default=0)
    
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
