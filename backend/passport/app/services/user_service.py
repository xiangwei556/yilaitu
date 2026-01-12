from sqlalchemy.orm import Session
from sqlalchemy import select, desc
from backend.passport.app.models.user import User
from backend.passport.app.models.login_session import LoginSession
from backend.passport.app.models.operation_log import OperationLog
from backend.passport.app.schemas.operation_log import OperationLogResponse
from backend.passport.app.schemas.user import UserUpdate
from backend.passport.app.core.config import settings
from backend.passport.app.db.redis import get_redis
from backend.passport.app.core.exceptions import NotFoundError

from backend.passport.app.services.log_service import log_service

class UserService:
    @staticmethod
    async def update_profile(db: Session, user_id: int, user_in: UserUpdate, ip: str = None, ua: str = None) -> User:
        user = db.execute(select(User).where(User.id == user_id, User.status != -1)).scalar_one_or_none()
        if not user:
            raise NotFoundError("User not found")
        
        # Pydantic v2
        update_data = user_in.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(user, field, value)
            
        db.add(user)
        db.commit()
        db.refresh(user)
        
        # Log operation
        log_service.create_log(
            db, user_id, "update_profile", "success", 
            ip=ip, device_fingerprint=ua, detail=str(update_data)
        )
        
        return user

    @staticmethod
    async def get_active_sessions(db: Session, user_id: int) -> list[LoginSession]:
        stmt = select(LoginSession).where(
            LoginSession.user_id == user_id,
            LoginSession.is_active == True
        ).order_by(desc(LoginSession.created_at))
        result = db.execute(stmt).scalars().all()
        return result

    @staticmethod
    async def revoke_session(db: Session, user_id: int, session_id: int, ip: str = None, ua: str = None) -> None:
        stmt = select(LoginSession).where(
            LoginSession.id == session_id,
            LoginSession.user_id == user_id
        )
        session = db.execute(stmt).scalar_one_or_none()
        
        if not session:
            raise NotFoundError("Session not found")
            
        if not session.is_active:
            return

        # Blacklist JTI if available
        if session.access_token_jti:
            redis = await get_redis()
            # Default expiration for blacklist
            await redis.set(f"blacklist:{session.access_token_jti}", "1", ex=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60)

        session.is_active = False
        db.commit()
        
        log_service.create_log(
            db, user_id, "revoke_session", "success",
            ip=ip, device_fingerprint=ua, detail=f"Revoked Session ID: {session_id}"
        )

    @staticmethod
    async def get_operation_logs(db: Session, user_id: int, limit: int = 20) -> list[OperationLogResponse]:
        stmt = select(OperationLog).where(
            OperationLog.user_id == user_id
        ).order_by(desc(OperationLog.created_at)).limit(limit)
        result = db.execute(stmt).scalars().all()
        # Convert SQLAlchemy OperationLog objects to Pydantic OperationLogResponse models
        return [OperationLogResponse.model_validate(log) for log in result]

user_service = UserService()
