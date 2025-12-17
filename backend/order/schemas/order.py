from pydantic import BaseModel
from typing import Optional
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
