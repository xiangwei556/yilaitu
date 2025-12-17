from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse
import os
import uuid
from datetime import datetime

router = APIRouter()

# 上传文件存储路径
UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

# 文件类型限制
ALLOWED_EXTENSIONS = {"jpg", "jpeg", "png"}

# 文件大小限制 (10MB)
MAX_FILE_SIZE = 10 * 1024 * 1024

def allowed_file(filename):
    """检查文件类型是否允许"""
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@router.post("/image")
async def upload_image(file: UploadFile = File(...)):
    """
    上传商品图片
    - **file**: 要上传的图片文件 (JPG/PNG格式，最大10MB)
    """
    # 检查文件类型
    if not allowed_file(file.filename):
        raise HTTPException(status_code=400, detail="只支持JPG、JPEG、PNG格式的图片")
    
    # 检查文件大小
    contents = await file.read()
    if len(contents) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="文件大小不能超过10MB")
    
    # 生成唯一文件名
    file_extension = file.filename.rsplit('.', 1)[1].lower()
    unique_filename = f"{uuid.uuid4()}.{file_extension}"
    file_path = os.path.join(UPLOAD_DIR, unique_filename)
    
    # 保存文件
    try:
        with open(file_path, "wb") as f:
            f.write(contents)
        
        # 返回文件信息
        return JSONResponse(
            status_code=200,
            content={
                "filename": unique_filename,
                "original_filename": file.filename,
                "path": file_path,
                "size": len(contents),
                "upload_time": datetime.now().isoformat()
            }
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"文件上传失败: {str(e)}")
