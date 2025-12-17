from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session
from typing import List

from backend.passport.app.db.session import get_db
from backend.passport.app.api.deps import get_current_user, oauth2_scheme
from backend.passport.app.models.user import User
from backend.passport.app.schemas.user import UserUpdate, UserResponse, SessionResponse
from backend.passport.app.services.user_service import user_service
from backend.passport.app.services.wechat_service import wechat_service
from backend.passport.app.schemas.common import Response
from backend.passport.app.core.config import settings
from jose import jwt

router = APIRouter()

@router.get("/me", response_model=Response[UserResponse])
async def read_users_me(
    current_user: User = Depends(get_current_user)
):
    """
    Get current user profile
    """
    return Response(data=current_user)

@router.patch("/me", response_model=Response[UserResponse])
async def update_user_profile(
    user_in: UserUpdate,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Update current user profile (nickname, avatar, gender)
    """
    ip = request.client.host
    ua = request.headers.get("user-agent")
    user = await user_service.update_profile(db, current_user.id, user_in, ip=ip, ua=ua)
    return Response(data=user)

@router.get("/me/sessions", response_model=Response[List[SessionResponse]])
async def get_user_sessions(
    current_user: User = Depends(get_current_user),
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
):
    """
    Get active login sessions
    """
    # Get current JTI
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        current_jti = payload.get("jti")
    except:
        current_jti = None

    sessions = await user_service.get_active_sessions(db, current_user.id)
    # Map fields if needed (e.g. last_ip -> ip)
    # Pydantic might handle it if aliases are set, or we transform here.
    # LoginSession has 'last_ip', SessionResponse has 'ip'.
    result = []
    for s in sessions:
        result.append(SessionResponse(
            id=s.id,
            device_id=s.device_id,
            device_type=s.device_type,
            ip=s.last_ip,
            is_current=(s.access_token_jti == current_jti),
            created_at=str(s.created_at) if s.created_at else None,
            last_active=None # Not tracked in LoginSession yet
        ))
    return Response(data=result)

@router.delete("/me/sessions/{session_id}", response_model=Response)
async def revoke_user_session(
    session_id: int,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Revoke a specific session (Force Logout)
    """
    ip = request.client.host
    ua = request.headers.get("user-agent")
    await user_service.revoke_session(db, current_user.id, session_id, ip=ip, ua=ua)
    return Response(message="Session revoked")

@router.get("/bind/wechat/url", response_model=Response)
async def get_wechat_bind_url(
    redirect_uri: str,
    current_user: User = Depends(get_current_user)
):
    """
    Get WeChat bind QR code URL
    """
    # 为绑定操作生成特定的state参数，包含用户ID
    import uuid
    state = f"bind_{current_user.id}_{uuid.uuid4().hex[:8]}"
    url = wechat_service.get_pc_login_url(redirect_uri, state)
    return Response(data={"url": url})

@router.get("/bind/wechat/status", response_model=Response)
async def check_wechat_bind_status(
    state: str,
    current_user: User = Depends(get_current_user)
):
    """
    Check WeChat bind status (polling endpoint)
    """
    # In a real implementation, you would check the status based on state
    # For now, return a mock status
    return Response(data={"status": "pending"})
