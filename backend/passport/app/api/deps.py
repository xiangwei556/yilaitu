from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
from sqlalchemy.orm import Session
from backend.passport.app.core.config import settings
from backend.passport.app.db.session import get_db
from backend.passport.app.db.redis import get_redis
from backend.passport.app.models.user import User

oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"{settings.API_V1_STR}/auth/login/phone")

async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        # Check Blacklist
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        jti = payload.get("jti")
        if jti:
            try:
                redis = await get_redis()
                is_blacklisted = await redis.get(f"blacklist:{jti}")
                if is_blacklisted:
                    raise credentials_exception
            except Exception:
                # Redis连接失败，忽略黑名单检查
                pass
        
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
        
    user = db.get(User, int(user_id))
    if user is None:
        raise credentials_exception
        
    if user.status != 1:
        raise HTTPException(status_code=400, detail="Inactive user")
        
    return user
