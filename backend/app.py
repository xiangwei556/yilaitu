from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os

# 创建FastAPI应用实例
app = FastAPI(
    title="易可图 - AI商品图合成API",
    description="提供AI图片背景替换、商品图合成等功能",
    version="1.0.0"
)

# 配置CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 在生产环境中应该设置具体的域名
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 初始化数据库
from app.database import init_db, engine, Base
from app.models import user, background  # 导入所有模型

# 创建数据库表
Base.metadata.create_all(bind=engine)

# 确保上传目录存在
from app.utils.file_handler import ensure_directories
ensure_directories()

# 配置静态文件服务（用于提供上传的文件）
upload_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "uploads")
if os.path.exists(upload_dir):
    app.mount("/api/files", StaticFiles(directory=upload_dir), name="files")

# 导入并注册路由
from app.api import upload, ai_processing, auth, backgrounds, images

# 注册API路由
app.include_router(auth.router, prefix="/api/auth", tags=["认证"])
app.include_router(upload.router, prefix="/api/upload", tags=["文件上传"])
app.include_router(ai_processing.router, prefix="/api/ai", tags=["AI处理"])
app.include_router(backgrounds.router, prefix="/api/backgrounds", tags=["背景管理"])
app.include_router(images.router, prefix="/api/images", tags=["图像处理"])

# 根路径
@app.get("/")
async def read_root():
    return {"message": "欢迎使用易可图API", "version": "1.0.0"}

# 健康检查端点
@app.get("/health")
async def health_check():
    """健康检查端点"""
    return {"status": "healthy", "service": "image-edit-api"}
