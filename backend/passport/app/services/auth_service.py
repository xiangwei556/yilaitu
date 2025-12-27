from sqlalchemy.orm import Session
from sqlalchemy import select
from backend.passport.app.models.user import User
from backend.passport.app.models.credential import UserCredential
from backend.passport.app.models.login_session import LoginSession
from backend.points.models.points import PointsAccount
from backend.passport.app.schemas.user import UserCreate
from backend.passport.app.core.security import get_password_hash, verify_password, create_access_token
from backend.passport.app.core.exceptions import ValidationError, AuthenticationError, NotFoundError
from backend.passport.app.core.config import settings
from backend.passport.app.services.sms_service import sms_service
from backend.passport.app.services.wechat_service import wechat_service
from backend.passport.app.services.log_service import log_service
from backend.passport.app.db.redis import get_redis
import uuid
import random
from datetime import datetime, timedelta
from jose import jwt

class AuthService:
    
    @staticmethod
    async def _create_token_pair(db: Session, user_id: int, device_id: str = None) -> dict:
        jti = uuid.uuid4().hex
        access_token = create_access_token(data={"sub": str(user_id), "jti": jti})
        refresh_token = uuid.uuid4().hex
        
        expires_at = datetime.utcnow() + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
        
        session = LoginSession(
            user_id=user_id,
            access_token_jti=jti,
            refresh_token=refresh_token,
            expires_at=expires_at,
            device_id=device_id,
            is_active=True
        )
        db.add(session)
        db.commit()
        
        return {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_type": "bearer",
            "expires_in": settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
        }

    @staticmethod
    async def register_by_phone(db: Session, user_in: UserCreate) -> User:
        # Verify SMS code
        if not await sms_service.verify_code(user_in.phone, user_in.code):
            raise ValidationError("Invalid or expired verification code")
            
        # Check if phone already exists
        stmt = select(UserCredential).where(
            UserCredential.identifier == user_in.phone,
            UserCredential.credential_type == "phone"
        )
        existing_credential = db.execute(stmt).scalar_one_or_none()
        
        if existing_credential:
            raise ValidationError("Phone number already registered")
            
        try:
            # Create User
            username = f"u_{uuid.uuid4().hex[:8]}"
            nickname = f"User_{random.randint(1000, 9999)}"
            
            db_user = User(
                username=username,
                nickname=user_in.nickname or nickname,
                avatar=user_in.avatar,
                gender=user_in.gender,
                hashed_password=get_password_hash(user_in.password) if user_in.password else None
            )
            db.add(db_user)
            db.flush() # Get ID
            
            # Create Credential
            credential = UserCredential(
                user_id=db_user.id,
                identifier=user_in.phone,
                credential_type="phone",
                verified=True
            )
            db.add(credential)
            
            db.commit()
            db.refresh(db_user)
            return db_user
        except Exception as e:
            # Rollback the transaction in case of any error
            db.rollback()
            # Reraise the exception to propagate the error
            raise ValidationError(f"Registration failed: {str(e)}")

    @classmethod
    async def login_by_phone(cls, db: Session, phone: str, code: str = None, password: str = None, ip: str = None, ua: str = None) -> dict:
        # Find user by phone
        stmt = select(UserCredential).where(
            UserCredential.identifier == phone,
            UserCredential.credential_type == "phone"
        )
        credential = db.execute(stmt).scalar_one_or_none()
        
        user = None
        if credential:
            user = db.get(User, credential.user_id)
        
        # If user doesn't exist and using universal code, create a new user
        if not user and code and code == "5567":
            # Create new user for universal code
            username = f"u_{uuid.uuid4().hex[:8]}"
            nickname = f"User_{random.randint(1000, 9999)}"
            
            db_user = User(
                username=username,
                nickname=nickname,
                avatar=None,
                gender=0,
                hashed_password=None
            )
            db.add(db_user)
            db.flush() # Get ID
            
            # Create Credential
            credential = UserCredential(
                user_id=db_user.id,
                identifier=phone,
                credential_type="phone",
                verified=True
            )
            db.add(credential)
            
            db.commit()
            db.refresh(db_user)
            user = db_user
        elif not user or user.status != 1:
            raise AuthenticationError("User is disabled or does not exist")

        if code:
            if not await sms_service.verify_code(phone, code):
                raise AuthenticationError("Invalid verification code")
        elif password:
            if not user.hashed_password:
                raise AuthenticationError("Password not set for this user")
            if not verify_password(password, user.hashed_password):
                raise AuthenticationError("Invalid password")
        else:
            raise ValidationError("Either code or password is required")
            
        log_service.create_log(db, user.id, "login", "success", ip=ip, device_fingerprint=ua, detail="Login by phone")
        token_data = await cls._create_token_pair(db, user.id)
        
        # Get user points account
        points_account = db.query(PointsAccount).filter(PointsAccount.user_id == user.id).first()
        total_points = 0
        if points_account:
            total_points = float(points_account.balance_permanent) + float(points_account.balance_limited)
        
        # Add user information to the response
        token_data["user"] = {
            "id": user.id,
            "username": user.username,
            "phone": phone,
            "role": user.role,
            "status": user.status,
            "points": total_points
        }
        
        return token_data

    @classmethod
    async def login_by_wechat(cls, db: Session, code: str, ip: str = None, ua: str = None) -> dict:
        # 1. Get Token
        wx_token = await wechat_service.get_access_token(code)
        openid = wx_token.get("openid")
        unionid = wx_token.get("unionid")
        
        if not openid:
            raise AuthenticationError("Failed to retrieve OpenID from WeChat")

        # 2. Check DB
        stmt = select(UserCredential).where(
            UserCredential.identifier == openid,
            UserCredential.credential_type == "wechat_openid"
        )
        credential = db.execute(stmt).scalar_one_or_none()
        
        if not credential and unionid:
             stmt = select(UserCredential).where(
                UserCredential.identifier == unionid,
                UserCredential.credential_type == "wechat_unionid"
            )
             credential = db.execute(stmt).scalar_one_or_none()
             
        user = None
        if credential:
            user = db.get(User, credential.user_id)
        
        if not user:
            # Auto Register
            wx_info = await wechat_service.get_user_info(wx_token["access_token"], openid)
            
            username = f"wx_{uuid.uuid4().hex[:8]}"
            user = User(
                username=username,
                nickname=wx_info.get("nickname", "WeChat User"),
                avatar=wx_info.get("headimgurl"),
                gender=wx_info.get("sex", 0),
                status=1
            )
            db.add(user)
            db.flush()
            
            # Add Credentials
            creds = [
                UserCredential(user_id=user.id, identifier=openid, credential_type="wechat_openid", verified=True)
            ]
            if unionid:
                creds.append(UserCredential(user_id=user.id, identifier=unionid, credential_type="wechat_unionid", verified=True))
            
            db.add_all(creds)
            db.commit()
            db.refresh(user)
            log_service.create_log(db, user.id, "register", "success", ip=ip, device_fingerprint=ua, detail="Register by WeChat")
            
        log_service.create_log(db, user.id, "login", "success", ip=ip, device_fingerprint=ua, detail="Login by WeChat")
        return await cls._create_token_pair(db, user.id)

    @classmethod
    async def logout(cls, db: Session, token: str) -> None:
        try:
            payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
            jti = payload.get("jti")
            if jti:
                # Blacklist in Redis
                redis = await get_redis()
                await redis.set(f"blacklist:{jti}", "1", ex=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60)
                
                # Deactivate session
                stmt = select(LoginSession).where(LoginSession.access_token_jti == jti)
                session = db.execute(stmt).scalar_one_or_none()
                if session:
                    session.is_active = False
                    db.commit()
        except Exception:
            pass 

    @classmethod
    async def refresh_token(cls, db: Session, refresh_token: str) -> dict:
        stmt = select(LoginSession).where(
            LoginSession.refresh_token == refresh_token,
            LoginSession.is_active == True,
            LoginSession.expires_at > datetime.utcnow()
        )
        session = db.execute(stmt).scalar_one_or_none()
        
        if not session:
            raise AuthenticationError("Invalid or expired refresh token")
            
        # Invalidate old session
        session.is_active = False
        
        # Create new session
        return await cls._create_token_pair(db, session.user_id, session.device_id)

auth_service = AuthService()
