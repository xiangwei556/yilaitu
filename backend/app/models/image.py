from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Boolean, Text
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database import Base

class Image(Base):
    """图片数据模型"""
    __tablename__ = "images"
    
    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String(255), nullable=False)
    original_filename = Column(String(255), nullable=False)
    file_path = Column(String(512), nullable=False)
    file_size = Column(Integer, nullable=False)  # 文件大小（字节）
    mime_type = Column(String(50), nullable=False)
    status = Column(String(20), default="uploaded")  # uploaded, processing, completed, failed
    
    # 用户关联
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    user = relationship("User", backref="uploaded_images")
    
    # 处理信息
    processing_status = Column(String(50), default="pending")
    processing_time = Column(Integer, default=0)  # 处理时间（毫秒）
    
    # 时间戳
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

class ProcessedImage(Base):
    """处理后的图片数据模型"""
    __tablename__ = "processed_images"
    
    id = Column(Integer, primary_key=True, index=True)
    original_image_id = Column(Integer, ForeignKey("images.id"), nullable=False)
    original_image = relationship("Image", backref="processed_results")
    
    filename = Column(String(255), nullable=False)
    file_path = Column(String(512), nullable=False)
    file_size = Column(Integer, nullable=False)
    
    # 使用的背景信息
    background_id = Column(Integer, ForeignKey("backgrounds.id"), nullable=True)
    background = relationship("Background", backref="used_in_images")
    
    # 处理参数
    process_parameters = Column(Text, nullable=True)  # 存储处理参数的JSON字符串
    
    # 使用的积分
    credits_used = Column(Integer, default=3)
    
    # 时间戳
    processed_at = Column(DateTime(timezone=True), server_default=func.now())

class ProcessingTask(Base):
    """图片处理任务队列模型"""
    __tablename__ = "processing_tasks"
    
    id = Column(Integer, primary_key=True, index=True)
    image_id = Column(Integer, ForeignKey("images.id"), nullable=False)
    image = relationship("Image", backref="processing_tasks")
    
    task_type = Column(String(50), nullable=False)  # remove_background, replace_background, etc.
    status = Column(String(20), default="pending")  # pending, processing, completed, failed
    
    # 任务参数
    parameters = Column(Text, nullable=True)  # 存储任务参数的JSON字符串
    
    # 错误信息
    error_message = Column(Text, nullable=True)
    
    # 时间戳
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    started_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)