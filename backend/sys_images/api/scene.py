from fastapi import APIRouter, Depends, Query, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from sqlalchemy import desc, asc
from typing import Optional, List
import os
import uuid

from backend.passport.app.api.deps import get_db, get_current_user
from backend.passport.app.models.user import User
from backend.passport.app.schemas.common import Response
from backend.sys_images.models.sys_image import SysScene
from backend.sys_images.schemas.scene import (
    SceneCreate, SceneUpdate, SceneResponse, SceneListResponse
)

router = APIRouter()

# 图片存储目录
DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "data", "sys-images", "scenes")
os.makedirs(DATA_DIR, exist_ok=True)


@router.get("/admin/scenes", response_model=Response[SceneListResponse])
def list_scenes(
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    name: Optional[str] = None,
    status: Optional[str] = None,
    style: Optional[int] = None,
    sort_by: str = Query("created_at"),
    order: str = Query("desc"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """获取场景图列表"""
    query = db.query(SysScene)

    if name:
        query = query.filter(SysScene.name.like(f"%{name}%"))
    if status:
        query = query.filter(SysScene.status == status)
    if style:
        query = query.filter(SysScene.style == style)

    if sort_by == "name":
        sort_col = SysScene.name
    elif sort_by == "status":
        sort_col = SysScene.status
    else:
        sort_col = SysScene.created_at

    query = query.order_by(desc(sort_col) if order == "desc" else asc(sort_col))
    total = query.count()
    items = query.offset((page - 1) * page_size).limit(page_size).all()

    return Response(data=SceneListResponse(total=total, items=items))


@router.post("/admin/scenes", response_model=Response[SceneResponse])
def create_scene(
    name: str = Form(...),
    style: int = Form(1),
    status: str = Form("enabled"),
    file: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """创建场景图（支持同时上传图片）"""
    image_url = None
    
    if file and file.filename:
        ext = os.path.splitext(file.filename)[1] or ".jpg"
        fname = f"{uuid.uuid4().hex}{ext}"
        fs_path = os.path.join(DATA_DIR, fname)
        with open(fs_path, "wb") as f:
            f.write(file.file.read())
        image_url = f"/api/v1/sys-images/files/scenes/{fname}"
    
    scene = SysScene(
        name=name,
        image_url=image_url,
        style=style,
        status=status
    )
    db.add(scene)
    db.commit()
    db.refresh(scene)
    return Response(data=scene)


@router.get("/admin/scenes/{scene_id}", response_model=Response[SceneResponse])
def get_scene(
    scene_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """获取场景图详情"""
    scene = db.query(SysScene).filter(SysScene.id == scene_id).first()
    if not scene:
        raise HTTPException(status_code=404, detail="场景图不存在")
    return Response(data=scene)


@router.put("/admin/scenes/{scene_id}", response_model=Response[SceneResponse])
def update_scene(
    scene_id: int,
    name: Optional[str] = Form(None),
    style: Optional[int] = Form(None),
    status: Optional[str] = Form(None),
    file: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """更新场景图"""
    scene = db.query(SysScene).filter(SysScene.id == scene_id).first()
    if not scene:
        raise HTTPException(status_code=404, detail="场景图不存在")

    if name is not None:
        scene.name = name
    if style is not None:
        scene.style = style
    if status is not None:
        scene.status = status
    
    if file and file.filename:
        if scene.image_url:
            try:
                old_basename = os.path.basename(scene.image_url)
                os.remove(os.path.join(DATA_DIR, old_basename))
            except Exception:
                pass
        
        ext = os.path.splitext(file.filename)[1] or ".jpg"
        fname = f"{uuid.uuid4().hex}{ext}"
        fs_path = os.path.join(DATA_DIR, fname)
        with open(fs_path, "wb") as f:
            f.write(file.file.read())
        scene.image_url = f"/api/v1/sys-images/files/scenes/{fname}"

    db.commit()
    db.refresh(scene)
    return Response(data=scene)


@router.delete("/admin/scenes/{scene_id}")
def delete_scene(
    scene_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """删除场景图"""
    scene = db.query(SysScene).filter(SysScene.id == scene_id).first()
    if not scene:
        return {"deleted": 0}

    # 删除图片文件
    if scene.image_url:
        try:
            basename = os.path.basename(scene.image_url)
            os.remove(os.path.join(DATA_DIR, basename))
        except Exception:
            pass

    db.delete(scene)
    db.commit()
    return {"deleted": 1}


@router.post("/admin/scenes/batch-delete")
def batch_delete_scenes(
    ids: List[int],
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """批量删除场景图"""
    scenes = db.query(SysScene).filter(SysScene.id.in_(ids)).all()

    for scene in scenes:
        if scene.image_url:
            try:
                basename = os.path.basename(scene.image_url)
                os.remove(os.path.join(DATA_DIR, basename))
            except Exception:
                pass
        db.delete(scene)

    db.commit()
    return {"deleted": len(scenes)}


@router.post("/admin/scenes/{scene_id}/status")
def change_scene_status(
    scene_id: int,
    status: str = Query(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """修改场景图状态"""
    scene = db.query(SysScene).filter(SysScene.id == scene_id).first()
    if not scene:
        return {"updated": 0}

    scene.status = status
    db.commit()
    return {"updated": 1}


@router.post("/admin/scenes/batch-status", response_model=Response)
def batch_change_scene_status(
    ids: List[int],
    status: str = Query(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """批量修改场景图状态"""
    count = db.query(SysScene).filter(SysScene.id.in_(ids)).update(
        {"status": status}, synchronize_session=False
    )
    db.commit()
    return Response(data={"updated": count})


@router.post("/admin/scenes/{scene_id}/image", response_model=Response[SceneResponse])
def upload_scene_image(
    scene_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """上传场景图片"""
    scene = db.query(SysScene).filter(SysScene.id == scene_id).first()
    if not scene:
        raise HTTPException(status_code=404, detail="场景图不存在")

    # 删除旧图片
    if scene.image_url:
        try:
            old_basename = os.path.basename(scene.image_url)
            os.remove(os.path.join(DATA_DIR, old_basename))
        except Exception:
            pass

    # 保存新图片
    ext = os.path.splitext(file.filename)[1] or ".jpg"
    fname = f"{uuid.uuid4().hex}{ext}"
    fs_path = os.path.join(DATA_DIR, fname)
    with open(fs_path, "wb") as f:
        f.write(file.file.read())

    file_url = f"/api/v1/sys-images/files/scenes/{fname}"
    scene.image_url = file_url

    db.commit()
    db.refresh(scene)
    return Response(data=scene)


# 公开API
@router.get("/scenes", response_model=Response[SceneListResponse])
def list_scenes_public(
    page: int = Query(1, ge=1),
    page_size: int = Query(100, ge=1, le=500),
    style: Optional[int] = None,
    db: Session = Depends(get_db)
):
    """获取启用的场景图列表（公开API）"""
    query = db.query(SysScene).filter(SysScene.status == "enabled")

    # 按style筛选（使用 is not None 确保 style=0 也能被处理）
    if style is not None:
        query = query.filter(SysScene.style == style)

    query = query.order_by(asc(SysScene.name))
    total = query.count()
    items = query.offset((page - 1) * page_size).limit(page_size).all()

    return Response(data=SceneListResponse(total=total, items=items))
