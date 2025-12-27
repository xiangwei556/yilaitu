from sqlalchemy import Column, Integer, String, DateTime, JSON, BigInteger, DECIMAL, ForeignKey, Text
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from backend.passport.app.db.session import Base


class OriginalImageRecord(Base):
    __tablename__ = "original_image_record"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    create_time = Column(DateTime, default=func.now(), nullable=False, comment="生成时间")
    user_id = Column(BigInteger, index=True, nullable=False, comment="用户ID")
    model_id = Column(BigInteger, nullable=True, comment="模型ID")
    model_name = Column(String(255), nullable=True, comment="模型名称")
    params = Column(JSON, nullable=True, comment="生成参数json对象")
    images = Column(JSON, nullable=True, comment="生成后的图片json对象")
    status = Column(String(50), default="pending", nullable=False, comment="生图状态：pending(进行中)、completed(已完成)、failed(失败)")
    cost_integral = Column(DECIMAL(10, 2), default=0, nullable=False, comment="消耗积分数量")
    points_transactions_id = Column(BigInteger, ForeignKey("points_transactions.id"), nullable=True, comment="对应积分明细表主键id")
    
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
