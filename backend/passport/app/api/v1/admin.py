from fastapi import APIRouter, Depends, HTTPException, Query, Body
from sqlalchemy.orm import Session
from sqlalchemy import select, func, desc
from typing import List, Optional

from backend.passport.app.db.session import get_db
from backend.passport.app.api.deps import get_current_user
from backend.passport.app.models.user import User
from backend.passport.app.models.operation_log import OperationLog
from backend.passport.app.models.login_session import LoginSession
from backend.passport.app.schemas.user import UserResponse, Token
from backend.passport.app.schemas.operation_log import OperationLogResponse
from backend.passport.app.schemas.common import Response
from backend.passport.app.services.user_service import user_service
from backend.passport.app.services.auth_service import AuthService
from backend.passport.app.core.exceptions import ForbiddenError, AuthenticationError
from backend.passport.app.core.security import verify_password

router = APIRouter()

@router.post("/login")
async def admin_login(
    username: str = Body(..., embed=True),
    password: str = Body(..., embed=True),
    db: Session = Depends(get_db)
):
    """
    Admin login endpoint
    """
    # Find user by username
    stmt = select(User).where(User.username == username)
    user = db.execute(stmt).scalar_one_or_none()
    
    if not user:
        raise AuthenticationError("Invalid username or password")
        
    # Check if user is admin
    if user.role not in ["admin", "super_admin"]:
        raise AuthenticationError("Admin permission required")
        
    # Check password
    if not verify_password(password, user.hashed_password):
        raise AuthenticationError("Invalid username or password")
        
    # Create token pair
    token_data = await AuthService._create_token_pair(db, user.id)
    
    # Build complete response data
    response_data = {
        "access_token": token_data["access_token"],
        "refresh_token": token_data["refresh_token"],
        "token_type": "bearer",
        "expires_in": token_data["expires_in"],
        "user": {
            "id": user.id,
            "username": user.username,
            "role": user.role,
            "status": user.status
        }
    }
    
    return {"code": 0, "msg": "success", "data": response_data}

def check_admin_permission(current_user: User = Depends(get_current_user)):
    if current_user.role not in ["admin", "super_admin"]:
        raise ForbiddenError("Admin permission required")
    return current_user

@router.get("/stats", response_model=Response)
async def get_dashboard_stats(
    db: Session = Depends(get_db),
    admin: User = Depends(check_admin_permission)
):
    """
    Get dashboard statistics
    """
    # Total Users
    total_users = db.query(func.count(User.id)).scalar()
    
    # Active Users Today (Login in last 24h)
    # Using LoginSession updated_at or created_at
    # Simplified: Users with active session
    active_users = db.query(func.count(LoginSession.user_id.distinct())).filter(
        LoginSession.is_active == True
    ).scalar()
    
    # New Users Today
    today_start = func.current_date()
    new_users_today = db.query(func.count(User.id)).filter(
        User.created_at >= today_start
    ).scalar()
    
    return Response(data={
        "total_users": total_users,
        "active_users": active_users,
        "new_users_today": new_users_today
    })

@router.get("/users", response_model=Response)
async def list_users(
    page: int = 1,
    size: int = 10,
    keyword: str = None,
    status: int = None,
    db: Session = Depends(get_db),
    admin: User = Depends(check_admin_permission)
):
    """
    List users with pagination and filtering
    """
    query = select(User)
    
    if keyword:
        query = query.filter(
            (User.username.ilike(f"%{keyword}%")) | 
            (User.nickname.ilike(f"%{keyword}%"))
        )
        
    if status is not None:
        query = query.filter(User.status == status)
        
    # Count total
    count_query = select(func.count()).select_from(query.subquery())
    total = db.execute(count_query).scalar()
    
    # Pagination
    query = query.offset((page - 1) * size).limit(size).order_by(desc(User.created_at))
    users = db.execute(query).scalars().all()
    
    # Convert SQLAlchemy User objects to Pydantic UserResponse models
    user_responses = [UserResponse.model_validate(user) for user in users]
    
    return Response(data={
        "total": total,
        "items": user_responses,
        "page": page,
        "size": size
    })

@router.patch("/users/{user_id}/status", response_model=Response)
async def update_user_status(
    user_id: int,
    status: int = Query(..., description="1: Enable, 0: Disable"),
    db: Session = Depends(get_db),
    admin: User = Depends(check_admin_permission)
):
    """
    Ban/Unban user
    """
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    user.status = status
    db.commit()
    
    # If disabling, revoke all sessions
    if status == 0:
        # TODO: call revoke all sessions logic
        pass
        
    return Response(message="User status updated")

@router.get("/logs", response_model=Response)
async def list_operation_logs(
    page: int = 1,
    size: int = 10,
    user_id: int = None,
    db: Session = Depends(get_db),
    admin: User = Depends(check_admin_permission)
):
    """
    List operation logs
    """
    query = select(OperationLog)
    
    if user_id:
        query = query.filter(OperationLog.user_id == user_id)
        
    count_query = select(func.count()).select_from(query.subquery())
    total = db.execute(count_query).scalar()
    
    query = query.offset((page - 1) * size).limit(size).order_by(desc(OperationLog.created_at))
    logs = db.execute(query).scalars().all()
    
    # Convert SQLAlchemy OperationLog objects to Pydantic OperationLogResponse models
    log_responses = [OperationLogResponse.model_validate(log) for log in logs]
    
    return Response(data={
        "total": total,
        "items": log_responses,
        "page": page,
        "size": size
    })
