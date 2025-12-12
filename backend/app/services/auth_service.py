from datetime import datetime, timedelta
from typing import Tuple, Optional
from jose import jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session
from app.models.user import User, UserRole
from app.core.config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

class AuthService:
    """Authentication service"""
    
    def verify_password(self, plain_password: str, hashed_password: str) -> bool:
        """Verify password"""
        return pwd_context.verify(plain_password, hashed_password)
    
    def get_password_hash(self, password: str) -> str:
        """Get password hash"""
        return pwd_context.hash(password)
    
    def create_access_token(self, data: dict, expires_delta: Optional[timedelta] = None) -> str:
        """Create access token"""
        to_encode = data.copy()
        if expires_delta:
            expire = datetime.utcnow() + expires_delta
        else:
            expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        to_encode.update({"exp": expire})
        encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
        return encoded_jwt
    
    def get_user_by_phone(self, db: Session, phone: str) -> Optional[User]:
        """Get user by phone number"""
        return db.query(User).filter(User.phone == phone).first()
    
    def get_user_by_wechat_openid(self, db: Session, openid: str) -> Optional[User]:
        """Get user by WeChat openid"""
        return db.query(User).filter(User.wechat_openid == openid).first()
    
    def login_by_phone(self, db: Session, phone: str, code: str, password: Optional[str] = None) -> Tuple[User, str]:
        """Login by phone number and verification code"""
        # In production, we should verify the code from SMS service
        if code != "123456":  # Dummy code for testing
            raise ValueError("Invalid verification code")
        
        user = self.get_user_by_phone(db, phone)
        
        if user:
            # Existing user login
            if password and not self.verify_password(password, user.password_hash):
                raise ValueError("Invalid password")
        else:
            # New user registration
            if not password:
                raise ValueError("Password is required for new user")
            
            user = User(
                phone=phone,
                nickname=f"user_{phone[-4:]}",
                password_hash=self.get_password_hash(password),
                role=UserRole.USER
            )
            db.add(user)
            db.commit()
            db.refresh(user)
        
        # Create access token
        access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = self.create_access_token(
            data={"sub": str(user.id)},
            expires_delta=access_token_expires
        )
        
        return user, access_token
    
    def login_by_wechat(self, db: Session, code: str) -> Tuple[User, str]:
        """Login by WeChat code"""
        # In production, we should call WeChat API to get openid
        # For testing, we'll use a dummy openid
        dummy_openid = f"wx_openid_{code[:10]}"
        dummy_nickname = f"wechat_user_{code[:5]}"
        
        user = self.get_user_by_wechat_openid(db, dummy_openid)
        
        if not user:
            user = User(
                wechat_openid=dummy_openid,
                nickname=dummy_nickname,
                role=UserRole.USER
            )
            db.add(user)
            db.commit()
            db.refresh(user)
        
        # Create access token
        access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = self.create_access_token(
            data={"sub": str(user.id)},
            expires_delta=access_token_expires
        )
        
        return user, access_token