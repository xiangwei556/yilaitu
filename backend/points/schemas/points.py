from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime
from decimal import Decimal

class PointsPackageBase(BaseModel):
    name: str
    points: int
    price: Optional[Decimal] = None
    original_price: Optional[Decimal] = None
    description: Optional[str] = None
    is_active: Optional[bool] = True
    validity_days: Optional[int] = 0
    package_type: Optional[str] = "system"

class PointsPackageCreate(PointsPackageBase):
    pass

class PointsPackage(PointsPackageBase):
    id: int
    created_at: datetime
    updated_at: datetime
    class Config:
        from_attributes = True

class PointsRuleBase(BaseModel):
    code: str
    name: str
    type: str
    amount: int
    condition: Optional[Dict[str, Any]] = None
    frequency: Optional[str] = "unlimited"
    description: Optional[str] = None
    is_active: Optional[bool] = True

class PointsRuleCreate(PointsRuleBase):
    pass

class PointsRule(PointsRuleBase):
    id: int
    created_at: datetime
    updated_at: datetime
    class Config:
        from_attributes = True

class PointsAccount(BaseModel):
    user_id: int
    balance_permanent: Decimal
    balance_limited: Decimal
    class Config:
        from_attributes = True

class PointsTransaction(BaseModel):
    id: int
    user_id: int
    type: str
    amount: Decimal
    balance_after: Decimal
    source_type: Optional[str]
    remark: Optional[str]
    created_at: datetime
    class Config:
        from_attributes = True

class PointsAdjustment(BaseModel):
    user_id: int
    amount: Decimal
    type: str # earn, burn
    remark: str
