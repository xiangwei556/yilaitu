from fastapi import APIRouter
import json
import os

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
