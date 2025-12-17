from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from backend.passport.app.api.deps import get_db, get_current_user
from backend.notification.models.notification import NotificationTemplate
from backend.notification.schemas.notification import NotificationTemplate as NotificationTemplateSchema, NotificationTemplateCreate
from backend.passport.app.models.user import User

router = APIRouter()

@router.post("/admin/templates", response_model=NotificationTemplateSchema)
def create_template(
    template: NotificationTemplateCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role not in ["admin", "super_admin", "growth-hacker"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    db_tpl = NotificationTemplate(**template.dict())
    db.add(db_tpl)
    db.commit()
    db.refresh(db_tpl)
    return db_tpl

@router.get("/admin/templates", response_model=List[NotificationTemplateSchema])
def list_templates(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role not in ["admin", "super_admin", "growth-hacker", "developer"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    return db.query(NotificationTemplate).all()
