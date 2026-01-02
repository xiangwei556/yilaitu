from sqlalchemy import Column, Integer, String, DateTime, Text, BigInteger, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from backend.passport.app.db.session import Base


class Feedback(Base):
    __tablename__ = "feedback"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    user_id = Column(BigInteger, index=True, nullable=False, comment="用户ID")
    feedback_type = Column(String(50), nullable=False, comment="反馈类型的枚举（1、背景不符，2、人物变形，3、服装失真，4、色彩偏差，5、细节模糊，6、其他问题），支持多选，用逗号分隔")
    content = Column(Text, comment="反馈内容")
    create_time = Column(DateTime, default=func.now(), nullable=False, comment="反馈时间")
    reply_content = Column(Text, comment="处理回复内容")
    reply_time = Column(DateTime, comment="处理回复时间")
    original_image_record_id = Column(BigInteger, comment="关联的生图记录ID")
    model_id = Column(Integer, comment="模型ID(1、模特图生成，2、白底图生成)")
    status = Column(Integer, default=0, nullable=False, comment="反馈状态（0、未处理，1、已处理已返还积分，2、已处理不返还积分）")
    points_transactions_id = Column(BigInteger, comment="对应积分明细表主键id，如果已处理已返还积分，则记录返还的积分明细id，否则为空")

    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())

    __table_args__ = (
        {'comment': '反馈表'},
    )
