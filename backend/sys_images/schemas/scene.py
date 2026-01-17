from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class SceneCreate(BaseModel):
    name: str
    image_url: Optional[str] = None  # Can be set later via upload
    style: int = 1  # 1-日常生活风, 2-时尚杂志风, 3-运动活力风
    status: Optional[str] = "enabled"


class SceneUpdate(BaseModel):
    name: Optional[str] = None
    style: Optional[int] = None
    status: Optional[str] = None


class SceneResponse(BaseModel):
    id: int
    name: str
    image_url: Optional[str]
    style: int
    status: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class SceneListResponse(BaseModel):
    total: int
    items: List[SceneResponse]
