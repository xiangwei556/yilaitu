from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class CategorySimple(BaseModel):
    id: int
    name: str

    class Config:
        from_attributes = True


class ModelRefCreate(BaseModel):
    image_url: Optional[str] = None  # Can be set later via upload
    gender: str
    age_group: str
    category_ids: List[int] = []
    status: Optional[str] = "enabled"


class ModelRefUpdate(BaseModel):
    gender: Optional[str] = None
    age_group: Optional[str] = None
    category_ids: Optional[List[int]] = None
    status: Optional[str] = None


class ModelRefResponse(BaseModel):
    id: int
    image_url: Optional[str]
    gender: Optional[str] = None
    age_group: Optional[str] = None
    status: str
    categories: List[CategorySimple] = []
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ModelRefListResponse(BaseModel):
    total: int
    items: List[ModelRefResponse]
