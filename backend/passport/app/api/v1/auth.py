from fastapi import APIRouter, Depends, Body, Request
from sqlalchemy.orm import Session
from backend.passport.app.db.session import get_db
from backend.passport.app.schemas.common import Response
from backend.passport.app.schemas.user import UserCreate, UserLogin, UserResponse, Token, WeChatLogin
from backend.passport.app.services.sms_service import sms_service
from backend.passport.app.services.auth_service import auth_service
from backend.passport.app.services.captcha_service import captcha_service
from backend.passport.app.services.wechat_service import wechat_service
from backend.passport.app.api.deps import get_current_user, oauth2_scheme
from backend.passport.app.models.user import User
from backend.passport.app.core.exceptions import AuthenticationError

router = APIRouter()

@router.post("/sms/send", response_model=Response)
async def send_sms_code(phone: str = Body(..., embed=True)):
    code = await sms_service.send_code(phone)
    # In dev mode, return code. In prod, don't.
    return Response(data={"expire": 600, "debug_code": code})

@router.get("/captcha", response_model=Response)
async def get_captcha():
    data = await captcha_service.create_captcha()
    return Response(data=data)

@router.post("/register/phone", response_model=Response[UserResponse])
async def register_by_phone(
    user_in: UserCreate,
    db: Session = Depends(get_db)
):
    user = await auth_service.register_by_phone(db, user_in)
    return Response(data=user)

@router.post("/login/phone", response_model=Response[Token])
async def login_phone(
    request: Request,
    data: UserLogin,
    db: Session = Depends(get_db)
):
    ip = request.client.host
    ua = request.headers.get("user-agent")
    token_data = await auth_service.login_by_phone(db, data.phone, data.code, data.password, ip=ip, ua=ua)
    return Response(data=token_data)

@router.get("/login/wechat/url", response_model=Response)
async def get_wechat_login_url(redirect_uri: str, state: str = "STATE"):
    url = wechat_service.get_pc_login_url(redirect_uri, state)
    return Response(data={"url": url})

@router.post("/login/wechat", response_model=Response[Token])
async def login_by_wechat(
    request: Request,
    login_in: WeChatLogin,
    db: Session = Depends(get_db)
):
    ip = request.client.host
    ua = request.headers.get("user-agent")
    token_data = await auth_service.login_by_wechat(db, login_in.code, ip=ip, ua=ua)
    return Response(data=token_data)

@router.get("/login/wechat/status", response_model=Response)
async def check_wechat_login_status(
    state: str = "STATE"
):
    """
    Check WeChat login status (polling endpoint)
    """
    # In a real implementation, you would check the status based on state
    # For now, return a mock status
    return Response(data={"status": "pending"})

@router.get("/login/wechat/callback", response_model=Response[Token])
async def wechat_login_callback(
    request: Request,
    code: str,
    state: str,
    db: Session = Depends(get_db)
):
    """
    WeChat login callback endpoint
    """
    ip = request.client.host
    ua = request.headers.get("user-agent")
    token_data = await auth_service.login_by_wechat(db, code, ip=ip, ua=ua)
    return Response(data=token_data)

@router.post("/refresh", response_model=Response[Token])
async def refresh_token(
    refresh_token: str = Body(..., embed=True),
    db: Session = Depends(get_db)
):
    token_data = await auth_service.refresh_token(db, refresh_token)
    return Response(data=token_data)

@router.post("/logout", response_model=Response)
async def logout(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
):
    await auth_service.logout(db, token)
    return Response(message="Logged out successfully")
