from fastapi import APIRouter, UploadFile, File, Form, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import Optional
import os
import uuid
from datetime import datetime

from app.database import get_db
from app.models.user import User
from app.schemas.image import ImageProcessRequest, ImageProcessResponse
from app.utils.auth_utils import get_current_active_user, check_user_credits
from app.utils.file_handler import (
    get_upload_path,
    generate_unique_filename,
    allowed_file,
    validate_file_size,
    ensure_directories
)

router = APIRouter()

# 确保上传目录存在
# 确保所有必要的目录存在
ensure_directories()
# 获取上传目录（稍后使用时需要指定文件名）
BASE_UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "uploads")
UPLOAD_DIR = os.path.join(BASE_UPLOAD_DIR, "products")
OUTPUT_DIR = os.path.join(BASE_UPLOAD_DIR, "processed")

@router.post("/upload", response_model=dict)
async def upload_image(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    上传图片文件
    - 限制文件类型为jpg、jpeg、png、webp
    - 限制文件大小为10MB
    - 检查用户积分余额
    """
    # 检查用户积分
    if not check_credit_balance(current_user, 1):
        raise HTTPException(status_code=400, detail="积分不足，请充值")
    
    # 验证文件类型和大小
    if not validate_image_file(file):
        raise HTTPException(status_code=400, detail="不支持的文件类型或文件过大")
    
    # 生成唯一文件名
    file_extension = file.filename.split('.')[-1] if '.' in file.filename else 'jpg'
    filename = generate_unique_filename(f"user_{current_user.id}_", file_extension)
    file_path = os.path.join(UPLOAD_DIR, filename)
    
    # 保存文件
    try:
        contents = await file.read()
        with open(file_path, "wb") as f:
            f.write(contents)
        
        # 减少用户积分
        current_user.credits -= 1
        db.commit()
        
        return {
            "filename": filename,
            "file_path": file_path,
            "message": "图片上传成功",
            "remaining_credits": current_user.credits
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"文件上传失败: {str(e)}")

@router.post("/process", response_model=ImageProcessResponse)
async def process_image(
    request: ImageProcessRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    处理图片（抠图+更换背景）
    - 输入：原始图片和目标背景
    - 输出：处理后的图片
    """
    # 检查用户积分（处理图片需要更多积分）
    if not check_credit_balance(current_user, 3):
        raise HTTPException(status_code=400, detail="积分不足，请充值")
    
    # 验证原始图片存在
    original_file_path = os.path.join(UPLOAD_DIR, request.filename)
    if not os.path.exists(original_file_path):
        raise HTTPException(status_code=404, detail="原始图片不存在")
    
    # 导入图像处理服务
    from app.services.image_processor import process_image as process_image_service
    
    try:
        # 准备背景图像路径
        background_path = None
        if request.background_id:
            # 从数据库获取背景图像信息
            from app.models.background import Background
            background = db.query(Background).filter(Background.id == request.background_id).first()
            if background:
                # 实际应用中，应该将背景图片下载到本地临时文件
                # 这里简化处理，直接使用URL（实际需要下载）
                background_path = background.image_url
        
        # 准备处理参数
        process_params = {
            'feather_amount': request.feather_amount,
            'scale': request.scale,
            'position_x': request.position_x,
            'position_y': request.position_y,
            'rotate': request.rotate
        }
        
        # 生成输出文件路径
        output_filename = f"processed_{uuid.uuid4()}.png"
        output_path = os.path.join(OUTPUT_DIR, output_filename)
        
        # 调用图像处理服务
        success, message = process_image_service(
            foreground_path=original_file_path,
            background_path=background_path,
            output_path=output_path,
            params=process_params
        )
        
        if not success:
            raise HTTPException(status_code=500, detail=f"图片处理失败: {message}")
        
        # 记录处理结果到数据库
        from app.models.image import Image, ProcessedImage
        
        # 查找或创建原始图像记录
        original_image = db.query(Image).filter(
            Image.filename == request.filename,
            Image.user_id == current_user.id
        ).first()
        
        if not original_image:
            # 创建新的图像记录
            original_image = Image(
                filename=request.filename,
                original_filename=request.filename,
                file_path=original_file_path,
                file_size=os.path.getsize(original_file_path),
                mime_type='image/png',
                user_id=current_user.id,
                status='processed'
            )
            db.add(original_image)
            db.flush()  # 获取ID但不提交事务
        
        # 创建处理结果记录
        processed_image = ProcessedImage(
            original_image_id=original_image.id,
            filename=output_filename,
            file_path=output_path,
            file_size=os.path.getsize(output_path),
            background_id=request.background_id,
            credits_used=3,
            process_parameters=str(process_params)
        )
        db.add(processed_image)
        
        # 减少用户积分
        current_user.credits -= 3
        
        # 提交所有更改
        db.commit()
        
        return {
            "output_filename": output_filename,
            "output_path": output_path,
            "message": "图片处理成功",
            "remaining_credits": current_user.credits,
            "processed_at": datetime.now().isoformat()
        }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"图片处理失败: {str(e)}")

@router.get("/download/{filename}")
async def download_image(
    filename: str,
    current_user: User = Depends(get_current_active_user)
):
    """
    下载处理后的图片
    """
    file_path = os.path.join(OUTPUT_DIR, filename)
    
    if not os.path.exists(file_path):
        # 尝试在上传目录查找
        file_path = os.path.join(UPLOAD_DIR, filename)
        if not os.path.exists(file_path):
            raise HTTPException(status_code=404, detail="文件不存在")
    
    # 确保文件名包含扩展名
    if '.' not in filename:
        filename += '.jpg'  # 默认添加jpg扩展名
    
    return FileResponse(
        path=file_path,
        filename=filename,
        media_type='image/jpeg'
    )

@router.get("/history")
async def get_image_history(
    page: int = 1,
    page_size: int = 20,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    获取用户的图片处理历史
    注意：实际应用中应该在数据库中存储处理历史记录
    这里为了演示，我们暂时扫描输出目录
    """
    # 从数据库查询处理历史
    from app.models.image import ProcessedImage, Image
    
    # 构建查询
    query = db.query(
        ProcessedImage.id,
        Image.original_filename,
        ProcessedImage.filename.label('processed_filename'),
        ProcessedImage.processed_at,
        ProcessedImage.credits_used
    ).join(
        Image, ProcessedImage.original_image_id == Image.id
    ).filter(
        Image.user_id == current_user.id
    ).order_by(
        ProcessedImage.processed_at.desc()
    )
    
    # 获取总数
    total = query.count()
    
    # 分页
    items = query.offset((page - 1) * page_size).limit(page_size).all()
    
    # 转换为响应格式
    history = []
    for item in items:
        history.append({
            "id": item.id,
            "original_filename": item.original_filename,
            "processed_filename": item.processed_filename,
            "processed_at": item.processed_at,
            "credits_used": item.credits_used,
            "status": "completed"
        })
    
    return {
        "history": history,
        "total": total,
        "page": page,
        "page_size": page_size
    }