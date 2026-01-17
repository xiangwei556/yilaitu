"""
签约协议相关Schema
"""
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from decimal import Decimal


class ContractCreateRequest(BaseModel):
    """创建签约请求"""
    payment_method: str = Field(..., description="支付方式: wechat/alipay")
    product_type: str = Field(..., description="商品类型: membership/points")
    product_id: int = Field(..., description="商品ID")
    return_url: Optional[str] = Field(None, description="签约完成后返回地址")
    display_account: Optional[str] = Field(None, description="展示账号(手机号/邮箱)")


class ContractCreateResponse(BaseModel):
    """创建签约响应"""
    success: bool
    contract_sn: str = Field(..., description="协议流水号")
    sign_url: str = Field(..., description="签约跳转URL")
    message: Optional[str] = None


class ContractQueryResponse(BaseModel):
    """签约状态查询响应"""
    contract_sn: str
    user_id: int
    payment_method: str
    status: int = Field(..., description="状态: 0-签约中 1-已签约 2-已解约 3-签约失败")
    status_desc: str = Field(..., description="状态描述")
    contract_id: Optional[str] = Field(None, description="支付平台协议ID")
    product_type: str
    product_id: Optional[int] = None
    deduct_amount: Optional[Decimal] = None
    deduct_cycle: int = Field(default=30, description="扣款周期(天)")
    next_deduct_date: Optional[str] = None
    signed_time: Optional[datetime] = None
    unsigned_time: Optional[datetime] = None
    unsigned_reason: Optional[str] = None
    create_time: datetime

    class Config:
        from_attributes = True


class ContractCancelRequest(BaseModel):
    """解约请求"""
    contract_sn: str = Field(..., description="协议流水号")
    reason: Optional[str] = Field(default="用户主动解约", description="解约原因")


class ContractCancelResponse(BaseModel):
    """解约响应"""
    success: bool
    message: Optional[str] = None


class ContractListItem(BaseModel):
    """签约列表项"""
    contract_sn: str
    payment_method: str
    status: int
    status_desc: str
    product_type: str
    deduct_amount: Optional[Decimal] = None
    deduct_cycle: int
    next_deduct_date: Optional[str] = None
    signed_time: Optional[datetime] = None
    create_time: datetime

    class Config:
        from_attributes = True


class ContractListResponse(BaseModel):
    """签约列表响应"""
    total: int
    items: List[ContractListItem]


class DeductRecordResponse(BaseModel):
    """扣款记录响应"""
    record_sn: str
    contract_id: int
    user_id: int
    subscription_id: Optional[int] = None
    order_id: Optional[int] = None
    amount: Decimal
    payment_method: str
    out_trade_no: Optional[str] = None
    transaction_id: Optional[str] = None
    status: int = Field(..., description="状态: 0-待扣款 1-预通知已发 2-扣款中 3-成功 4-失败")
    status_desc: str
    notify_time: Optional[datetime] = None
    deduct_time: Optional[datetime] = None
    complete_time: Optional[datetime] = None
    fail_reason: Optional[str] = None
    retry_count: int = 0
    create_time: datetime

    class Config:
        from_attributes = True


class DeductRecordListResponse(BaseModel):
    """扣款记录列表响应"""
    total: int
    items: List[DeductRecordResponse]


# 回调请求模型（内部使用）
class WeChatContractCallbackData(BaseModel):
    """微信签约回调数据"""
    contract_code: str
    contract_id: Optional[str] = None
    plan_id: Optional[str] = None
    openid: Optional[str] = None
    change_type: Optional[str] = None  # ADD/DELETE
    operate_time: Optional[str] = None
    result_code: Optional[str] = None
    err_code: Optional[str] = None
    err_code_des: Optional[str] = None


class AlipayContractCallbackData(BaseModel):
    """支付宝签约回调数据"""
    agreement_no: Optional[str] = None
    external_agreement_no: str
    status: Optional[str] = None
    sign_time: Optional[str] = None
    alipay_user_id: Optional[str] = None
    notify_type: Optional[str] = None
