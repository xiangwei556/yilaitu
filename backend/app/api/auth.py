from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import timedelta
from pydantic import BaseModel
from app.database import get_db
from app.models.user import User
from app.schemas.user import UserCreate, UserResponse, Token
from app.utils.auth_utils import (
    create_access_token,
    ACCESS_TOKEN_EXPIRE_MINUTES,
    get_current_active_user
)

router = APIRouter()

# 定义手机号验证码登录请求模型
class PhoneLoginRequest(BaseModel):
    phone: str
    code: str

@router.post("/login", response_model=Token)
async def login(login_data: PhoneLoginRequest, db: Session = Depends(get_db)):
    # 检查验证码是否正确（万能验证码5567）
    if login_data.code != "5567":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="验证码无效",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # 查找用户，使用手机号作为用户名
    user = db.query(User).filter(User.username == login_data.phone).first()
    
    # 如果用户不存在，自动注册
    if not user:
        user = User(
            username=login_data.phone,
            is_active=True
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    
    # 检查用户是否激活
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="用户账户已被禁用"
        )
    
    # 创建访问令牌
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username}, expires_delta=access_token_expires
    )
    
    # 返回令牌
    return {
        "access_token": access_token,
        "token_type": "bearer"
    }

@router.post("/register", response_model=UserResponse)
async def register(user_create: UserCreate, db: Session = Depends(get_db)):
    # 检查用户名是否已存在
    db_user = db.query(User).filter(User.username == user_create.username).first()
    if db_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="用户名已被注册"
        )
    
    # 检查邮箱是否已存在
    if hasattr(user_create, 'email') and user_create.email:
        db_user = db.query(User).filter(User.email == user_create.email).first()
        if db_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="邮箱已被注册"
            )
    
    # 创建新用户
    hashed_password = get_password_hash(user_create.password)
    db_user = User(
        username=user_create.username,
        email=getattr(user_create, 'email', None),
        hashed_password=hashed_password,
        is_active=True
    )
    
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    
    return db_user

@router.get("/me", response_model=UserResponse)
async def get_current_user_info(current_user: User = Depends(get_current_active_user)):
    """获取当前用户信息"""
    return current_user

@router.post("/logout")
async def logout(current_user: User = Depends(get_current_active_user)):
    """登出功能（在客户端删除token即可）"""
    return {"message": "成功登出"}
