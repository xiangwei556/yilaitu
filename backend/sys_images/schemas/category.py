from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class CategoryCreate(BaseModel):
    name: str
    status: Optional[str] = "enabled"


class CategoryUpdate(BaseModel):
    name: Optional[str] = None
    status: Optional[str] = None


class CategoryResponse(BaseModel):
    id: int
    name: str
    status: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class CategoryListResponse(BaseModel):
    total: int
    items: List[CategoryResponse]
