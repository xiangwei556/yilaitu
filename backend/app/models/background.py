from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Boolean
from sqlalchemy.sql import func
from app.database import Base

class Background(Base):
    __tablename__ = "backgrounds"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    thumbnail_url = Column(String(255), nullable=False)  # 缩略图URL
    image_url = Column(String(255), nullable=False)  # 完整背景图URL
    
    # 背景分类
    category = Column(String(50), index=True, nullable=False)  # 纯色、纹理、渐变、场景等
    tags = Column(Text, nullable=True)  # 标签，用逗号分隔
    
    # 背景属性
    width = Column(Integer, nullable=True)
    height = Column(Integer, nullable=True)
    aspect_ratio = Column(String(20), nullable=True)  # 宽高比，如4:3, 16:9
    
    # 使用信息
    usage_count = Column(Integer, default=0)  # 使用次数
    is_popular = Column(Boolean, default=False)  # 是否热门
    is_premium = Column(Boolean, default=False)  # 是否付费背景
    
    # 创建和更新时间
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    def __repr__(self):
        return f"<Background {self.name} ({self.category})>"
