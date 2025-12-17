from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from backend.passport.app.api.deps import get_db, get_current_user
from backend.config_center.models.config import SystemConfig
from backend.config_center.schemas.config import SystemConfig as SystemConfigSchema, SystemConfigCreate
from backend.passport.app.models.user import User

router = APIRouter()

@router.post("/admin/configs", response_model=SystemConfigSchema)
def create_config(
    config: SystemConfigCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role not in ["admin", "super_admin", "growth-hacker"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    db_conf = SystemConfig(**config.dict())
    db.add(db_conf)
    db.commit()
    db.refresh(db_conf)
    return db_conf

@router.get("/admin/configs", response_model=List[SystemConfigSchema])
def list_configs(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role not in ["admin", "super_admin", "growth-hacker", "developer"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    return db.query(SystemConfig).all()
