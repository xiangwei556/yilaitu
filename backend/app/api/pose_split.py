from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import Optional
import json
import os

from backend.passport.app.api.deps import get_db
from backend.sys_images.models.sys_image import SysPose

router = APIRouter()

# 姿势数据文件路径 - 从backend/app/api/pose_split.py向上三级到backend目录，然后进入data目录
POSE_DATA_FILE = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "data", "pose_split_poses.json")

@router.get("/poses")
async def get_poses():
    """
    获取姿势裂变的姿势列表
    
    返回:
        姿势数组，每个姿势包含id、描述和图片URL
    """
    try:
        if not os.path.exists(POSE_DATA_FILE):
            return {
                "success": False,
                "message": "姿势数据文件不存在",
                "data": []
            }
        
        with open(POSE_DATA_FILE, "r", encoding="utf-8") as f:
            poses = json.load(f)
        
        return {
            "success": True,
            "message": "获取姿势列表成功",
            "data": poses
        }
    except Exception as e:
        return {
            "success": False,
            "message": f"获取姿势列表失败: {str(e)}",
            "data": []
        }


@router.get("/sys-poses")
def get_sys_poses(
    gender: Optional[str] = Query(None, description="性别筛选: male/female/all"),
    db: Session = Depends(get_db)
):
    """
    获取系统姿势图列表（从数据库读取）

    参数:
        gender: 可选，按性别筛选姿势 (male/female/all)

    返回:
        姿势数组，每个姿势包含id、描述、图片URL和骨架图URL
    """
    try:
        query = db.query(SysPose).filter(SysPose.status == "enabled")

        if gender:
            query = query.filter(SysPose.gender == gender)

        poses = query.all()

        # 转换为前端需要的格式
        result = []
        for pose in poses:
            result.append({
                "id": pose.id,
                "description": pose.name,
                "url": pose.image_url,
                "skeleton_url": pose.skeleton_url
            })

        return {
            "success": True,
            "message": "获取姿势列表成功",
            "data": result
        }
    except Exception as e:
        return {
            "success": False,
            "message": f"获取姿势列表失败: {str(e)}",
            "data": []
        }
