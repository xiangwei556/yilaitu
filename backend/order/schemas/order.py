from pydantic import BaseModel
from typing import Optional, List, Generic, TypeVar
from datetime import datetime
from decimal import Decimal


class OrderBase(BaseModel):
    order_no: str
    user_id: int
    amount: Decimal
    type: str
    status: str
    product_id: Optional[int] = None
    payment_method: Optional[str] = None


class OrderCreate(OrderBase):
    pass


class Order(OrderBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class OrderHistoryResponse(BaseModel):
    """订单历史响应"""
    id: int
    order_no: str
    user_id: int
    amount: Decimal
    original_amount: Optional[Decimal] = None
    type: str
    status: str
    product_id: Optional[int] = None
    product_snapshot: Optional[str] = None
    payment_method: Optional[str] = None
    payment_time: Optional[datetime] = None
    payment_no: Optional[str] = None
    expire_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class OrderPaidResponse(BaseModel):
    """已支付订单响应"""
    id: int
    order_no: str
    user_id: int
    amount: Decimal
    original_amount: Optional[Decimal] = None
    type: str
    status: str
    product_id: Optional[int] = None
    product_snapshot: Optional[str] = None
    payment_method: Optional[str] = None
    payment_time: Optional[datetime] = None
    payment_no: Optional[str] = None
    expire_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


T = TypeVar('T')


class PageResponse(BaseModel, Generic[T]):
    """分页响应"""
    items: List[T]
    total: int
    page: int
    page_size: int
