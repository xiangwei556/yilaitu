from fastapi import APIRouter, Depends, HTTPException, Query, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session
from sqlalchemy import desc
from typing import List, Optional

from backend.passport.app.api.deps import get_db, get_current_user
from backend.passport.app.models.user import User
from backend.notification.schemas.message import Message as MessageSchema, MessageList, MessageCreate, UnreadCount
from backend.notification.models.message import Message, UnreadMessageCount
from backend.notification.services.notification_service import NotificationService
from backend.notification.services.websocket_manager import manager

router = APIRouter()

@router.get("/my", response_model=MessageList)
def get_my_messages(
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    status: Optional[str] = None,
    type: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Message).filter(Message.receiver_id == current_user.id)
    
    if status:
        query = query.filter(Message.status == status)
    if type:
        query = query.filter(Message.type == type)
        
    total = query.count()
    items = query.order_by(desc(Message.created_at))\
        .offset((page - 1) * page_size)\
        .limit(page_size)\
        .all()
        
    return {"items": items, "total": total, "page": page, "page_size": page_size}

@router.get("/my/count", response_model=UnreadCount)
def get_unread_count(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    record = db.query(UnreadMessageCount).filter(UnreadMessageCount.user_id == current_user.id).first()
    return {"count": record.count if record else 0}

@router.put("/my/mark-all-read")
def mark_all_read(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    NotificationService.mark_all_as_read(db, current_user.id)
    return {"success": True}

@router.put("/my/{message_id}/read")
def mark_message_read(
    message_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    success = NotificationService.mark_as_read(db, message_id, current_user.id)
    return {"success": success}

@router.put("/my/batch-read")
def mark_batch_read(
    message_ids: List[int],
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    for mid in message_ids:
        NotificationService.mark_as_read(db, mid, current_user.id)
    return {"success": True}

@router.delete("/my/batch-delete")
def delete_batch_messages(
    message_ids: List[int],
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Soft delete or hard delete
    db.query(Message).filter(
        Message.id.in_(message_ids),
        Message.receiver_id == current_user.id
    ).delete(synchronize_session=False)
    
    # Also need to update unread count if deleted messages were unread
    # Simplified: Recalculate unread count
    unread_count = db.query(Message).filter(
        Message.receiver_id == current_user.id,
        Message.status == 'unread'
    ).count()
    
    unread_record = db.query(UnreadMessageCount).filter(UnreadMessageCount.user_id == current_user.id).first()
    if unread_record:
        unread_record.count = unread_count
        
    db.commit()
    return {"success": True}

@router.post("/send", response_model=MessageSchema)
async def send_message(
    message: MessageCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Only allow admin or system to send arbitary messages
    # For user-to-user, you might want to add checks
    message.sender_id = current_user.id
    return await NotificationService.send_message(db, message)

@router.websocket("/ws/{user_id}")
async def websocket_endpoint(websocket: WebSocket, user_id: int):
    # Note: In production, validate token in query param or headers
    await manager.connect(websocket, user_id)
    try:
        while True:
            data = await websocket.receive_text()
            
            # Handle heartbeat ping/pong
            if data == 'ping':
                await websocket.send_text('pong')
                continue
    except WebSocketDisconnect:
        manager.disconnect(websocket, user_id)
    except Exception as e:
        print(f"WebSocket error for user {user_id}: {e}")
        manager.disconnect(websocket, user_id)
