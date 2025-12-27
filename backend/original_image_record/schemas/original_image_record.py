from pydantic import BaseModel, Field, field_validator
from typing import Optional, List, Dict, Any, Literal
from datetime import datetime
from decimal import Decimal


class OriginalImageRecordBase(BaseModel):
    model_id: Optional[int] = None
    model_name: Optional[str] = None
    params: Optional[Dict[str, Any]] = None
    images: Optional[List[Dict[str, Any]]] = None
    status: Optional[Literal["pending", "processing", "completed", "failed"]] = "pending"
    cost_integral: Optional[Decimal] = 0
    points_transactions_id: Optional[int] = None


class OriginalImageRecordCreate(OriginalImageRecordBase):
    pass


class OriginalImageRecordUpdate(BaseModel):
    model_id: Optional[int] = None
    model_name: Optional[str] = None
    params: Optional[Dict[str, Any]] = None
    images: Optional[List[Dict[str, Any]]] = None
    status: Optional[Literal["pending", "processing", "completed", "failed"]] = None
    cost_integral: Optional[Decimal] = None
    points_transactions_id: Optional[int] = None


class OriginalImageRecord(OriginalImageRecordBase):
    id: int
    create_time: datetime
    user_id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class OriginalImageRecordResponse(BaseModel):
    id: int
    create_time: datetime
    user_id: int
    model_id: Optional[int]
    model_name: Optional[str]
    params: Optional[Dict[str, Any]]
    images: Optional[List[Dict[str, Any]]]
    status: str
    cost_integral: Decimal
    points_transactions_id: Optional[int]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
