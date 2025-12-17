from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from backend.passport.app.api.deps import get_db, get_current_user
from backend.points.models.points import PointsPackage, PointsRule, PointsAccount, PointsTransaction
from backend.points.schemas.points import PointsPackage as PointsPackageSchema, PointsPackageCreate, PointsRule as PointsRuleSchema, PointsRuleCreate, PointsAccount as PointsAccountSchema, PointsTransaction as PointsTransactionSchema, PointsAdjustment
from backend.passport.app.models.user import User
from typing import List
from datetime import datetime

router = APIRouter()

# --- Admin APIs (Points Packages & Rules) ---

@router.post("/admin/packages", response_model=PointsPackageSchema)
def create_points_package(
    package: PointsPackageCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role not in ["admin", "super_admin", "growth-hacker"]:
        raise HTTPException(status_code=403, detail="未授权")
    db_pkg = PointsPackage(**package.dict())
    db.add(db_pkg)
    db.commit()
    db.refresh(db_pkg)
    return db_pkg

@router.get("/admin/packages", response_model=List[PointsPackageSchema])
def list_points_packages_admin(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role not in ["admin", "super_admin", "growth-hacker", "developer"]:
        raise HTTPException(status_code=403, detail="未授权")
    return db.query(PointsPackage).all()

@router.put("/admin/packages/{package_id}", response_model=PointsPackageSchema)
def update_points_package(
    package_id: int,
    package: PointsPackageCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role not in ["admin", "super_admin", "growth-hacker"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    db_pkg = db.query(PointsPackage).filter(PointsPackage.id == package_id).first()
    if not db_pkg:
        raise HTTPException(status_code=404, detail="积分套餐不存在")
    for field, value in package.dict(exclude_unset=True).items():
        setattr(db_pkg, field, value)
    db.commit()
    db.refresh(db_pkg)
    return db_pkg

@router.post("/admin/rules", response_model=PointsRuleSchema)
def create_points_rule(
    rule: PointsRuleCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role not in ["admin", "super_admin", "growth-hacker"]:
        raise HTTPException(status_code=403, detail="未授权")
    
    # 检查规则编码是否已存在
    existing_rule = db.query(PointsRule).filter(PointsRule.code == rule.code).first()
    if existing_rule:
        raise HTTPException(status_code=400, detail=f"规则编码 '{rule.code}' 已存在")
        
    db_rule = PointsRule(**rule.dict())
    db.add(db_rule)
    db.commit()
    db.refresh(db_rule)
    return db_rule

@router.get("/admin/rules", response_model=List[PointsRuleSchema])
def list_points_rules(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role not in ["admin", "super_admin", "growth-hacker", "developer"]:
        raise HTTPException(status_code=403, detail="未授权")
    return db.query(PointsRule).all()

@router.put("/admin/rules/{rule_id}", response_model=PointsRuleSchema)
def update_points_rule(
    rule_id: int,
    rule: PointsRuleCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role not in ["admin", "super_admin", "growth-hacker"]:
        raise HTTPException(status_code=403, detail="未授权")
    db_rule = db.query(PointsRule).filter(PointsRule.id == rule_id).first()
    if not db_rule:
        raise HTTPException(status_code=404, detail="积分规则不存在")
    
    # 检查规则编码是否已被其他规则使用
    existing_rule = db.query(PointsRule).filter(PointsRule.code == rule.code, PointsRule.id != rule_id).first()
    if existing_rule:
        raise HTTPException(status_code=400, detail=f"规则编码 '{rule.code}' 已存在")
        
    for field, value in rule.dict(exclude_unset=True).items():
        setattr(db_rule, field, value)
    db.commit()
    db.refresh(db_rule)
    return db_rule

@router.post("/admin/adjust", response_model=PointsAccountSchema)
def adjust_points(
    adjustment: PointsAdjustment,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role not in ["admin", "super_admin", "growth-hacker"]:
        raise HTTPException(status_code=403, detail="Not authorized")
        
    account = db.query(PointsAccount).filter(PointsAccount.user_id == adjustment.user_id).first()
    if not account:
        account = PointsAccount(user_id=adjustment.user_id, balance_permanent=0, balance_limited=0)
        db.add(account)
    
    # Adjust permanent balance for simplicity in this version
    if adjustment.type == "earn":
        account.balance_permanent += adjustment.amount
    elif adjustment.type == "burn":
        if account.balance_permanent + account.balance_limited < adjustment.amount:
            raise HTTPException(status_code=400, detail="余额不足")
        # Logic to deduct from limited first then permanent (Simplified here: just deduct permanent)
        account.balance_permanent -= adjustment.amount
    
    # Record transaction
    tx = PointsTransaction(
        user_id=adjustment.user_id,
        type=adjustment.type,
        amount=adjustment.amount,
        balance_after=account.balance_permanent + account.balance_limited,
        source_type="admin_adjust",
        remark=adjustment.remark,
        created_at=datetime.now()
    )
    db.add(tx)
    db.commit()
    db.refresh(account)
    return account

@router.get("/admin/ledger", response_model=List[PointsTransactionSchema])
def list_ledger_admin(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role not in ["admin", "super_admin", "growth-hacker", "call-center"]:
        raise HTTPException(status_code=403, detail="未授权")
    return db.query(PointsTransaction).order_by(PointsTransaction.created_at.desc()).offset(skip).limit(limit).all()

# --- User APIs ---

@router.get("/packages", response_model=List[PointsPackageSchema])
def list_points_packages_public(db: Session = Depends(get_db)):
    return db.query(PointsPackage).filter(PointsPackage.is_active == True).all()

@router.get("/my-account", response_model=PointsAccountSchema)
def get_my_points_account(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    account = db.query(PointsAccount).filter(PointsAccount.user_id == current_user.id).first()
    if not account:
        # Create default account if not exists
        account = PointsAccount(user_id=current_user.id, balance_permanent=0, balance_limited=0)
        db.add(account)
        db.commit()
        db.refresh(account)
    return account

@router.get("/my-transactions", response_model=List[PointsTransactionSchema])
def get_my_transactions(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return db.query(PointsTransaction).filter(PointsTransaction.user_id == current_user.id).order_by(PointsTransaction.created_at.desc()).limit(50).all()
