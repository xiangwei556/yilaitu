from fastapi import APIRouter, Depends, Query, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from sqlalchemy import desc, asc
from typing import Optional, List
import os
import uuid

from backend.passport.app.api.deps import get_db, get_current_user
from backend.passport.app.models.user import User
from backend.passport.app.schemas.common import Response
from backend.sys_images.models.sys_image import SysPose
from backend.sys_images.schemas.pose import (
    PoseCreate, PoseUpdate, PoseResponse, PoseListResponse
)

router = APIRouter()

# 图片存储目录
DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "data", "sys-images", "poses")
os.makedirs(DATA_DIR, exist_ok=True)


@router.get("/admin/poses", response_model=Response[PoseListResponse])
def list_poses(
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    name: Optional[str] = None,
    gender: Optional[str] = None,
    status: Optional[str] = None,
    sort_by: str = Query("created_at"),
    order: str = Query("desc"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """获取姿势图列表"""
    query = db.query(SysPose)

    if name:
        query = query.filter(SysPose.name.like(f"%{name}%"))
    if gender:
        query = query.filter(SysPose.gender == gender)
    if status:
        query = query.filter(SysPose.status == status)

    if sort_by == "name":
        sort_col = SysPose.name
    elif sort_by == "status":
        sort_col = SysPose.status
    else:
        sort_col = SysPose.created_at

    query = query.order_by(desc(sort_col) if order == "desc" else asc(sort_col))
    total = query.count()
    items = query.offset((page - 1) * page_size).limit(page_size).all()

    return Response(data={"items": items, "total": total})


@router.post("/admin/poses", response_model=Response[PoseResponse])
def create_pose(
    name: str = Form(...),
    gender: str = Form("all"),
    status: str = Form("enabled"),
    image_file: Optional[UploadFile] = File(None),
    skeleton_file: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """创建姿势图（支持同时上传图片）"""
    image_url = None
    skeleton_url = None

    if image_file and image_file.filename:
        ext = os.path.splitext(image_file.filename)[1] or ".jpg"
        fname = f"{uuid.uuid4().hex}{ext}"
        fs_path = os.path.join(DATA_DIR, fname)
        with open(fs_path, "wb") as f:
            f.write(image_file.file.read())
        image_url = f"/api/v1/sys-images/files/poses/{fname}"

    if skeleton_file and skeleton_file.filename:
        ext = os.path.splitext(skeleton_file.filename)[1] or ".jpg"
        fname = f"{uuid.uuid4().hex}_skeleton{ext}"
        fs_path = os.path.join(DATA_DIR, fname)
        with open(fs_path, "wb") as f:
            f.write(skeleton_file.file.read())
        skeleton_url = f"/api/v1/sys-images/files/poses/{fname}"

    pose = SysPose(
        name=name,
        gender=gender,
        image_url=image_url,
        skeleton_url=skeleton_url,
        status=status
    )
    db.add(pose)
    db.commit()
    db.refresh(pose)
    return Response(data=pose)


@router.get("/admin/poses/{pose_id}", response_model=Response[PoseResponse])
def get_pose(
    pose_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """获取姿势图详情"""
    pose = db.query(SysPose).filter(SysPose.id == pose_id).first()
    if not pose:
        raise HTTPException(status_code=404, detail="姿势图不存在")
    return Response(data=pose)


@router.put("/admin/poses/{pose_id}", response_model=Response[PoseResponse])
def update_pose(
    pose_id: int,
    name: Optional[str] = Form(None),
    gender: Optional[str] = Form(None),
    status: Optional[str] = Form(None),
    image_file: Optional[UploadFile] = File(None),
    skeleton_file: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """更新姿势图"""
    pose = db.query(SysPose).filter(SysPose.id == pose_id).first()
    if not pose:
        raise HTTPException(status_code=404, detail="姿势图不存在")

    if name is not None:
        pose.name = name
    if gender is not None:
        pose.gender = gender
    if status is not None:
        pose.status = status
    
    if image_file and image_file.filename:
        if pose.image_url:
            try:
                old_basename = os.path.basename(pose.image_url)
                os.remove(os.path.join(DATA_DIR, old_basename))
            except Exception:
                pass
        
        ext = os.path.splitext(image_file.filename)[1] or ".jpg"
        fname = f"{uuid.uuid4().hex}{ext}"
        fs_path = os.path.join(DATA_DIR, fname)
        with open(fs_path, "wb") as f:
            f.write(image_file.file.read())
        pose.image_url = f"/api/v1/sys-images/files/poses/{fname}"
    
    if skeleton_file and skeleton_file.filename:
        if pose.skeleton_url:
            try:
                old_basename = os.path.basename(pose.skeleton_url)
                os.remove(os.path.join(DATA_DIR, old_basename))
            except Exception:
                pass
        
        ext = os.path.splitext(skeleton_file.filename)[1] or ".jpg"
        fname = f"{uuid.uuid4().hex}_skeleton{ext}"
        fs_path = os.path.join(DATA_DIR, fname)
        with open(fs_path, "wb") as f:
            f.write(skeleton_file.file.read())
        pose.skeleton_url = f"/api/v1/sys-images/files/poses/{fname}"

    db.commit()
    db.refresh(pose)
    return Response(data=pose)


@router.delete("/admin/poses/{pose_id}")
def delete_pose(
    pose_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """删除姿势图"""
    pose = db.query(SysPose).filter(SysPose.id == pose_id).first()
    if not pose:
        return {"deleted": 0}

    # 删除图片文件
    if pose.image_url:
        try:
            basename = os.path.basename(pose.image_url)
            os.remove(os.path.join(DATA_DIR, basename))
        except Exception:
            pass
    if pose.skeleton_url:
        try:
            basename = os.path.basename(pose.skeleton_url)
            os.remove(os.path.join(DATA_DIR, basename))
        except Exception:
            pass

    db.delete(pose)
    db.commit()
    return {"deleted": 1}


@router.post("/admin/poses/batch-delete", response_model=Response)
def batch_delete_poses(
    ids: List[int],
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """批量删除姿势图"""
    poses = db.query(SysPose).filter(SysPose.id.in_(ids)).all()

    for pose in poses:
        if pose.image_url:
            try:
                basename = os.path.basename(pose.image_url)
                os.remove(os.path.join(DATA_DIR, basename))
            except Exception:
                pass
        if pose.skeleton_url:
            try:
                basename = os.path.basename(pose.skeleton_url)
                os.remove(os.path.join(DATA_DIR, basename))
            except Exception:
                pass
        db.delete(pose)

    db.commit()
    return Response(data={"deleted": len(poses)})


@router.post("/admin/poses/{pose_id}/status")
def change_pose_status(
    pose_id: int,
    status: str = Query(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """修改姿势图状态"""
    pose = db.query(SysPose).filter(SysPose.id == pose_id).first()
    if not pose:
        return {"updated": 0}

    pose.status = status
    db.commit()
    return {"updated": 1}


@router.post("/admin/poses/batch-status", response_model=Response)
def batch_change_pose_status(
    ids: List[int],
    status: str = Query(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """批量修改姿势图状态"""
    count = db.query(SysPose).filter(SysPose.id.in_(ids)).update(
        {"status": status}, synchronize_session=False
    )
    db.commit()
    return Response(data={"updated": count})


@router.post("/admin/poses/{pose_id}/image", response_model=PoseResponse)
def upload_pose_image(
    pose_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """上传姿势图片"""
    pose = db.query(SysPose).filter(SysPose.id == pose_id).first()
    if not pose:
        raise HTTPException(status_code=404, detail="姿势图不存在")

    # 删除旧图片
    if pose.image_url:
        try:
            old_basename = os.path.basename(pose.image_url)
            os.remove(os.path.join(DATA_DIR, old_basename))
        except Exception:
            pass

    # 保存新图片
    ext = os.path.splitext(file.filename)[1] or ".jpg"
    fname = f"{uuid.uuid4().hex}{ext}"
    fs_path = os.path.join(DATA_DIR, fname)
    with open(fs_path, "wb") as f:
        f.write(file.file.read())

    file_url = f"/api/v1/sys-images/files/poses/{fname}"
    pose.image_url = file_url

    db.commit()
    db.refresh(pose)
    return pose


@router.post("/admin/poses/{pose_id}/skeleton", response_model=PoseResponse)
def upload_pose_skeleton(
    pose_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """上传姿势骨架图"""
    pose = db.query(SysPose).filter(SysPose.id == pose_id).first()
    if not pose:
        raise HTTPException(status_code=404, detail="姿势图不存在")

    # 删除旧骨架图
    if pose.skeleton_url:
        try:
            old_basename = os.path.basename(pose.skeleton_url)
            os.remove(os.path.join(DATA_DIR, old_basename))
        except Exception:
            pass

    # 保存新骨架图
    ext = os.path.splitext(file.filename)[1] or ".jpg"
    fname = f"{uuid.uuid4().hex}_skeleton{ext}"
    fs_path = os.path.join(DATA_DIR, fname)
    with open(fs_path, "wb") as f:
        f.write(file.file.read())

    file_url = f"/api/v1/sys-images/files/poses/{fname}"
    pose.skeleton_url = file_url

    db.commit()
    db.refresh(pose)
    return pose


# 公开API
@router.get("/poses", response_model=Response[PoseListResponse])
def list_poses_public(
    page: int = Query(1, ge=1),
    page_size: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db)
):
    """获取启用的姿势图列表（公开API）"""
    query = db.query(SysPose).filter(SysPose.status == "enabled")
    query = query.order_by(asc(SysPose.name))
    total = query.count()
    items = query.offset((page - 1) * page_size).limit(page_size).all()

    return Response(data={"items": items, "total": total})
