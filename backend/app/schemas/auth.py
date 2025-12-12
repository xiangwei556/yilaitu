from pydantic import BaseModel, Field
from typing import Optional

class LoginPhoneRequest(BaseModel):
    phone: str = Field(..., min_length=11, max_length=11, description="Phone number")
    code: str = Field(..., description="Verification code")
    password: Optional[str] = Field(None, min_length=6, max_length=20, description="Password")

class LoginWechatRequest(BaseModel):
    code: str = Field(..., description="WeChat authorization code")

class UserInfoResponse(BaseModel):
    id: int
    nickname: Optional[str]
    avatar: Optional[str]
    points: int

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserInfoResponse