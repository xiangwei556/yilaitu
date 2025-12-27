from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List, Optional
from decimal import Decimal

from backend.passport.app.api.deps import get_db, get_current_user
from backend.passport.app.models.user import User
from backend.original_image_record.models.original_image_record import OriginalImageRecord
from backend.original_image_record.schemas.original_image_record import (
    OriginalImageRecordCreate,
    OriginalImageRecordUpdate,
    OriginalImageRecordResponse
)
from backend.original_image_record.services.original_image_record_service import OriginalImageRecordService
from backend.points.services.points_service import PointsService
from backend.notification.services.websocket_manager import manager
from backend.passport.app.db.redis import get_redis
import asyncio
import json

router = APIRouter()


async def send_points_update_via_redis(user_id: int, points: float):
    """
    通过 Redis Pub/Sub 发送积分更新通知
    
    Args:
        user_id: 用户ID
        points: 更新后的积分数量
    """
    try:
        redis = await get_redis()
        payload = {
            "type": "points_update",
            "user_id": user_id,
            "points": points,
            "timestamp": asyncio.get_event_loop().time()
        }
        await redis.publish("notification_channel", json.dumps(payload))
        print(f"Points update sent via Redis: user_id={user_id}, points={points}")
    except Exception as e:
        print(f"Failed to publish points update to Redis: {e}")


@router.post("/original_image_record", response_model=OriginalImageRecordResponse)
def create_original_image_record(
    background_tasks: BackgroundTasks,
    model_id: Optional[int] = None,
    model_name: Optional[str] = None,
    params: Optional[dict] = None,
    cost_integral: Decimal = Query(Decimal("0"), ge=Decimal("0"), description="消耗积分数量"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    创建一个新的生图记录
    同时调用积分扣除服务，记录用户购买积分
    
    需要用户登录态
    """
    try:
        record = OriginalImageRecordService.create_record(
            db=db,
            user_id=current_user.id,
            model_id=model_id,
            model_name=model_name,
            params=params,
            cost_integral=cost_integral
        )
        
        # 发送积分更新通知到前端（通过 Redis Pub/Sub）
        if cost_integral > 0:
            account = PointsService.get_user_points(db, current_user.id)
            if account:
                total_points = float(account.balance_permanent) + float(account.balance_limited)
                background_tasks.add_task(send_points_update_via_redis, current_user.id, total_points)
        
        return record
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"创建生图记录失败: {str(e)}")


@router.get("/original_image_record/{record_id}", response_model=OriginalImageRecordResponse)
def get_original_image_record(
    record_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    根据ID获取一个生图记录
    
    需要用户登录态
    只能获取自己的生图记录
    """
    record = OriginalImageRecordService.get_record_by_id(db, record_id)
    
    if not record:
        raise HTTPException(status_code=404, detail="生图记录不存在")
    
    if record.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="无权访问该生图记录")
    
    return record


@router.get("/original_image_record/user/{user_id}", response_model=List[OriginalImageRecordResponse])
def get_original_image_records_by_user(
    user_id: int,
    skip: int = Query(0, ge=0, description="跳过记录数"),
    limit: int = Query(100, ge=1, le=1000, description="返回记录数"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    根据用户ID获取所有生图记录
    
    需要用户登录态
    只能获取自己的生图记录
    """
    if user_id != current_user.id:
        raise HTTPException(status_code=403, detail="无权访问其他用户的生图记录")
    
    records = OriginalImageRecordService.get_records_by_user_id(db, user_id, skip, limit)
    return records


@router.put("/original_image_record/{record_id}", response_model=OriginalImageRecordResponse)
def update_original_image_record(
    record_id: int,
    update_data: OriginalImageRecordUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    更新一个生图记录
    
    需要用户登录态
    只能更新自己的生图记录
    """
    record = OriginalImageRecordService.get_record_by_id(db, record_id)
    
    if not record:
        raise HTTPException(status_code=404, detail="生图记录不存在")
    
    if record.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="无权更新该生图记录")
    
    updated_record = OriginalImageRecordService.update_record(db, record_id, update_data)
    
    if not updated_record:
        raise HTTPException(status_code=500, detail="更新生图记录失败")
    
    return updated_record


@router.delete("/original_image_record/{record_id}")
def delete_original_image_record(
    record_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    删除一个生图记录
    
    需要用户登录态
    只能删除自己的生图记录
    """
    record = OriginalImageRecordService.get_record_by_id(db, record_id)
    
    if not record:
        raise HTTPException(status_code=404, detail="生图记录不存在")
    
    if record.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="无权删除该生图记录")
    
    success = OriginalImageRecordService.delete_record(db, record_id)
    
    if not success:
        raise HTTPException(status_code=500, detail="删除生图记录失败")
    
    return {"message": "删除成功"}
