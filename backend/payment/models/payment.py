from sqlalchemy import Column, Integer, String, DateTime, DECIMAL, BigInteger, Text, Index
from sqlalchemy.sql import func
from backend.passport.app.db.session import Base

class PaymentRecord(Base):
    """
    支付记录表 - 记录所有支付相关操作，便于对账和问题排查
    """
    __tablename__ = "payment_records"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    order_no = Column(String(50), index=True, nullable=False, comment='订单号')
    payment_no = Column(String(100), index=True, nullable=True, comment='支付平台订单号')
    payment_method = Column(String(20), nullable=False, comment='支付方式: wechat, alipay')
    action_type = Column(String(50), nullable=False, comment='操作类型: create, callback, query, refund')
    amount = Column(DECIMAL(10, 2), nullable=False, comment='金额')
    status = Column(String(20), nullable=False, comment='状态: success, failed, pending')
    request_data = Column(Text, nullable=True, comment='请求数据(JSON)')
    response_data = Column(Text, nullable=True, comment='响应数据(JSON)')
    error_message = Column(Text, nullable=True, comment='错误信息')
    
    created_at = Column(DateTime, default=func.now(), index=True)
    
    __table_args__ = (
        Index('idx_order_no', 'order_no'),
        Index('idx_payment_no', 'payment_no'),
        Index('idx_created_at', 'created_at'),
    )