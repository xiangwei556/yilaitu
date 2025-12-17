from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

class ImageBase(BaseModel):
    """图片基础模型"""
    filename: str
    original_filename: str
    file_size: int = Field(..., gt=0, description="文件大小（字节）")
    mime_type: str

class ImageUpload(BaseModel):
    """图片上传响应模型"""
    filename: str
    file_path: str
    message: str
    remaining_credits: int
    
    class Config:
        orm_mode = True

class ImageProcessRequest(BaseModel):
    """图片处理请求模型"""
    filename: str = Field(..., description="上传的原始图片文件名")
    background_id: Optional[int] = Field(None, description="背景图片ID")
    background_image_url: Optional[str] = Field(None, description="自定义背景图片URL")
    
    # 处理参数
    feather_amount: float = Field(0.5, ge=0, le=1.0, description="边缘羽化程度")
    scale: float = Field(1.0, ge=0.1, le=2.0, description="缩放比例")
    position_x: float = Field(0.5, ge=0, le=1.0, description="水平位置")
    position_y: float = Field(0.5, ge=0, le=1.0, description="垂直位置")
    rotate: float = Field(0.0, ge=-180, le=180, description="旋转角度")

class ImageProcessResponse(BaseModel):
    """图片处理响应模型"""
    output_filename: str
    output_path: str
    message: str
    remaining_credits: int
    processed_at: str
    
    class Config:
        orm_mode = True

class ProcessedImageResponse(BaseModel):
    """处理后图片详情响应模型"""
    id: int
    filename: str
    file_path: str
    file_size: int
    original_image_id: int
    background_id: Optional[int]
    credits_used: int
    processed_at: datetime
    
    class Config:
        orm_mode = True

class ImageHistoryItem(BaseModel):
    """图片历史记录项"""
    id: int
    original_filename: str
    processed_filename: str
    processed_at: datetime
    credits_used: int
    status: str
    
    class Config:
        orm_mode = True

class ImageHistoryResponse(BaseModel):
    """图片历史记录响应"""
    history: list[ImageHistoryItem]
    total: int
    page: int
    page_size: int

class ProcessingTaskStatus(BaseModel):
    """处理任务状态"""
    task_id: int
    status: str
    progress: float = Field(0.0, ge=0, le=1.0)
    message: Optional[str] = None
    
    class Config:
        orm_mode = True