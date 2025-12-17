from typing import Optional
from datetime import datetime
from pydantic import BaseModel, Field, validator
import re

class UserBase(BaseModel):
    username: Optional[str] = None
    nickname: Optional[str] = None
    avatar: Optional[str] = None
    gender: int = 0

class UserCreate(UserBase):
    phone: str = Field(..., description="手机号")
    password: Optional[str] = None
    code: str = Field(..., description="验证码")

    @validator('phone')
    def validate_phone(cls, v):
        if not re.match(r"^1[3-9]\d{9}$", v):
            raise ValueError('Invalid phone number format')
        return v

class UserLogin(BaseModel):
    phone: str
    code: Optional[str] = None
    password: Optional[str] = None
    
    @validator('phone')
    def validate_phone(cls, v):
        # Relax validation to allow non-numeric identifiers (e.g., admin)
        # Keep basic non-empty check
        if v is None or not str(v).strip():
            raise ValueError('Invalid identifier')
        return v

class WeChatLogin(BaseModel):
    code: str
    state: Optional[str] = None

class UserUpdate(BaseModel):
    nickname: Optional[str] = None
    avatar: Optional[str] = None
    gender: Optional[int] = None
    
    @validator('gender')
    def validate_gender(cls, v):
        if v is not None and v not in [0, 1, 2]:
            raise ValueError('Invalid gender value (0: Unknown, 1: Male, 2: Female)')
        return v

class SessionResponse(BaseModel):
    id: int
    device_id: Optional[str] = None
    device_type: Optional[str] = None
    ip: Optional[str] = None
    is_current: bool = False
    created_at: Optional[datetime] = None
    last_active: Optional[datetime] = None

class UserResponse(UserBase):
    id: int
    status: int
    role: str
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int
    user: Optional[dict] = None
