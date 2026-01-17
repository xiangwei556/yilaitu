from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class BackgroundCreate(BaseModel):
    name: str
    image_url: Optional[str] = None  # Can be set later via upload
    status: Optional[str] = "enabled"


class BackgroundUpdate(BaseModel):
    name: Optional[str] = None
    status: Optional[str] = None


class BackgroundResponse(BaseModel):
    id: int
    name: str
    image_url: Optional[str]
    status: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class BackgroundListResponse(BaseModel):
    total: int
    items: List[BackgroundResponse]
