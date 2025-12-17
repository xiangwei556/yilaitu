from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List

# 背景基础模型
class BackgroundBase(BaseModel):
    name: str
    description: Optional[str] = None
    category: str
    tags: Optional[str] = None

# 背景创建请求模型
class BackgroundCreate(BackgroundBase):
    image_url: str
    thumbnail_url: str
    width: Optional[int] = None
    height: Optional[int] = None
    aspect_ratio: Optional[str] = None
    is_premium: bool = False

# 背景响应模型
class BackgroundResponse(BackgroundBase):
    id: int
    image_url: str
    thumbnail_url: str
    width: Optional[int] = None
    height: Optional[int] = None
    aspect_ratio: Optional[str] = None
    usage_count: int
    is_popular: bool
    is_premium: bool
    created_at: datetime
    
    class Config:
        orm_mode = True

# 背景列表响应模型
class BackgroundListResponse(BaseModel):
    backgrounds: List[BackgroundResponse]
    total: int
    page: int
    page_size: int
    categories: List[str]
