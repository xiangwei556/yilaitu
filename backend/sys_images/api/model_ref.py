from fastapi import APIRouter, Depends, Query, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import desc, asc
from typing import Optional, List
import os
import uuid

from backend.passport.app.api.deps import get_db, get_current_user
from backend.passport.app.models.user import User
from backend.passport.app.schemas.common import Response
from backend.sys_images.models.sys_image import SysModelRef, SysCategory, sys_model_ref_categories
from backend.sys_images.schemas.model_ref import (
    ModelRefCreate, ModelRefUpdate, ModelRefResponse, ModelRefListResponse
)

router = APIRouter()

# 图片存储目录
DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "data", "sys-images", "model-refs")
os.makedirs(DATA_DIR, exist_ok=True)


@router.get("/admin/model-refs", response_model=Response[ModelRefListResponse])
def list_model_refs(
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    gender: Optional[str] = None,
    age_group: Optional[str] = None,
    category_ids: Optional[str] = None,  # 逗号分隔的类目ID
    status: Optional[str] = None,
    sort_by: str = Query("created_at"),
    order: str = Query("desc"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """获取模特参考图列表"""
    query = db.query(SysModelRef).options(joinedload(SysModelRef.categories))

    if gender:
        query = query.filter(SysModelRef.gender == gender)
    if age_group:
        query = query.filter(SysModelRef.age_group == age_group)
    if status:
        query = query.filter(SysModelRef.status == status)
    if category_ids:
        cat_id_list = [int(id) for id in category_ids.split(",") if id.strip()]
        if cat_id_list:
            query = query.join(sys_model_ref_categories).filter(
                sys_model_ref_categories.c.category_id.in_(cat_id_list)
            ).distinct()

    if sort_by == "gender":
        sort_col = SysModelRef.gender
    elif sort_by == "age_group":
        sort_col = SysModelRef.age_group
    elif sort_by == "status":
        sort_col = SysModelRef.status
    else:
        sort_col = SysModelRef.created_at

    query = query.order_by(desc(sort_col) if order == "desc" else asc(sort_col))
    total = query.count()
    items = query.offset((page - 1) * page_size).limit(page_size).all()

    return Response(data={"items": items, "total": total})


@router.post("/admin/model-refs", response_model=Response[ModelRefResponse])
def create_model_ref(
    gender: str = Form(...),
    age_group: str = Form(...),
    category_ids: str = Form(""),
    status: str = Form("enabled"),
    file: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """创建模特参考图（支持同时上传图片）"""
    image_url = None
    
    # 如果有上传文件，先保存图片
    if file and file.filename:
        ext = os.path.splitext(file.filename)[1] or ".jpg"
        fname = f"{uuid.uuid4().hex}{ext}"
        fs_path = os.path.join(DATA_DIR, fname)
        with open(fs_path, "wb") as f:
            f.write(file.file.read())
        image_url = f"/api/v1/sys-images/files/model-refs/{fname}"
    
    # 解析类目ID列表
    category_id_list = []
    if category_ids:
        category_id_list = [int(id) for id in category_ids.split(",") if id.strip()]
    
    # 创建记录
    model_ref = SysModelRef(
        image_url=image_url,
        gender=gender,
        age_group=age_group,
        status=status
    )
    
    # 关联类目
    if category_id_list:
        categories = db.query(SysCategory).filter(SysCategory.id.in_(category_id_list)).all()
        model_ref.categories = categories
    
    db.add(model_ref)
    db.commit()
    db.refresh(model_ref)
    return Response(data=model_ref)


@router.get("/admin/model-refs/{model_ref_id}", response_model=Response[ModelRefResponse])
def get_model_ref(
    model_ref_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """获取模特参考图详情"""
    model_ref = db.query(SysModelRef).options(
        joinedload(SysModelRef.categories)
    ).filter(SysModelRef.id == model_ref_id).first()
    if not model_ref:
        raise HTTPException(status_code=404, detail="模特参考图不存在")
    return Response(data=model_ref)


@router.put("/admin/model-refs/{model_ref_id}", response_model=Response[ModelRefResponse])
def update_model_ref(
    model_ref_id: int,
    gender: Optional[str] = Form(None),
    age_group: Optional[str] = Form(None),
    category_ids: Optional[str] = Form(None),
    status: Optional[str] = Form(None),
    file: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """更新模特参考图"""
    model_ref = db.query(SysModelRef).options(
        joinedload(SysModelRef.categories)
    ).filter(SysModelRef.id == model_ref_id).first()
    if not model_ref:
        raise HTTPException(status_code=404, detail="模特参考图不存在")

    if gender is not None:
        model_ref.gender = gender
    if age_group is not None:
        model_ref.age_group = age_group
    if status is not None:
        model_ref.status = status

    if file and file.filename:
        if model_ref.image_url:
            try:
                old_basename = os.path.basename(model_ref.image_url)
                os.remove(os.path.join(DATA_DIR, old_basename))
            except Exception:
                pass
        
        ext = os.path.splitext(file.filename)[1] or ".jpg"
        fname = f"{uuid.uuid4().hex}{ext}"
        fs_path = os.path.join(DATA_DIR, fname)
        with open(fs_path, "wb") as f:
            f.write(file.file.read())
        model_ref.image_url = f"/api/v1/sys-images/files/model-refs/{fname}"

    if category_ids is not None:
        category_id_list = [int(id) for id in category_ids.split(",") if id.strip()]
        categories = db.query(SysCategory).filter(SysCategory.id.in_(category_id_list)).all()
        model_ref.categories = categories

    db.commit()
    db.refresh(model_ref)
    return Response(data=model_ref)


@router.delete("/admin/model-refs/{model_ref_id}", response_model=Response)
def delete_model_ref(
    model_ref_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """删除模特参考图"""
    model_ref = db.query(SysModelRef).filter(SysModelRef.id == model_ref_id).first()
    if not model_ref:
        return Response(data={"deleted": 0})

    # 删除图片文件
    if model_ref.image_url:
        try:
            basename = os.path.basename(model_ref.image_url)
            os.remove(os.path.join(DATA_DIR, basename))
        except Exception:
            pass

    db.delete(model_ref)
    db.commit()
    return Response(data={"deleted": 1})


@router.post("/admin/model-refs/batch-delete")
def batch_delete_model_refs(
    ids: List[int],
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """批量删除模特参考图"""
    model_refs = db.query(SysModelRef).filter(SysModelRef.id.in_(ids)).all()

    for model_ref in model_refs:
        if model_ref.image_url:
            try:
                basename = os.path.basename(model_ref.image_url)
                os.remove(os.path.join(DATA_DIR, basename))
            except Exception:
                pass
        db.delete(model_ref)

    db.commit()
    return {"deleted": len(model_refs)}


@router.post("/admin/model-refs/{model_ref_id}/status")
def change_model_ref_status(
    model_ref_id: int,
    status: str = Query(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """修改模特参考图状态"""
    model_ref = db.query(SysModelRef).filter(SysModelRef.id == model_ref_id).first()
    if not model_ref:
        return {"updated": 0}

    model_ref.status = status
    db.commit()
    return {"updated": 1}


@router.post("/admin/model-refs/batch-status")
def batch_change_model_ref_status(
    ids: List[int],
    status: str = Query(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """批量修改模特参考图状态"""
    count = db.query(SysModelRef).filter(SysModelRef.id.in_(ids)).update(
        {"status": status}, synchronize_session=False
    )
    db.commit()
    return {"updated": count}


@router.post("/admin/model-refs/{model_ref_id}/image", response_model=ModelRefResponse)
def upload_model_ref_image(
    model_ref_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """上传模特参考图片"""
    model_ref = db.query(SysModelRef).options(
        joinedload(SysModelRef.categories)
    ).filter(SysModelRef.id == model_ref_id).first()
    if not model_ref:
        raise HTTPException(status_code=404, detail="模特参考图不存在")

    # 删除旧图片
    if model_ref.image_url:
        try:
            old_basename = os.path.basename(model_ref.image_url)
            os.remove(os.path.join(DATA_DIR, old_basename))
        except Exception:
            pass

    # 保存新图片
    ext = os.path.splitext(file.filename)[1] or ".jpg"
    fname = f"{uuid.uuid4().hex}{ext}"
    fs_path = os.path.join(DATA_DIR, fname)
    with open(fs_path, "wb") as f:
        f.write(file.file.read())

    file_url = f"/api/v1/sys-images/files/model-refs/{fname}"
    model_ref.image_url = file_url

    db.commit()
    db.refresh(model_ref)
    return model_ref


# 公开API
@router.get("/model-refs", response_model=Response[ModelRefListResponse])
def list_model_refs_public(
    page: int = Query(1, ge=1),
    page_size: int = Query(100, ge=1, le=500),
    gender: Optional[str] = None,
    age_group: Optional[str] = None,
    category_ids: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """获取启用的模特参考图列表（公开API）"""
    query = db.query(SysModelRef).options(
        joinedload(SysModelRef.categories)
    ).filter(SysModelRef.status == "enabled")

    if gender:
        query = query.filter(SysModelRef.gender == gender)
    if age_group:
        query = query.filter(SysModelRef.age_group == age_group)
    if category_ids:
        cat_id_list = [int(id) for id in category_ids.split(",") if id.strip()]
        if cat_id_list:
            query = query.join(sys_model_ref_categories).filter(
                sys_model_ref_categories.c.category_id.in_(cat_id_list)
            ).distinct()

    query = query.order_by(asc(SysModelRef.created_at))
    total = query.count()
    items = query.offset((page - 1) * page_size).limit(page_size).all()

    return Response(data={"items": items, "total": total})
