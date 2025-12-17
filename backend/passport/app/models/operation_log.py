from sqlalchemy import Column, String, DateTime, BigInteger, Text
from sqlalchemy.sql import func
from backend.passport.app.db.session import Base

class OperationLog(Base):
    __tablename__ = "operation_logs"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    user_id = Column(BigInteger, index=True)
    event_type = Column(String(50)) # register, login, logout, bind...
    status = Column(String(20)) # success, fail
    ip = Column(String(50))
    device_fingerprint = Column(String(500))
    client_type = Column(String(20))
    detail = Column(Text) # 失败原因等
    created_at = Column(DateTime, default=func.now())
