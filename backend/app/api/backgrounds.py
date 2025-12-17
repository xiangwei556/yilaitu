from fastapi import APIRouter, Query, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from app.database import get_db
from app.models.background import Background
from app.schemas.background import BackgroundResponse, BackgroundListResponse
from app.utils.auth_utils import get_current_active_user
from app.models.user import User

router = APIRouter()

@router.get("/", response_model=BackgroundListResponse)
async def get_backgrounds(
    category: Optional[str] = Query(None, description="背景分类"),
    page: int = Query(1, ge=1, description="页码"),
    page_size: int = Query(20, ge=1, le=100, description="每页数量"),
    is_popular: Optional[bool] = Query(None, description="是否热门"),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """获取背景列表"""
    # 构建查询
    query = db.query(Background)
    
    # 如果指定了分类，进行过滤
    if category:
        query = query.filter(Background.category == category)
    
    # 如果指定了热门筛选
    if is_popular is not None:
        query = query.filter(Background.is_popular == is_popular)
    
    # 普通用户只能看到免费背景
    if not current_user.is_admin:
        query = query.filter(Background.is_premium == False)
    
    # 获取总数
    total = query.count()
    
    # 分页
    backgrounds = query.offset((page - 1) * page_size).limit(page_size).all()
    
    # 获取所有分类
    categories = db.query(Background.category).distinct().all()
    category_list = [cat[0] for cat in categories]
    
    return {
        "backgrounds": backgrounds,
        "total": total,
        "page": page,
        "page_size": page_size,
        "categories": category_list
    }

@router.get("/categories")
async def get_categories(db: Session = Depends(get_db)):
    """获取所有背景分类"""
    # 从数据库获取所有分类
    categories = db.query(Background.category).distinct().all()
    category_list = [cat[0] for cat in categories]
    return {"categories": category_list}

@router.get("/{background_id}", response_model=BackgroundResponse)
async def get_background(
    background_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """获取指定背景的详细信息"""
    # 查询背景
    background = db.query(Background).filter(Background.id == background_id).first()
    
    if not background:
        raise HTTPException(status_code=404, detail="背景不存在")
    
    # 检查权限：付费背景只有管理员或付费用户可以访问
    if background.is_premium and not current_user.is_admin:
        raise HTTPException(status_code=403, detail="需要付费权限访问此背景")
    
    # 增加使用次数
    background.usage_count += 1
    db.commit()
    
    return background

# 初始化默认背景数据
def init_default_backgrounds(db: Session):
    """初始化默认背景数据"""
    default_backgrounds = [
        {
            "name": "简约白",
            "category": "纯色",
            "thumbnail_url": "https://via.placeholder.com/150x80/ffffff/cccccc",
            "image_url": "https://via.placeholder.com/1920x1080/ffffff/ffffff",
            "width": 1920,
            "height": 1080,
            "aspect_ratio": "16:9"
        },
        {
            "name": "时尚灰",
            "category": "纯色",
            "thumbnail_url": "https://via.placeholder.com/150x80/f0f0f0/666666",
            "image_url": "https://via.placeholder.com/1920x1080/f0f0f0/f0f0f0",
            "width": 1920,
            "height": 1080,
            "aspect_ratio": "16:9"
        },
        {
            "name": "清新蓝",
            "category": "纯色",
            "thumbnail_url": "https://via.placeholder.com/150x80/e6f7ff/1890ff",
            "image_url": "https://via.placeholder.com/1920x1080/e6f7ff/e6f7ff",
            "width": 1920,
            "height": 1080,
            "aspect_ratio": "16:9"
        },
        {
            "name": "自然木纹",
            "category": "纹理",
            "thumbnail_url": "https://via.placeholder.com/150x80/8b4513/654321",
            "image_url": "https://via.placeholder.com/1920x1080/8b4513/8b4513",
            "width": 1920,
            "height": 1080,
            "aspect_ratio": "16:9"
        },
        {
            "name": "浅灰渐变",
            "category": "渐变",
            "thumbnail_url": "https://via.placeholder.com/150x80/e8e8e8/a0a0a0",
            "image_url": "https://via.placeholder.com/1920x1080/e8e8e8/e8e8e8",
            "width": 1920,
            "height": 1080,
            "aspect_ratio": "16:9"
        }
    ]
    
    # 检查并插入默认背景
    for bg_data in default_backgrounds:
        existing = db.query(Background).filter(Background.name == bg_data["name"]).first()
        if not existing:
            background = Background(**bg_data)
            db.add(background)
    
    db.commit()
    print("默认背景数据初始化完成")

# 确保在应用启动时初始化默认背景
from app.database import SessionLocal
with SessionLocal() as db:
    init_default_backgrounds(db)
