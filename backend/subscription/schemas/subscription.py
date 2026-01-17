"""
订阅相关Schema
"""
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from decimal import Decimal


class SubscriptionResponse(BaseModel):
    """订阅响应"""
    id: int
    subscription_sn: str
    user_id: int
    order_id: int
    type: int = Field(..., description="订阅类型: 1-积分包 2-组合包")
    type_desc: str
    level_code: Optional[str] = None
    level_weight: int = 0
    points_amount: int = 0
    status: int = Field(..., description="状态: 1-待生效 2-生效中 3-已完成 4-已取消 5-已暂停")
    status_desc: str
    expiration_time: datetime
    cycle_days: int
    is_compensation: int = 0
    subscription_source: str
    is_auto_renewal: int = 0
    contract_id: Optional[int] = None
    cancel_reason: Optional[str] = None
    cancel_time: Optional[datetime] = None
    create_time: datetime
    update_time: datetime

    class Config:
        from_attributes = True


class SubscriptionChainItem(BaseModel):
    """生效链中的订阅项"""
    id: int
    subscription_sn: str
    type: int
    type_desc: str
    level_code: Optional[str] = None
    level_weight: int = 0
    points_amount: int = 0
    status: int
    status_desc: str
    expiration_time: datetime
    cycle_days: int
    is_compensation: int
    is_auto_renewal: int
    order_in_queue: int
    previous_subscription_id: Optional[int] = None
    next_subscription_id: Optional[int] = None
    create_time: datetime

    class Config:
        from_attributes = True


class SubscriptionChainResponse(BaseModel):
    """用户生效链响应"""
    user_id: int
    active_subscription: Optional[SubscriptionChainItem] = None
    pending_subscriptions: List[SubscriptionChainItem] = []
    paused_subscriptions: List[SubscriptionChainItem] = []
    total_pending: int = 0
    chain_visualization: Optional[str] = None


class CurrentSubscriptionResponse(BaseModel):
    """当前生效订阅响应"""
    has_active: bool
    subscription: Optional[SubscriptionResponse] = None
    remaining_days: int = 0
    is_auto_renewal: bool = False
    has_pending: bool = False
    pending_count: int = 0


class ToggleAutoRenewalRequest(BaseModel):
    """开关自动续费请求"""
    subscription_id: int = Field(..., description="订阅ID")
    enable: bool = Field(..., description="是否开启自动续费")


class ToggleAutoRenewalResponse(BaseModel):
    """开关自动续费响应"""
    success: bool
    is_auto_renewal: bool
    message: Optional[str] = None


class CancelSubscriptionRequest(BaseModel):
    """取消订阅请求"""
    subscription_id: int = Field(..., description="订阅ID")
    reason: Optional[str] = Field(default="用户主动取消", description="取消原因")


class CancelSubscriptionResponse(BaseModel):
    """取消订阅响应"""
    success: bool
    message: Optional[str] = None


class SubscriptionListResponse(BaseModel):
    """订阅列表响应"""
    total: int
    items: List[SubscriptionResponse]


# 用于状态描述的映射
STATUS_DESC_MAP = {
    1: "待生效",
    2: "生效中",
    3: "已完成",
    4: "已取消",
    5: "已暂停",
}

TYPE_DESC_MAP = {
    1: "积分包",
    2: "组合包",
}


def get_status_desc(status: int) -> str:
    """获取状态描述"""
    return STATUS_DESC_MAP.get(status, "未知")


def get_type_desc(type_: int) -> str:
    """获取类型描述"""
    return TYPE_DESC_MAP.get(type_, "未知")
