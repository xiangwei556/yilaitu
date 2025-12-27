from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel


class ModelImage(BaseModel):
    id: int
    file_path: str
    view: Optional[str] = None
    is_cover: bool = False
    created_at: datetime

    class Config:
        from_attributes = True


class ModelBase(BaseModel):
    name: Optional[str] = None
    gender: str
    age_group: str
    body_type: str
    style: str
    status: str = "enabled"
    type: str = "system"
    user_id: Optional[int] = None
    avatar: Optional[str] = None


class ModelCreate(ModelBase):
    pass


class ModelUpdate(BaseModel):
    name: Optional[str] = None
    gender: Optional[str] = None
    age_group: Optional[str] = None
    body_type: Optional[str] = None
    style: Optional[str] = None
    status: Optional[str] = None
    avatar: Optional[str] = None


class Model(ModelBase):
    id: int
    created_at: datetime
    updated_at: datetime
    images: List[ModelImage] = []

    class Config:
        from_attributes = True


class Page(BaseModel):
    total: int
    page: int
    page_size: int
    items: List[Model]

