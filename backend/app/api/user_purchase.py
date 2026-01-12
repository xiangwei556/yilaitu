from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc
from typing import List, Optional, Generic, TypeVar
from pydantic import BaseModel
from datetime import datetime

from backend.passport.app.api.deps import get_db, get_current_user
from backend.passport.app.models.user import User
from backend.membership.models.membership import MembershipPackage
from backend.membership.schemas.membership import MembershipPackage as MembershipPackageSchema
from backend.points.models.points import PointsPackage, PointsTransaction
from backend.points.schemas.points import PointsPackage as PointsPackageSchema
from backend.order.models.order import Order, OrderPaid
from backend.order.services.order_history_service import OrderPaidService

router = APIRouter()

# Response Models
class OrderResponse(BaseModel):
    id: int
    order_no: str
    amount: float
    type: str
    status: str
    created_at: datetime
    
    class Config:
        from_attributes = True

class PointsTransactionResponse(BaseModel):
    id: int
    type: str
    amount: float
    balance_after: float
    source_type: Optional[str]
    created_at: datetime
    
    class Config:
        from_attributes = True

T = TypeVar('T')

class Page(BaseModel, Generic[T]):
    items: List[T]
    total: int
    page: int
    page_size: int

@router.get("/packages", response_model=List[MembershipPackageSchema])
def get_active_packages(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    获取系统会员套餐列表
    只返回有效状态的数据
    需要用户登录态
    """
    # get_current_user dependency handles the login validation and raises HTTPException if invalid
    
    packages = db.query(MembershipPackage).filter(MembershipPackage.status == "enabled").all()
    return packages

@router.get("/point-packages", response_model=List[PointsPackageSchema])
def get_active_point_packages(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    获取系统积分包列表
    只返回有效状态的数据
    需要用户登录态
    """
    # get_current_user dependency handles the login validation and raises HTTPException if invalid
    
    packages = db.query(PointsPackage).filter(PointsPackage.is_active == True).all()
    return packages

@router.get("/orders", response_model=Page[OrderResponse])
def get_my_orders(
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    获取我的已支付订单列表，支持分页
    读取order表（已支付订单）
    """
    skip = (page - 1) * page_size
    items = OrderPaidService.list_all(db, skip=skip, limit=page_size, user_id=current_user.id)
    total = OrderPaidService.count(db, user_id=current_user.id)

    return {"items": items, "total": total, "page": page, "page_size": page_size}

@router.get("/points-transactions", response_model=Page[PointsTransactionResponse])
def get_my_points_transactions(
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    获取我的积分明细，支持分页
    """
    query = db.query(PointsTransaction).filter(PointsTransaction.user_id == current_user.id)
    total = query.count()
    items = query.order_by(desc(PointsTransaction.created_at)).offset((page - 1) * page_size).limit(page_size).all()
    return {"items": items, "total": total, "page": page, "page_size": page_size}
