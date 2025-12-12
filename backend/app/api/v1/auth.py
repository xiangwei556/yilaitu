from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas.auth import LoginPhoneRequest, TokenResponse
from app.services.auth_service import AuthService

router = APIRouter()
auth_service = AuthService()

@router.post("/login/phone", response_model=TokenResponse)
def login_phone(
    request: LoginPhoneRequest = Body(...),
    db: Session = Depends(get_db)
):
    """Login with phone number and verification code"""
    try:
        user, token = auth_service.login_by_phone(db, request.phone, request.code, request.password)
        return TokenResponse(
            access_token=token,
            token_type="bearer",
            user={
                "id": user.id,
                "nickname": user.nickname,
                "avatar": user.avatar,
                "points": 0  # Default points
            }
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail="Internal server error")

@router.get("/login/wechat/url")
def get_wechat_login_url():
    """Get WeChat login URL for web scan"""
    # This is a placeholder implementation
    return {"url": "https://open.weixin.qq.com/connect/qrconnect?appid=APPID&redirect_uri=REDIRECT_URI&response_type=code&scope=snsapi_login&state=STATE#wechat_redirect"}

@router.post("/login/wechat")
def login_wechat(code: str = Body(...), db: Session = Depends(get_db)):
    """Login with WeChat code"""
    try:
        user, token = auth_service.login_by_wechat(db, code)
        return TokenResponse(
            access_token=token,
            token_type="bearer",
            user={
                "id": user.id,
                "nickname": user.nickname,
                "avatar": user.avatar,
                "points": 0  # Default points
            }
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail="Internal server error")