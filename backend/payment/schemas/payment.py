from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from decimal import Decimal

class PaymentOrderCreate(BaseModel):
    """创建支付订单请求"""
    product_type: str  # membership, points
    product_id: int
    payment_method: str  # wechat, alipay
    is_upgrade: bool = False  # 仅会员订单有效

class PaymentOrderResponse(BaseModel):
    """创建支付订单响应"""
    order_no: str
    amount: Decimal
    qr_code_url: str
    qr_code_expire_at: datetime
    expire_at: datetime

class OrderStatusResponse(BaseModel):
    """订单状态响应"""
    order_no: str
    status: str
    amount: Decimal
    payment_time: Optional[datetime] = None

class CancelOrderRequest(BaseModel):
    """取消订单请求"""
    order_no: str

class PaymentRecordResponse(BaseModel):
    """支付记录响应"""
    id: int
    order_no: str
    payment_no: Optional[str]
    payment_method: str
    action_type: str
    amount: Decimal
    status: str
    created_at: datetime
    
    class Config:
        from_attributes = True