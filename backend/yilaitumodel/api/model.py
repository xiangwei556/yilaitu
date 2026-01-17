from fastapi import APIRouter, Depends, UploadFile, File, Form, Query, HTTPException, Body
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from sqlalchemy import desc, asc
from typing import Optional, List
import os
import uuid
import json

from backend.passport.app.api.deps import get_db, get_current_user
from backend.passport.app.models.user import User
from backend.yilaitumodel.models.model import YiLaiTuModel, YiLaiTuModelImage
from backend.yilaitumodel.schemas.model import Model as ModelSchema, ModelCreate, ModelUpdate, Page

router = APIRouter()

DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "data", "yilaitumodel")
os.makedirs(DATA_DIR, exist_ok=True)


def apply_filters(query, gender: Optional[str], age_group: Optional[str], body_type: Optional[str],
                  style: Optional[str], status: Optional[str], type: Optional[str] = None):
    if gender:
        query = query.filter(YiLaiTuModel.gender == gender)
    if age_group:
        query = query.filter(YiLaiTuModel.age_group == age_group)
    if body_type:
        query = query.filter(YiLaiTuModel.body_type == body_type)
    if style:
        query = query.filter(YiLaiTuModel.style == style)
    if status:
        query = query.filter(YiLaiTuModel.status == status)
    if type:
        query = query.filter(YiLaiTuModel.type == type)
    return query


@router.get("/admin/models", response_model=Page)
def list_models(
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    gender: Optional[str] = None,
    age_group: Optional[str] = None,
    body_type: Optional[str] = None,
    style: Optional[str] = None,
    status: Optional[str] = None,
    type: Optional[str] = None,
    sort_by: str = Query("created_at"),
    order: str = Query("desc"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(YiLaiTuModel)
    query = apply_filters(query, gender, age_group, body_type, style, status, type)
    if sort_by == "status":
        sort_col = YiLaiTuModel.status
    else:
        sort_col = YiLaiTuModel.created_at
    query = query.order_by(desc(sort_col) if order == "desc" else asc(sort_col))
    total = query.count()
    items = query.offset((page - 1) * page_size).limit(page_size).all()
    return {"items": items, "total": total, "page": page, "page_size": page_size}


@router.post("/admin/models", response_model=ModelSchema)
def create_model(data: ModelCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    # 自动设置user_id为当前登录用户的ID
    model_data = data.dict()
    model_data['user_id'] = current_user.id
    m = YiLaiTuModel(**model_data)
    db.add(m)
    db.commit()
    db.refresh(m)
    return m


@router.get("/admin/models/{model_id}", response_model=ModelSchema)
def get_model(model_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return db.query(YiLaiTuModel).filter(YiLaiTuModel.id == model_id).first()


@router.put("/admin/models/{model_id}", response_model=ModelSchema)
def update_model(model_id: int, data: ModelUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    m = db.query(YiLaiTuModel).filter(YiLaiTuModel.id == model_id).first()
    if not m:
        return None
    for k, v in data.dict(exclude_unset=True).items():
        setattr(m, k, v)
    db.commit()
    db.refresh(m)
    return m


@router.delete("/admin/models/{model_id}")
def delete_model(model_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    m = db.query(YiLaiTuModel).filter(YiLaiTuModel.id == model_id).first()
    if not m:
        return {"deleted": 0}
    # Delete images files on disk
    for img in m.images:
        try:
            os.remove(img.file_path)
        except Exception:
            pass
    db.delete(m)
    db.commit()
    return {"deleted": 1}


@router.post("/admin/models/batch-delete")
def batch_delete(ids: List[int], db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    qs = db.query(YiLaiTuModel).filter(YiLaiTuModel.id.in_(ids)).all()
    for m in qs:
        for img in m.images:
            try:
                os.remove(img.file_path)
            except Exception:
                pass
        db.delete(m)
    db.commit()
    return {"deleted": len(qs)}


@router.post("/admin/models/{model_id}/status")
def change_status(model_id: int, status: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    m = db.query(YiLaiTuModel).filter(YiLaiTuModel.id == model_id).first()
    if not m:
        return {"updated": 0}
    m.status = status
    db.commit()
    return {"updated": 1}


@router.post("/admin/models/batch-status")
def batch_change_status(ids: List[int], status: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    qs = db.query(YiLaiTuModel).filter(YiLaiTuModel.id.in_(ids))
    count = qs.count()
    qs.update({"status": status})
    db.commit()
    return {"updated": count}


@router.post("/admin/models/{model_id}/images", response_model=ModelSchema)
def upload_model_image(
    model_id: int,
    file: UploadFile = File(...),
    view: Optional[str] = Form(None),
    is_cover: bool = Form(False),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    m = db.query(YiLaiTuModel).filter(YiLaiTuModel.id == model_id).first()
    if not m:
        return None
    
    # 保存图片到磁盘
    ext = os.path.splitext(file.filename)[1] or ".jpg"
    fname = f"{uuid.uuid4().hex}{ext}"
    fs_path = os.path.join(DATA_DIR, fname)
    with open(fs_path, "wb") as f:
        f.write(file.file.read())
    file_url = f"/api/v1/yilaitumodel/files/{fname}"
    
    # 如果是封面图片且已有图片，更新已有记录
    if is_cover and m.images:
        # 查找封面图片或第一张图片
        cover_image = next((img for img in m.images if img.is_cover), m.images[0])
        
        # 删除旧图片文件
        try:
            old_basename = os.path.basename(cover_image.file_path)
            os.remove(os.path.join(DATA_DIR, old_basename))
        except Exception:
            pass
        
        # 更新图片记录
        cover_image.file_path = file_url
        cover_image.view = view
        cover_image.is_cover = True
    else:
        # 没有图片，新增一条记录
        img = YiLaiTuModelImage(model_id=model_id, file_path=file_url, view=view, is_cover=is_cover)
        db.add(img)
    
    if is_cover:
        m.avatar = file_url
    
    db.commit()
    db.refresh(m)
    return m


@router.delete("/admin/models/{model_id}/images/{image_id}", response_model=ModelSchema)
def delete_model_image(model_id: int, image_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    img = db.query(YiLaiTuModelImage).filter(YiLaiTuModelImage.id == image_id, YiLaiTuModelImage.model_id == model_id).first()
    m = db.query(YiLaiTuModel).filter(YiLaiTuModel.id == model_id).first()
    if img:
        try:
            basename = os.path.basename(img.file_path)
            os.remove(os.path.join(DATA_DIR, basename))
        except Exception:
            pass
        db.delete(img)
        db.commit()
    if m:
        db.refresh(m)
    return m


@router.post("/admin/models/clear-all")
def clear_all_models(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """清空所有模型和图片记录"""
    return clear_all_models_internal(db)


@router.post("/admin/models/clear-all-public")
def clear_all_models_public(db: Session = Depends(get_db)):
    """清空所有模型和图片记录（无需认证，仅用于测试）"""
    return clear_all_models_internal(db)


def clear_all_models_internal(db: Session):
    """内部函数：清空所有模型和图片记录"""
    # 先删除所有图片记录
    images = db.query(YiLaiTuModelImage).all()
    for img in images:
        try:
            basename = os.path.basename(img.file_path)
            os.remove(os.path.join(DATA_DIR, basename))
        except Exception:
            pass
    db.query(YiLaiTuModelImage).delete()
    
    # 再删除所有模型记录
    db.query(YiLaiTuModel).delete()
    
    db.commit()
    
    return {"message": "所有模型和图片记录已清空", "deleted_models": db.query(YiLaiTuModel).count(), "deleted_images": db.query(YiLaiTuModelImage).count()}


# Public API for C-end users

@router.get("/models", response_model=Page)
def list_models_public(
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    skip: Optional[int] = Query(None),
    gender: Optional[str] = None,
    age_group: Optional[str] = None,
    body_type: Optional[str] = None,
    style: Optional[str] = None,
    type: Optional[str] = None,
    db: Session = Depends(get_db),
):
    query = db.query(YiLaiTuModel).filter(YiLaiTuModel.status == "enabled")
    query = apply_filters(query, gender, age_group, body_type, style, status=None, type=type)
    total = query.count()
    
    offset_val = skip if skip is not None else (page - 1) * page_size
    items = query.order_by(desc(YiLaiTuModel.created_at)).offset(offset_val).limit(page_size).all()
    
    return {"items": items, "total": total, "page": page, "page_size": page_size}

@router.get("/my-models", response_model=Page)
def get_my_models(
    page: int = Query(1, ge=1),
    page_size: int = Query(100, ge=1, le=100), # Allow larger page size for user models
    skip: Optional[int] = Query(None),
    type: Optional[str] = Query(None),  # 新增type参数
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(YiLaiTuModel).filter(YiLaiTuModel.user_id == current_user.id, YiLaiTuModel.status == "enabled")

    # 根据type参数筛选
    if type:
        query = query.filter(YiLaiTuModel.type == type)
    else:
        query = query.filter(YiLaiTuModel.type == "user")

    total = query.count()

    offset_val = skip if skip is not None else (page - 1) * page_size
    items = query.order_by(desc(YiLaiTuModel.created_at)).offset(offset_val).limit(page_size).all()

    return {"items": items, "total": total, "page": page, "page_size": page_size}

@router.post("/my-models", response_model=ModelSchema)
def create_my_model(
    gender: str = Form(...),
    age_group: str = Form(...),
    body_type: str = Form(...),
    style: str = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # 1. Create Model Record
    model_data = {
        "gender": gender,
        "age_group": age_group,
        "body_type": body_type,
        "style": style,
        "type": "user",
        "user_id": current_user.id,
        "status": "enabled",
        "name": f"{style} {body_type}" # Default name
    }
    m = YiLaiTuModel(**model_data)
    db.add(m)
    db.commit()
    db.refresh(m)
    
    # 2. Upload Image
    ext = os.path.splitext(file.filename)[1] or ".jpg"
    fname = f"{uuid.uuid4().hex}{ext}"
    fs_path = os.path.join(DATA_DIR, fname)
    with open(fs_path, "wb") as f:
        f.write(file.file.read())
    file_url = f"/api/v1/yilaitumodel/files/{fname}"
    
    img = YiLaiTuModelImage(model_id=m.id, file_path=file_url, is_cover=True)
    db.add(img)
    m.avatar = file_url
    
    db.commit()
    db.refresh(m)
    return m

@router.put("/my-models/{model_id}", response_model=ModelSchema)
def update_my_model(
    model_id: int,
    gender: str = Form(None),
    age_group: str = Form(None),
    body_type: str = Form(None),
    style: str = Form(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    m = db.query(YiLaiTuModel).filter(YiLaiTuModel.id == model_id, YiLaiTuModel.user_id == current_user.id).first()
    if not m:
        raise HTTPException(status_code=404, detail="Model not found")
    
    if gender: m.gender = gender
    if age_group: m.age_group = age_group
    if body_type: m.body_type = body_type
    if style: m.style = style
    
    db.commit()
    db.refresh(m)
    return m

@router.delete("/my-models/{model_id}")
def delete_my_model(
    model_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    m = db.query(YiLaiTuModel).filter(YiLaiTuModel.id == model_id, YiLaiTuModel.user_id == current_user.id).first()
    if not m:
        return {"deleted": 0}
        
    # Check if it's a copied system model
    is_copied_model = m.copy_system_model == 1
    
    # Delete images files on disk only if it's NOT a copied system model
    if not is_copied_model:
        for img in m.images:
            try:
                if img.file_path.startswith("/api/v1/yilaitumodel/files/"):
                    fname = img.file_path.split("/")[-1]
                    os.remove(os.path.join(DATA_DIR, fname))
            except Exception:
                pass
            
    # Delete model record from database
    db.delete(m)
    db.commit()
    return {"deleted": 1}


@router.post("/add-system-to-my")
def add_system_model_to_my(
    system_model_id: int = Body(..., embed=True),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """添加系统模特到我的模特库"""
    # 查询系统模特
    system_model = db.query(YiLaiTuModel).filter(
        YiLaiTuModel.id == system_model_id,
        YiLaiTuModel.type == "system",
        YiLaiTuModel.status == "enabled"
    ).first()
    
    if not system_model:
        raise HTTPException(status_code=404, detail="系统模特不存在或已禁用")
    
    # 创建用户模特记录
    user_model_data = {
        "name": system_model.name,
        "gender": system_model.gender,
        "age_group": system_model.age_group,
        "body_type": system_model.body_type,
        "style": system_model.style,
        "status": "enabled",
        "type": "user",
        "user_id": current_user.id,
        "avatar": system_model.avatar,
        "copy_system_model": 1  # 设置为拷贝的系统模特
    }
    
    user_model = YiLaiTuModel(**user_model_data)
    db.add(user_model)
    db.commit()
    db.refresh(user_model)
    
    # 复制图片记录
    for img in system_model.images:
        user_img = YiLaiTuModelImage(
            model_id=user_model.id,
            file_path=img.file_path,
            view=img.view,
            is_cover=img.is_cover
        )
        db.add(user_img)
    
    db.commit()
    db.refresh(user_model)
    
    return {"id": user_model.id, "message": "添加成功"}


# 参考图数据目录
CANKAOTU_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "data", "cankaotu")
os.makedirs(CANKAOTU_DIR, exist_ok=True)


@router.post("/my-models/cankaotu", response_model=ModelSchema)
def upload_cankaotu(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """上传参考图"""
    # 1. 保存图片到磁盘
    ext = os.path.splitext(file.filename)[1] or ".jpg"
    fname = f"{uuid.uuid4().hex}{ext}"
    fs_path = os.path.join(CANKAOTU_DIR, fname)
    with open(fs_path, "wb") as f:
        f.write(file.file.read())
    file_url = f"/api/v1/yilaitumodel/cankaotu/{fname}"

    # 2. 创建记录
    model_data = {
        "type": "cankaotu",
        "user_id": current_user.id,
        "status": "enabled",
        "name": fname,
        "avatar": file_url,
        "gender": "",
        "age_group": "",
        "body_type": "",
        "style": ""
    }
    m = YiLaiTuModel(**model_data)
    db.add(m)
    db.commit()
    db.refresh(m)

    # 3. 创建图片记录
    img = YiLaiTuModelImage(model_id=m.id, file_path=file_url, is_cover=True)
    db.add(img)
    db.commit()
    db.refresh(m)

    return m


@router.delete("/my-models/cankaotu/{model_id}")
def delete_cankaotu(
    model_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """删除参考图"""
    m = db.query(YiLaiTuModel).filter(
        YiLaiTuModel.id == model_id,
        YiLaiTuModel.user_id == current_user.id,
        YiLaiTuModel.type == "cankaotu"
    ).first()
    if not m:
        return {"deleted": 0}

    # 删除图片文件
    for img in m.images:
        try:
            if img.file_path.startswith("/api/v1/yilaitumodel/cankaotu/"):
                fname = img.file_path.split("/")[-1]
                os.remove(os.path.join(CANKAOTU_DIR, fname))
        except Exception:
            pass

    db.delete(m)
    db.commit()
    return {"deleted": 1}


@router.get("/cankaotu/{filename}")
def get_cankaotu_file(filename: str):
    """获取参考图文件"""
    file_path = os.path.join(CANKAOTU_DIR, filename)
    if os.path.exists(file_path):
        return FileResponse(file_path)
    raise HTTPException(status_code=404, detail="File not found")
