from pydantic import BaseModel, EmailStr
from datetime import datetime
from typing import Optional

# 用户基础模型
class UserBase(BaseModel):
    username: str
    email: EmailStr

# 用户创建请求模型
class UserCreate(UserBase):
    password: str

# 用户登录请求模型
class UserLogin(BaseModel):
    username: str
    password: str

# 用户响应模型
class UserResponse(UserBase):
    id: int
    is_active: bool
    credits: int
    created_at: datetime
    
    class Config:
        orm_mode = True

# 令牌响应模型
class Token(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse

# 令牌数据模型（用于JWT内部）
class TokenData(BaseModel):
    username: Optional[str] = None
