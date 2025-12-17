from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from backend.passport.app.api.deps import get_db, get_current_user
from backend.membership.models.membership import MembershipPackage, UserMembership
from backend.membership.schemas.membership import MembershipPackage as MembershipPackageSchema, MembershipPackageCreate, MembershipPackageUpdate, UserMembership as UserMembershipSchema, UpgradeCalculationRequest, UpgradeCalculationResponse, MembershipOrderCreate
from backend.passport.app.models.user import User
from backend.order.models.order import Order
from datetime import datetime, timedelta
import uuid

router = APIRouter()

# --- Admin APIs ---

@router.post("/admin/packages", response_model=MembershipPackageSchema)
def create_package(
    package: MembershipPackageCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role not in ["admin", "super_admin", "growth-hacker"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    db_package = MembershipPackage(**package.dict())
    db.add(db_package)
    db.commit()
    db.refresh(db_package)
    return db_package

@router.get("/admin/packages", response_model=List[MembershipPackageSchema])
def list_packages_admin(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role not in ["admin", "super_admin", "growth-hacker", "developer"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    packages = db.query(MembershipPackage).offset(skip).limit(limit).all()
    return packages

@router.put("/admin/packages/{package_id}", response_model=MembershipPackageSchema)
def update_package(
    package_id: int,
    package_in: MembershipPackageUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role not in ["admin", "super_admin", "growth-hacker"]:
        raise HTTPException(status_code=403, detail="Not authorized")
        
    package = db.query(MembershipPackage).filter(MembershipPackage.id == package_id).first()
    if not package:
        raise HTTPException(status_code=404, detail="Package not found")
        
    for key, value in package_in.dict(exclude_unset=True).items():
        setattr(package, key, value)
        
    db.commit()
    db.refresh(package)
    return package

# --- User APIs ---

@router.get("/packages", response_model=List[MembershipPackageSchema])
def list_packages_public(
    db: Session = Depends(get_db)
):
    # Publicly available packages (active only)
    packages = db.query(MembershipPackage).filter(MembershipPackage.status == "enabled").all()
    return packages

@router.get("/my-membership", response_model=List[UserMembershipSchema])
def get_my_membership(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    memberships = db.query(UserMembership).filter(UserMembership.user_id == current_user.id).all()
    return memberships

@router.post("/calculate-upgrade", response_model=UpgradeCalculationResponse)
def calculate_upgrade(
    request: UpgradeCalculationRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # 1. Get current active membership
    current_membership = db.query(UserMembership).filter(
        UserMembership.user_id == current_user.id,
        UserMembership.status == 1,
        UserMembership.end_time > datetime.now()
    ).order_by(UserMembership.end_time.desc()).first()
    
    if not current_membership:
        raise HTTPException(status_code=400, detail="No active membership found to upgrade")
        
    current_package = db.query(MembershipPackage).filter(MembershipPackage.id == current_membership.package_id).first()
    target_package = db.query(MembershipPackage).filter(MembershipPackage.id == request.target_package_id).first()
    
    if not target_package:
        raise HTTPException(status_code=404, detail="Target package not found")
        
    if target_package.price <= current_package.price:
        raise HTTPException(status_code=400, detail="Can only upgrade to a higher price package")
        
    # 2. Calculate remaining value
    now = datetime.now()
    remaining_time = current_membership.end_time - now
    remaining_days = max(0, remaining_time.days)
    
    # Requirement: (89-29) * (30-15)/30 = 30
    # Formula: (TargetPrice - CurrentPrice) * (RemainingDays / 30)
    
    price_diff = float(target_package.price - current_package.price)
    final_price = price_diff * (remaining_days / 30)
    final_price = round(final_price, 2)
    
    return UpgradeCalculationResponse(
        original_price=target_package.price,
        deducted_amount=0, 
        final_price=final_price,
        remaining_days=remaining_days,
        formula=f"({target_package.price} - {current_package.price}) * ({remaining_days}/30)"
    )

@router.post("/orders", response_model=str)
def create_membership_order(
    order_in: MembershipOrderCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    package = db.query(MembershipPackage).filter(MembershipPackage.id == order_in.package_id).first()
    if not package:
        raise HTTPException(status_code=404, detail="Package not found")
        
    amount = package.price
    
    # If upgrade, calculate price (reuse logic or call internal function)
    if order_in.is_upgrade:
        # Simplified for now, should call calculation logic
        pass
        
    order_no = f"ORD{datetime.now().strftime('%Y%m%d%H%M%S')}{uuid.uuid4().hex[:6].upper()}"
    
    order = Order(
        order_no=order_no,
        user_id=current_user.id,
        amount=amount,
        original_amount=package.original_price,
        type="membership_upgrade" if order_in.is_upgrade else "membership",
        status="pending",
        product_id=package.id,
        payment_method=order_in.payment_method
    )
    db.add(order)
    db.commit()
    
    return order_no
