from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class FeedbackType:
    BACKGROUND_MISMATCH = 1
    PERSON_DEFORMED = 2
    CLOTHING_DISTORTED = 3
    COLOR_DEVIATION = 4
    DETAILS_BLURRY = 5
    OTHER = 6

    @classmethod
    def get_name(cls, feedback_type: str) -> str:
        type_map = {
            str(cls.BACKGROUND_MISMATCH): "背景不符",
            str(cls.PERSON_DEFORMED): "人物变形",
            str(cls.CLOTHING_DISTORTED): "服装失真",
            str(cls.COLOR_DEVIATION): "色彩偏差",
            str(cls.DETAILS_BLURRY): "细节模糊",
            str(cls.OTHER): "其他问题"
        }
        
        if ',' in feedback_type:
            type_values = feedback_type.split(',')
            names = [type_map.get(v.strip(), "未知") for v in type_values]
            return ', '.join(names)
        
        return type_map.get(feedback_type, "未知")


class FeedbackStatus:
    PENDING = 0
    PROCESSED_WITH_REFUND = 1
    PROCESSED_NO_REFUND = 2

    @classmethod
    def get_name(cls, status: int) -> str:
        status_map = {
            cls.PENDING: "未处理",
            cls.PROCESSED_WITH_REFUND: "已处理已返还积分",
            cls.PROCESSED_NO_REFUND: "已处理不返还积分"
        }
        return status_map.get(status, "未知状态")


class FeedbackCreate(BaseModel):
    user_id: int = Field(..., description="用户ID")
    feedback_type: str = Field(..., description="反馈类型（1-6），支持多选，用逗号分隔")
    content: Optional[str] = Field(None, description="反馈内容")
    original_image_record_id: Optional[int] = Field(None, description="关联的生图记录ID")
    model_id: Optional[int] = Field(None, description="模型ID(1、模特图生成，2、白底图生成)")
    status: int = Field(default=0, description="反馈状态（0、未处理，1、已处理已返还积分，2、已处理不返还积分）")


class FeedbackUpdate(BaseModel):
    status: int = Field(..., description="反馈状态（0、未处理，1、已处理已返还积分，2、已处理不返还积分）")
    reply_content: Optional[str] = Field(None, description="处理回复内容")
    refund_points: Optional[float] = Field(None, description="返还积分数")


class FeedbackResponse(BaseModel):
    id: int
    user_id: int
    feedback_type: str
    feedback_type_name: Optional[str] = None
    content: Optional[str]
    create_time: datetime
    reply_content: Optional[str]
    reply_time: Optional[datetime]
    original_image_record_id: Optional[int]
    model_id: Optional[int]
    status: int
    points_transactions_id: Optional[int]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class FeedbackListResponse(BaseModel):
    items: list[FeedbackResponse]
    total: int
    page: int
    page_size: int


class FeedbackDetailResponse(BaseModel):
    feedback: FeedbackResponse
    original_image_record: Optional[dict] = None
