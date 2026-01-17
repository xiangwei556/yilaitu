from fastapi import APIRouter, Depends, Query, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from sqlalchemy import desc, asc
from typing import Optional, List
import os
import uuid

from backend.passport.app.api.deps import get_db, get_current_user
from backend.passport.app.models.user import User
from backend.passport.app.schemas.common import Response
from backend.sys_images.models.sys_image import SysBackground
from backend.sys_images.schemas.background import (
    BackgroundCreate, BackgroundUpdate, BackgroundResponse, BackgroundListResponse
)

router = APIRouter()

# 图片存储目录
DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "data", "sys-images", "backgrounds")
os.makedirs(DATA_DIR, exist_ok=True)


@router.get("/admin/backgrounds", response_model=BackgroundListResponse)
def list_backgrounds(
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    name: Optional[str] = None,
    status: Optional[str] = None,
    sort_by: str = Query("created_at"),
    order: str = Query("desc"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """获取背景图列表"""
    query = db.query(SysBackground)

    if name:
        query = query.filter(SysBackground.name.like(f"%{name}%"))
    if status:
        query = query.filter(SysBackground.status == status)

    if sort_by == "name":
        sort_col = SysBackground.name
    elif sort_by == "status":
        sort_col = SysBackground.status
    else:
        sort_col = SysBackground.created_at

    query = query.order_by(desc(sort_col) if order == "desc" else asc(sort_col))
    total = query.count()
    items = query.offset((page - 1) * page_size).limit(page_size).all()

    return {"items": items, "total": total}


@router.post("/admin/backgrounds", response_model=Response[BackgroundResponse])
def create_background(
    name: str = Form(...),
    status: str = Form("enabled"),
    file: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """创建背景图（支持同时上传图片）"""
    image_url = None
    
    if file and file.filename:
        ext = os.path.splitext(file.filename)[1] or ".jpg"
        fname = f"{uuid.uuid4().hex}{ext}"
        fs_path = os.path.join(DATA_DIR, fname)
        with open(fs_path, "wb") as f:
            f.write(file.file.read())
        image_url = f"/api/v1/sys-images/files/backgrounds/{fname}"
    
    background = SysBackground(
        name=name,
        image_url=image_url,
        status=status
    )
    db.add(background)
    db.commit()
    db.refresh(background)
    return Response(data=background)


@router.get("/admin/backgrounds/{background_id}", response_model=Response[BackgroundResponse])
def get_background(
    background_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """获取背景图详情"""
    background = db.query(SysBackground).filter(SysBackground.id == background_id).first()
    if not background:
        raise HTTPException(status_code=404, detail="背景图不存在")
    return Response(data=background)


@router.put("/admin/backgrounds/{background_id}", response_model=Response[BackgroundResponse])
def update_background(
    background_id: int,
    name: Optional[str] = Form(None),
    status: Optional[str] = Form(None),
    file: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """更新背景图"""
    background = db.query(SysBackground).filter(SysBackground.id == background_id).first()
    if not background:
        raise HTTPException(status_code=404, detail="背景图不存在")

    if name is not None:
        background.name = name
    if status is not None:
        background.status = status
    
    if file and file.filename:
        if background.image_url:
            try:
                old_basename = os.path.basename(background.image_url)
                os.remove(os.path.join(DATA_DIR, old_basename))
            except Exception:
                pass
        
        ext = os.path.splitext(file.filename)[1] or ".jpg"
        fname = f"{uuid.uuid4().hex}{ext}"
        fs_path = os.path.join(DATA_DIR, fname)
        with open(fs_path, "wb") as f:
            f.write(file.file.read())
        background.image_url = f"/api/v1/sys-images/files/backgrounds/{fname}"

    db.commit()
    db.refresh(background)
    return Response(data=background)


@router.delete("/admin/backgrounds/{background_id}")
def delete_background(
    background_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """删除背景图"""
    background = db.query(SysBackground).filter(SysBackground.id == background_id).first()
    if not background:
        return {"deleted": 0}

    # 删除图片文件
    if background.image_url:
        try:
            basename = os.path.basename(background.image_url)
            os.remove(os.path.join(DATA_DIR, basename))
        except Exception:
            pass

    db.delete(background)
    db.commit()
    return {"deleted": 1}


@router.post("/admin/backgrounds/batch-delete")
def batch_delete_backgrounds(
    ids: List[int],
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """批量删除背景图"""
    backgrounds = db.query(SysBackground).filter(SysBackground.id.in_(ids)).all()

    for bg in backgrounds:
        if bg.image_url:
            try:
                basename = os.path.basename(bg.image_url)
                os.remove(os.path.join(DATA_DIR, basename))
            except Exception:
                pass
        db.delete(bg)

    db.commit()
    return {"deleted": len(backgrounds)}


@router.post("/admin/backgrounds/{background_id}/status", response_model=Response)
def change_background_status(
    background_id: int,
    status: str = Query(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """修改背景图状态"""
    background = db.query(SysBackground).filter(SysBackground.id == background_id).first()
    if not background:
        return Response(data={"updated": 0})

    background.status = status
    db.commit()
    return Response(data={"updated": 1})


@router.post("/admin/backgrounds/batch-status")
def batch_change_background_status(
    ids: List[int],
    status: str = Query(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """批量修改背景图状态"""
    count = db.query(SysBackground).filter(SysBackground.id.in_(ids)).update(
        {"status": status}, synchronize_session=False
    )
    db.commit()
    return {"updated": count}


@router.post("/admin/backgrounds/{background_id}/image", response_model=Response[BackgroundResponse])
def upload_background_image(
    background_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """上传背景图片"""
    background = db.query(SysBackground).filter(SysBackground.id == background_id).first()
    if not background:
        raise HTTPException(status_code=404, detail="背景图不存在")

    # 删除旧图片
    if background.image_url:
        try:
            old_basename = os.path.basename(background.image_url)
            os.remove(os.path.join(DATA_DIR, old_basename))
        except Exception:
            pass

    # 保存新图片
    ext = os.path.splitext(file.filename)[1] or ".jpg"
    fname = f"{uuid.uuid4().hex}{ext}"
    fs_path = os.path.join(DATA_DIR, fname)
    with open(fs_path, "wb") as f:
        f.write(file.file.read())

    file_url = f"/api/v1/sys-images/files/backgrounds/{fname}"
    background.image_url = file_url

    db.commit()
    db.refresh(background)
    return Response(data=background)


# 公开API
@router.get("/backgrounds", response_model=Response[BackgroundListResponse])
def list_backgrounds_public(
    page: int = Query(1, ge=1),
    page_size: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db)
):
    """获取启用的背景图列表（公开API）"""
    query = db.query(SysBackground).filter(SysBackground.status == "enabled")
    query = query.order_by(asc(SysBackground.name))
    total = query.count()
    items = query.offset((page - 1) * page_size).limit(page_size).all()

    return Response(data={"items": items, "total": total})
