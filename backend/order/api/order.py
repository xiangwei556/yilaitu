from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from backend.passport.app.api.deps import get_db, get_current_user
from backend.order.models.order import Order
from backend.order.schemas.order import Order as OrderSchema
from backend.passport.app.models.user import User

router = APIRouter()

@router.get("/admin/orders", response_model=List[OrderSchema])
def list_orders_admin(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role not in ["admin", "super_admin", "growth-hacker", "call-center"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    return db.query(Order).order_by(Order.created_at.desc()).offset(skip).limit(limit).all()

@router.get("/my-orders", response_model=List[OrderSchema])
def list_my_orders(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return db.query(Order).filter(Order.user_id == current_user.id).order_by(Order.created_at.desc()).all()
