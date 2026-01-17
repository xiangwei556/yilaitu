from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class PoseCreate(BaseModel):
    name: str
    gender: Optional[str] = "all"  # male/female/all
    image_url: Optional[str] = None
    skeleton_url: Optional[str] = None
    status: Optional[str] = "enabled"


class PoseUpdate(BaseModel):
    name: Optional[str] = None
    gender: Optional[str] = None
    status: Optional[str] = None


class PoseResponse(BaseModel):
    id: int
    name: str
    gender: str
    image_url: Optional[str]
    skeleton_url: Optional[str]
    status: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class PoseListResponse(BaseModel):
    total: int
    items: List[PoseResponse]
