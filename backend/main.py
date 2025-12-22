from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import sys
import os

# Add project root to sys.path to allow imports from backend.passport
# Assuming this file is at backend/main.py, so root is ../
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Import Passport modules
from backend.passport.app.core.config import settings
from backend.passport.app.core.exceptions import CustomException
from backend.passport.app.core.logging import logger
from backend.passport.app.api.v1.auth import router as auth_router
from backend.passport.app.api.v1.user import router as user_router
from backend.passport.app.api.v1.admin import router as admin_router
from backend.passport.app.api.v1.image.processor import router as image_processor_router
from backend.membership.api.membership import router as membership_router
from backend.points.api.points import router as points_router
from backend.order.api.order import router as order_router
from backend.notification.api.notification import router as notification_router
from backend.config_center.api.config import router as config_center_router
from backend.app.api.user_purchase import router as user_purchase_router
from backend.yilaitumodel.api.model import router as yilaitumodel_router
from fastapi.staticfiles import StaticFiles
import os

# Import original app modules
from app.database import init_db

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json"
)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
# 1. Passport Auth Router
app.include_router(auth_router, prefix=f"{settings.API_V1_STR}/auth", tags=["Auth"])

# 2. Passport User Router
app.include_router(user_router, prefix=f"{settings.API_V1_STR}/users", tags=["Users"])

# 3. Passport Admin Router
app.include_router(admin_router, prefix=f"{settings.API_V1_STR}/admin", tags=["Admin"])

# 4. Image Processor Router (Original route: /api/process-image)
app.include_router(image_processor_router, prefix="/api", tags=["Image Processing"])

# 5. New Modules Routers
app.include_router(membership_router, prefix=f"{settings.API_V1_STR}/membership", tags=["Membership"])
app.include_router(points_router, prefix=f"{settings.API_V1_STR}/points", tags=["Points"])
app.include_router(order_router, prefix=f"{settings.API_V1_STR}/order", tags=["Order"])
app.include_router(notification_router, prefix=f"{settings.API_V1_STR}/notification", tags=["Notification"])
app.include_router(config_center_router, prefix=f"{settings.API_V1_STR}/config", tags=["Config"])
app.include_router(user_purchase_router, prefix=f"{settings.API_V1_STR}/user-purchase", tags=["User Purchase"])
app.include_router(yilaitumodel_router, prefix=f"{settings.API_V1_STR}/yilaitumodel", tags=["YiLaiTu Model"])

# Static files for YiLaiTu Model images
_DATA_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data", "yilaitumodel")
if os.path.exists(_DATA_DIR):
    app.mount(f"{settings.API_V1_STR}/yilaitumodel/files", StaticFiles(directory=_DATA_DIR), name="yilaitumodel-files")

# Exception Handlers
@app.exception_handler(CustomException)
async def custom_exception_handler(request: Request, exc: CustomException):
    return JSONResponse(
        status_code=exc.status_code,
        content={"code": exc.status_code, "msg": exc.detail, "data": None},
    )

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    import traceback
    error_msg = traceback.format_exc()
    logger.error(f"Global exception: {exc}\n{error_msg}")
    return JSONResponse(
        status_code=500,
        content={"code": 500, "msg": "Internal Server Error", "data": None, "detail": str(exc)},
    )

# Basic Routes
@app.get('/')
async def root():
    return {"message": "AI Image Editing Backend"}

@app.get('/health')
async def health_check():
    return {"status": "ok", "app_name": settings.PROJECT_NAME}

if __name__ == "__main__":
    # Initialize original database
    print("初始化数据库...")
    init_db()
    print("数据库初始化完成")
    
    # Run server
    uvicorn.run(app, host="127.0.0.1", port=8001)
