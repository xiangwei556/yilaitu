from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from backend.passport.app.api.deps import get_db, get_current_user
from backend.order.models.order import Order, OrderPaid, OrderHistory
from backend.order.schemas.order import (
    Order as OrderSchema,
    OrderHistoryResponse,
    OrderPaidResponse,
    PageResponse
)
from backend.order.services.order_history_service import OrderHistoryService, OrderPaidService
from backend.passport.app.models.user import User

router = APIRouter()


# --- 预订单（order_reservation）接口 ---

@router.get("/admin/orders", response_model=List[OrderSchema])
def list_orders_admin(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """管理员查询预订单列表（order_reservation表）"""
    if current_user.role not in ["admin", "super_admin", "growth-hacker", "call-center"]:
        raise HTTPException(status_code=403, detail="Not authorized")

    return db.query(Order).order_by(Order.created_at.desc()).offset(skip).limit(limit).all()


@router.get("/my-orders", response_model=List[OrderSchema])
def list_my_orders(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """用户查询自己的预订单列表（order_reservation表）"""
    return db.query(Order).filter(Order.user_id == current_user.id).order_by(Order.created_at.desc()).all()


# --- 已支付订单（order）接口 ---

@router.get("/admin/paid-orders", response_model=List[OrderPaidResponse])
def list_paid_orders_admin(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """管理员查询已支付订单列表（order表）"""
    if current_user.role not in ["admin", "super_admin", "growth-hacker", "call-center"]:
        raise HTTPException(status_code=403, detail="Not authorized")

    return OrderPaidService.list_all(db, skip=skip, limit=limit)


@router.get("/admin/paid-orders/page", response_model=PageResponse[OrderPaidResponse])
def list_paid_orders_admin_page(
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    user_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """管理员分页查询已支付订单列表（order表）"""
    if current_user.role not in ["admin", "super_admin", "growth-hacker", "call-center"]:
        raise HTTPException(status_code=403, detail="Not authorized")

    skip = (page - 1) * page_size
    items = OrderPaidService.list_all(db, skip=skip, limit=page_size, user_id=user_id)
    total = OrderPaidService.count(db, user_id=user_id)

    return {"items": items, "total": total, "page": page, "page_size": page_size}


@router.get("/my-paid-orders", response_model=List[OrderPaidResponse])
def list_my_paid_orders(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """用户查询自己的已支付订单列表（order表）"""
    return OrderPaidService.list_all(db, user_id=current_user.id)


@router.get("/my-paid-orders/page", response_model=PageResponse[OrderPaidResponse])
def list_my_paid_orders_page(
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """用户分页查询自己的已支付订单列表（order表）"""
    skip = (page - 1) * page_size
    items = OrderPaidService.list_all(db, skip=skip, limit=page_size, user_id=current_user.id)
    total = OrderPaidService.count(db, user_id=current_user.id)

    return {"items": items, "total": total, "page": page, "page_size": page_size}


# --- 订单历史（order_history）接口 ---

@router.get("/admin/order-history", response_model=List[OrderHistoryResponse])
def list_order_history_admin(
    skip: int = 0,
    limit: int = 100,
    user_id: Optional[int] = None,
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """管理员查询订单历史列表（order_history表）"""
    if current_user.role not in ["admin", "super_admin", "growth-hacker", "call-center"]:
        raise HTTPException(status_code=403, detail="Not authorized")

    return OrderHistoryService.list_all(db, skip=skip, limit=limit, user_id=user_id, status=status)


@router.get("/admin/order-history/page", response_model=PageResponse[OrderHistoryResponse])
def list_order_history_admin_page(
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    user_id: Optional[int] = None,
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """管理员分页查询订单历史列表（order_history表）"""
    if current_user.role not in ["admin", "super_admin", "growth-hacker", "call-center"]:
        raise HTTPException(status_code=403, detail="Not authorized")

    skip = (page - 1) * page_size
    items = OrderHistoryService.list_all(db, skip=skip, limit=page_size, user_id=user_id, status=status)
    total = OrderHistoryService.count(db, user_id=user_id, status=status)

    return {"items": items, "total": total, "page": page, "page_size": page_size}


@router.get("/admin/order-history/{order_no}", response_model=OrderHistoryResponse)
def get_order_history_admin(
    order_no: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """管理员查询订单历史详情"""
    if current_user.role not in ["admin", "super_admin", "growth-hacker", "call-center"]:
        raise HTTPException(status_code=403, detail="Not authorized")

    order_history = OrderHistoryService.get_by_order_no(db, order_no)
    if not order_history:
        raise HTTPException(status_code=404, detail="订单历史不存在")

    return order_history


@router.delete("/admin/order-history/{order_no}")
def delete_order_history_admin(
    order_no: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """管理员删除订单历史"""
    if current_user.role not in ["admin", "super_admin"]:
        raise HTTPException(status_code=403, detail="Not authorized")

    success = OrderHistoryService.delete(db, order_no)
    if not success:
        raise HTTPException(status_code=404, detail="订单历史不存在")

    return {"code": 200, "msg": "删除成功", "data": None}
