from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session
from sqlalchemy import select
from typing import List, Optional
from pydantic import BaseModel
import logging

from backend.passport.app.db.session import get_db
from backend.passport.app.api.deps import get_current_user, oauth2_scheme
from backend.passport.app.models.user import User
from backend.passport.app.models.credential import UserCredential
from backend.passport.app.schemas.user import UserUpdate, UserResponse, SessionResponse
from backend.passport.app.services.user_service import user_service
from backend.passport.app.services.wechat_service import wechat_service
from backend.passport.app.schemas.common import Response
from backend.passport.app.core.config import settings
from backend.passport.app.services.auth_service import auth_service
from jose import jwt

# 配置日志
logger = logging.getLogger(__name__)

router = APIRouter()

class UserProfileResponse(BaseModel):
    id: int
    username: str
    nickname: Optional[str]
    avatar: Optional[str]
    phone: Optional[str] # Masked phone
    full_phone: Optional[str] # Full phone for internal use (verify code)
    wechat_bound: bool

@router.get("/profile", response_model=Response[UserProfileResponse])
async def get_user_profile_data(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get current user profile with binding status
    """
    logger.info(f"=== 开始获取用户资料，用户ID: {current_user.id}, 用户名: {current_user.username} ===")
    
    # 打印当前用户信息
    logger.info(f"当前用户基本信息 - ID: {current_user.id}, 用户名: {current_user.username}, 昵称: {current_user.nickname}, 头像: {current_user.avatar}")
    
    # Check phone binding
    logger.info("开始检查手机号绑定状态...")
    stmt = select(UserCredential).where(
        UserCredential.user_id == current_user.id,
        UserCredential.credential_type == "phone",
        UserCredential.verified == 1  # Ensure verify logic is consistent (True/1)
    )
    phone_cred = db.execute(stmt).scalar_one_or_none()
    
    logger.info(f"手机号绑定查询结果: {phone_cred}")
    if phone_cred:
        logger.info(f"手机号绑定凭证信息 - ID: {phone_cred.id}, 标识符: {phone_cred.identifier}, 类型: {phone_cred.credential_type}, 验证状态: {phone_cred.verified}")
    
    masked_phone = None
    full_phone = None
    if phone_cred and phone_cred.identifier:
        p = phone_cred.identifier
        full_phone = p
        if len(p) == 11:
            masked_phone = f"{p[:3]}****{p[7:]}"
        else:
            masked_phone = p
        logger.info(f"手机号处理结果 - 完整手机号: {full_phone}, 脱敏手机号: {masked_phone}")
    else:
        logger.info("用户未绑定手机号")

    # Check WeChat binding
    logger.info("开始检查微信绑定状态...")
    stmt = select(UserCredential).where(
        UserCredential.user_id == current_user.id,
        UserCredential.credential_type == "wechat_openid"
    )
    wechat_cred = db.execute(stmt).scalar_one_or_none()
    
    logger.info(f"微信绑定查询结果: {wechat_cred}")
    if wechat_cred:
        logger.info(f"微信绑定凭证信息 - ID: {wechat_cred.id}, 标识符: {wechat_cred.identifier}, 类型: {wechat_cred.credential_type}")
    
    wechat_bound = bool(wechat_cred)
    logger.info(f"微信绑定状态: {wechat_bound}")
    
    # 构建响应数据
    response_data = UserProfileResponse(
        id=current_user.id,
        username=current_user.username,
        nickname=current_user.nickname,
        avatar=current_user.avatar,
        phone=masked_phone,
        full_phone=full_phone,
        wechat_bound=wechat_bound
    )
    
    logger.info(f"=== 构建响应数据完成    ===")
    logger.info(f"响应数据 - ID: {response_data.id}, 用户名: {response_data.username}, 昵称: {response_data.nickname}")
    logger.info(f"响应数据 - 头像: {response_data.avatar}, 脱敏手机号: {response_data.phone}, 完整手机号: {response_data.full_phone}")
    logger.info(f"响应数据 - 微信绑定状态: {response_data.wechat_bound}")
    logger.info(f"=== 用户资料获取完成 ===")
    
    return Response(data=response_data)

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

@router.get("/info", response_model=Response)
async def get_user_info(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    获取当前用户最新信息（包括积分）
    用于前端实时刷新用户状态，不依赖缓存
    """
    from backend.points.models.points import PointsAccount

    # 获取用户积分
    points_account = db.query(PointsAccount).filter(
        PointsAccount.user_id == current_user.id
    ).first()

    total_points = 0
    if points_account:
        total_points = float(points_account.balance_permanent) + float(points_account.balance_limited)

    logger.info(f"获取用户信息: user_id={current_user.id}, points={total_points}")

    return Response(data={
        "id": current_user.id,
        "nickname": current_user.nickname,
        "avatar": current_user.avatar,
        "points": total_points
    })


@router.delete("/account", response_model=Response)
async def delete_user_account(
    token: str = Depends(oauth2_scheme),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Delete user account (Soft delete or hard delete)
    For now, let's just set status to -1 (disabled/deleted)
    """
    current_user.status = -1
    # Also logout (invalidate tokens)
    await auth_service.logout(db, token)

    db.commit()
    return Response(message="Account deleted successfully")
