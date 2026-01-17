from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import desc, asc
from typing import Optional, List

from backend.passport.app.api.deps import get_db, get_current_user
from backend.passport.app.models.user import User
from backend.passport.app.schemas.common import Response
from backend.sys_images.models.sys_image import SysCategory
from backend.sys_images.schemas.category import (
    CategoryCreate, CategoryUpdate, CategoryResponse, CategoryListResponse
)

router = APIRouter()


@router.get("/admin/categories", response_model=Response[CategoryListResponse])
def list_categories(
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=500),
    name: Optional[str] = None,
    status: Optional[str] = None,
    sort_by: str = Query("created_at"),
    order: str = Query("desc"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """获取类目列表"""
    query = db.query(SysCategory)

    if name:
        query = query.filter(SysCategory.name.like(f"%{name}%"))
    if status:
        query = query.filter(SysCategory.status == status)

    if sort_by == "name":
        sort_col = SysCategory.name
    elif sort_by == "status":
        sort_col = SysCategory.status
    else:
        sort_col = SysCategory.created_at

    query = query.order_by(desc(sort_col) if order == "desc" else asc(sort_col))
    total = query.count()
    items = query.offset((page - 1) * page_size).limit(page_size).all()

    return Response(data={"items": items, "total": total})


@router.post("/admin/categories", response_model=Response[CategoryResponse])
def create_category(
    data: CategoryCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """创建类目"""
    category = SysCategory(**data.dict())
    db.add(category)
    db.commit()
    db.refresh(category)
    return Response(data=category)


@router.get("/admin/categories/{category_id}", response_model=Response[CategoryResponse])
def get_category(
    category_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """获取类目详情"""
    category = db.query(SysCategory).filter(SysCategory.id == category_id).first()
    if not category:
        raise HTTPException(status_code=404, detail="类目不存在")
    return Response(data=category)


@router.put("/admin/categories/{category_id}", response_model=Response[CategoryResponse])
def update_category(
    category_id: int,
    data: CategoryUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """更新类目"""
    category = db.query(SysCategory).filter(SysCategory.id == category_id).first()
    if not category:
        raise HTTPException(status_code=404, detail="类目不存在")

    for k, v in data.dict(exclude_unset=True).items():
        setattr(category, k, v)

    db.commit()
    db.refresh(category)
    return Response(data=category)


@router.delete("/admin/categories/{category_id}", response_model=Response)
def delete_category(
    category_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """删除类目"""
    category = db.query(SysCategory).filter(SysCategory.id == category_id).first()
    if not category:
        return Response(data={"deleted": 0})

    db.delete(category)
    db.commit()
    return Response(data={"deleted": 1})


@router.post("/admin/categories/batch-delete", response_model=Response)
def batch_delete_categories(
    ids: List[int],
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """批量删除类目"""
    count = db.query(SysCategory).filter(SysCategory.id.in_(ids)).delete(synchronize_session=False)
    db.commit()
    return Response(data={"deleted": count})


@router.post("/admin/categories/{category_id}/status", response_model=Response)
def change_category_status(
    category_id: int,
    status: str = Query(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """修改类目状态"""
    category = db.query(SysCategory).filter(SysCategory.id == category_id).first()
    if not category:
        return Response(data={"updated": 0})

    category.status = status
    db.commit()
    return Response(data={"updated": 1})


@router.post("/admin/categories/batch-status", response_model=Response)
def batch_change_category_status(
    ids: List[int],
    status: str = Query(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """批量修改类目状态"""
    count = db.query(SysCategory).filter(SysCategory.id.in_(ids)).update(
        {"status": status}, synchronize_session=False
    )
    db.commit()
    return Response(data={"updated": count})


# 公开API
@router.get("/categories", response_model=Response[CategoryListResponse])
def list_categories_public(
    page: int = Query(1, ge=1),
    page_size: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db)
):
    """获取启用的类目列表（公开API）"""
    query = db.query(SysCategory).filter(SysCategory.status == "enabled")
    query = query.order_by(asc(SysCategory.name))
    total = query.count()
    items = query.offset((page - 1) * page_size).limit(page_size).all()

    return Response(data={"items": items, "total": total})
