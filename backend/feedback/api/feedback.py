from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from typing import Optional
import json
from backend.passport.app.api.deps import get_db, get_current_user
from backend.passport.app.models.user import User
from backend.feedback.schemas.feedback import (
    FeedbackCreate,
    FeedbackUpdate,
    FeedbackResponse,
    FeedbackListResponse,
    FeedbackDetailResponse
)
from backend.feedback.services.feedback_service import FeedbackService
from backend.feedback.schemas.feedback import FeedbackType
from backend.points.services.points_service import PointsService, send_points_update_via_redis
from backend.notification.schemas.message import MessageCreate
from backend.notification.services.notification_service import NotificationService

router = APIRouter()


@router.post("/feedback", response_model=FeedbackResponse)
def create_feedback(
    feedback_data: FeedbackCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    service = FeedbackService(db)
    feedback = service.create_feedback(feedback_data)
    
    response_dict = {
        "id": feedback.id,
        "user_id": feedback.user_id,
        "feedback_type": feedback.feedback_type,
        "feedback_type_name": FeedbackType.get_name(feedback.feedback_type),
        "content": feedback.content,
        "create_time": feedback.create_time,
        "reply_content": feedback.reply_content,
        "reply_time": feedback.reply_time,
        "original_image_record_id": feedback.original_image_record_id,
        "model_id": feedback.model_id,
        "status": feedback.status,
        "points_transactions_id": feedback.points_transactions_id,
        "created_at": feedback.created_at,
        "updated_at": feedback.updated_at
    }
    
    return response_dict


@router.get("/feedback/{feedback_id}", response_model=FeedbackDetailResponse)
def get_feedback(
    feedback_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    service = FeedbackService(db)
    detail = service.get_feedback_detail(feedback_id)
    
    if not detail:
        raise HTTPException(status_code=404, detail="反馈记录不存在")
    
    return detail


@router.get("/admin/feedback", response_model=FeedbackListResponse)
def list_feedback_admin(
    page: int = 1,
    page_size: int = 20,
    status: Optional[str] = None,
    user_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role not in ["admin", "super_admin", "growth-hacker"]:
        raise HTTPException(status_code=403, detail="未授权")
    
    service = FeedbackService(db)
    feedback_list, total = service.get_feedback_list(page, page_size, status, user_id)
    
    items = []
    for feedback in feedback_list:
        item_dict = {
            "id": feedback.id,
            "user_id": feedback.user_id,
            "feedback_type": feedback.feedback_type,
            "feedback_type_name": FeedbackType.get_name(feedback.feedback_type),
            "content": feedback.content,
            "create_time": feedback.create_time,
            "reply_content": feedback.reply_content,
            "reply_time": feedback.reply_time,
            "original_image_record_id": feedback.original_image_record_id,
            "model_id": feedback.model_id,
            "status": feedback.status,
            "points_transactions_id": feedback.points_transactions_id,
            "created_at": feedback.created_at,
            "updated_at": feedback.updated_at
        }
        items.append(item_dict)
    
    return {
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size
    }


@router.get("/admin/feedback/{feedback_id}", response_model=FeedbackDetailResponse)
def get_feedback_admin(
    feedback_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role not in ["admin", "super_admin", "growth-hacker"]:
        raise HTTPException(status_code=403, detail="未授权")
    
    service = FeedbackService(db)
    detail = service.get_feedback_detail(feedback_id)
    
    if not detail:
        raise HTTPException(status_code=404, detail="反馈记录不存在")
    
    return detail


@router.put("/admin/feedback/{feedback_id}", response_model=FeedbackResponse)
async def update_feedback_admin(
    feedback_id: int,
    update_data: FeedbackUpdate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role not in ["admin", "super_admin", "growth-hacker"]:
        raise HTTPException(status_code=403, detail="未授权")
    
    service = FeedbackService(db)
    
    try:
        feedback = service.update_feedback(feedback_id, update_data, current_user.id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    
    if not feedback:
        raise HTTPException(status_code=404, detail="反馈记录不存在")
    
   
    
    # 发送积分更新通知到前端（通过 Redis Pub/Sub）
    # 只在状态改为"已处理已返还积分"（status=1）且有返还积分时发送
    if update_data.status == 1 and update_data.refund_points and update_data.refund_points > 0:
        account = PointsService.get_user_points(db, feedback.user_id)
        if account:
            total_points = float(account.balance_permanent) + float(account.balance_limited)
            await send_points_update_via_redis(feedback.user_id, total_points)
    
    # 发送消息到消息中心（只在状态改为"已处理已返还积分"时发送）
    if update_data.status == 1:
        try:
            message_content = f"您的反馈已处理完成"
            if update_data.reply_content:
                message_content += f"，回复内容：{update_data.reply_content}"
            if update_data.refund_points and update_data.refund_points > 0:
                message_content += f"，已返还 {update_data.refund_points} 积分"
            
            message_data = MessageCreate(
                title=f"反馈处理完成：反馈 #{feedback_id}",
                content=message_content,
                type="feedback",
                receiver_id=feedback.user_id,
                extra_data=json.dumps({
                    "feedback_id": feedback_id,
                    "feedback_type": feedback.feedback_type,
                    "refund_points": update_data.refund_points if update_data.refund_points else 0
                })
            )
            
            await NotificationService.send_message(db, message_data)
        except Exception as msg_error:
            print(f"[WARNING] 发送反馈处理消息失败: {str(msg_error)}")
            import traceback
            traceback.print_exc()
    
    response_dict = {
        "id": feedback.id,
        "user_id": feedback.user_id,
        "feedback_type": feedback.feedback_type,
        "feedback_type_name": FeedbackType.get_name(feedback.feedback_type),
        "content": feedback.content,
        "create_time": feedback.create_time,
        "reply_content": feedback.reply_content,
        "reply_time": feedback.reply_time,
        "original_image_record_id": feedback.original_image_record_id,
        "model_id": feedback.model_id,
        "status": feedback.status,
        "points_transactions_id": feedback.points_transactions_id,
        "created_at": feedback.created_at,
        "updated_at": feedback.updated_at
    }
    
    return response_dict
