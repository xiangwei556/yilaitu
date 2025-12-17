from pydantic import BaseModel
from typing import Optional, List, Any
from datetime import datetime
from decimal import Decimal

class MembershipPackageBase(BaseModel):
    name: str
    description: Optional[str] = None
    price: Decimal
    original_price: Optional[Decimal] = None
    rights: Optional[str] = None

    status: Optional[str] = "enabled"
    type: str
    points: int = 0

class MembershipPackageCreate(MembershipPackageBase):
    pass

class MembershipPackageUpdate(MembershipPackageBase):
    pass

class MembershipPackage(MembershipPackageBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class UserMembershipBase(BaseModel):
    user_id: int
    package_id: int
    start_time: datetime
    end_time: datetime
    status: int
    auto_renew: bool

class UserMembership(UserMembershipBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class UpgradeCalculationRequest(BaseModel):
    target_package_id: int

class UpgradeCalculationResponse(BaseModel):
    original_price: Decimal
    deducted_amount: Decimal
    final_price: Decimal
    remaining_days: int
    formula: str

class MembershipOrderCreate(BaseModel):
    package_id: int
    payment_method: str = "wechat" # wechat, alipay
    is_upgrade: bool = False
