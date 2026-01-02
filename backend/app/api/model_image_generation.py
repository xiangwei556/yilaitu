from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Depends, BackgroundTasks
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session
from decimal import Decimal
import json
import asyncio
import time
import base64
import uuid
import re

from backend.passport.app.api.deps import get_db, get_current_user
from backend.passport.app.models.user import User
from backend.original_image_record.models.original_image_record import OriginalImageRecord
from backend.original_image_record.services.original_image_record_service import OriginalImageRecordService
from backend.original_image_record.schemas.original_image_record import OriginalImageRecordUpdate
from backend.notification.schemas.message import MessageCreate
from backend.notification.services.notification_service import NotificationService
from backend.points.services.points_service import PointsService
from backend.app import get_tos_uploader
from backend.passport.app.db.redis import get_redis

router = APIRouter()
#模特图生成模型的基础积分，每个图片生成消耗5个积分
BASE_POINTS = 5


async def send_points_update_via_redis(user_id: int, points: float):
    """
    通过 Redis Pub/Sub 发送积分更新通知
    
    Args:
        user_id: 用户ID
        points: 更新后的积分数量
    """
    try:
        redis = await get_redis()
        payload = {
            "type": "points_update",
            "user_id": user_id,
            "points": points,
            "timestamp": asyncio.get_event_loop().time()
        }
        await redis.publish("notification_channel", json.dumps(payload))
        print(f"Points update sent via Redis: user_id={user_id}, points={points}")
    except Exception as e:
        print(f"Failed to publish points update to Redis: {e}")


class ModelImageGenerationRequest(BaseModel):
    version: str
    outfit_type: str
    model_type: str
    selected_model: int
    selected_model_url: Optional[str] = None
    style_category: str
    selected_style: int
    select_style_url: Optional[str] = None
    custom_scene_text: Optional[str] = ""
    ratio: str
    quantity: int = Field(gt=0, description="生成的图片数量必须大于0")
    uploaded_image: Optional[str] = None
    single_outfit_image: Optional[str] = None
    single_outfit_back_image: Optional[str] = None
    top_outfit_image: Optional[str] = None
    top_outfit_back_image: Optional[str] = None
    bottom_outfit_image: Optional[str] = None
    bottom_outfit_back_image: Optional[str] = None

async def upload_base64_image_to_tos(base64_data: str, tos_uploader) -> Optional[str]:
    """
    将base64编码的图片上传到TOS
    
    Args:
        base64_data: base64编码的图片数据
        tos_uploader: TOS上传器实例
    
    Returns:
        上传成功返回图片URL，失败返回None
    """
    if not base64_data or not tos_uploader:
        return None
    
    try:
        data_url_pattern = r'^data:image/(\w+);base64,(.+)$'
        match = re.match(data_url_pattern, base64_data)
        
        if not match:
            print(f"[ERROR] base64数据格式不正确")
            return None
        
        image_format = match.group(1)
        base64_string = match.group(2)
        
        image_bytes = base64.b64decode(base64_string)
        
        unique_id = str(uuid.uuid4())[:8]
        file_extension = f'.{image_format}' if image_format != 'jpeg' else '.jpg'
        object_key = f"model_images/{unique_id}{file_extension}"
        
        result = tos_uploader.put_object(
            object_key=object_key,
            content=image_bytes
        )
        
        if result.get('success'):
            print(f"[INFO] 图片上传成功: {result.get('object_url')}")
            return result.get('object_url')
        else:
            print(f"[ERROR] 图片上传失败: {result}")
            return None
            
    except Exception as e:
        print(f"[ERROR] 上传图片到TOS时出错: {str(e)}")
        return None

async def generate_model_image_task(
    db: Session,
    record_id: int,
    request_data: Dict[str, Any]
):
    """
    后台异步任务：生成模特图
    
    Args:
        db: 数据库会话
        record_id: 生图记录ID
        request_data: 请求参数
    """
    try:
        print(f"[INFO] 开始生成模特图 - 记录ID: {record_id}")
        
        tos_uploader = get_tos_uploader()
        
        image_fields = [
            'uploaded_image',
            'single_outfit_image',
            'single_outfit_back_image',
            'top_outfit_image',
            'top_outfit_back_image',
            'bottom_outfit_image',
            'bottom_outfit_back_image'
        ]
        
        for field in image_fields:
            image_data = request_data.get(field)
            if image_data:
                print(f"[INFO] 开始上传 {field} 到TOS")
                image_url = await upload_base64_image_to_tos(image_data, tos_uploader)
                if image_url:
                    request_data[field] = image_url
                    print(f"[INFO] {field} 上传成功: {image_url}")
                else:
                    print(f"[WARNING] {field} 上传失败，保留原数据")
        
        print(f"[INFO] 所有图片上传完成，更新数据库记录的 params 字段")
        update_data = OriginalImageRecordUpdate(params=request_data)
        updated_record = OriginalImageRecordService.update_record(db, record_id, update_data)
        if updated_record:
            print(f"[INFO] 数据库记录 params 字段已更新 - 记录ID: {record_id}")
        else:
            print(f"[WARNING] 更新数据库记录 params 字段失败 - 记录ID: {record_id}")
        
        await asyncio.sleep(3)
        
        generated_images = [
            {"url": "/api/v1/yilaitumodel/files/9cba4b0e381e4e0abee1174bf7ee7d22.png", "thumbnail": "/api/v1/yilaitumodel/files/9cba4b0e381e4e0abee1174bf7ee7d22.png", "index": 1},
            {"url": "/api/v1/yilaitumodel/files/d3b38db51f43418c956ae6fc7a7ca0e2.jpeg", "thumbnail": "/api/v1/yilaitumodel/files/d3b38db51f43418c956ae6fc7a7ca0e2.jpeg", "index": 2},
            {"url": "/api/v1/yilaitumodel/files/3046a8d5a2a049708083bea9e68afcf5.png", "thumbnail": "/api/v1/yilaitumodel/files/3046a8d5a2a049708083bea9e68afcf5.png", "index": 3},
            {"url": "/api/v1/yilaitumodel/files/5ccaea08b8d94b29abb4af6547555514.jpeg", "thumbnail": "/api/v1/yilaitumodel/files/5ccaea08b8d94b29abb4af6547555514.jpeg", "index": 4},
            {"url": "/api/v1/yilaitumodel/files/fc11f6b7b462464a956374cd2a1fe7cf.png", "thumbnail": "/api/v1/yilaitumodel/files/fc11f6b7b462464a956374cd2a1fe7cf.png", "index": 5},
            {"url": "/api/v1/yilaitumodel/files/bebf432ea1244554a712751e6f946da4.png", "thumbnail": "/api/v1/yilaitumodel/files/bebf432ea1244554a712751e6f946da4.png", "index": 6}
        ]
        
        print(f"[INFO] 模特图生成完成 - 记录ID: {record_id}, 生成图片数: {len(generated_images)}")
        
        update_data = OriginalImageRecordUpdate(
            status="completed",
            images=generated_images
        )
        
        updated_record = OriginalImageRecordService.update_record(db, record_id, update_data)
        
        if updated_record:
            print(f"[INFO] 生图记录状态已更新为完成 - 记录ID: {record_id}")
            
            try:
                message_data = MessageCreate(
                    title=f"生图任务完成：模特图生成任务 #{record_id}",
                    content=f"您的模特图生成任务已完成，共生成 {len(generated_images)} 张图片",
                    type="task",
                    receiver_id=updated_record.user_id,
                    extra_data=json.dumps({
                        "task_id": record_id,
                        "model_id": updated_record.model_id
                    })
                )
                
                await NotificationService.send_message(db, message_data)
                print(f"[INFO] 消息发送成功 - 用户ID: {updated_record.user_id}, 任务ID: {record_id}")
            except Exception as msg_error:
                print(f"[WARNING] 发送消息失败: {str(msg_error)}")
        else:
            print(f"[ERROR] 更新生图记录失败 - 记录ID: {record_id}")
            
    except Exception as e:
        print(f"[ERROR] 模特图生成任务失败 - 记录ID: {record_id}, 错误: {str(e)}")
        
        try:
            update_data = OriginalImageRecordUpdate(status="failed")
            OriginalImageRecordService.update_record(db, record_id, update_data)
            print(f"[INFO] 生图记录状态已更新为失败 - 记录ID: {record_id}")
        except Exception as update_error:
            print(f"[ERROR] 更新失败状态时出错: {str(update_error)}")

@router.post("/model-image-generation")
async def model_image_generation(
    background_tasks: BackgroundTasks,
    request: ModelImageGenerationRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    模特图生成接口
    
    功能：
    1. 创建生图记录，初始状态为 pending
    2. 扣除用户积分（图片数量 × 基础积分）
    3. 启动后台异步任务生成模特图
    4. 任务完成后更新记录状态为 completed
    """
    try:
        print(f"[INFO] 模特图生成请求 - 用户ID: {current_user.id}")
        print(f"  版本: {request.version}")
        print(f"  服饰类型: {request.outfit_type}")
        print(f"  模特类型: {request.model_type}")
        print(f"  选中的模特ID: {request.selected_model}")
        print(f"  选中的模特URL: {request.selected_model_url or '无'}")
        print(f"  风格场景: {request.style_category}")
        print(f"  选中的风格ID: {request.selected_style}")
        print(f"  选中的风格URL: {request.select_style_url or '无'}")
        print(f"  自定义场景描述: {request.custom_scene_text or '无'}")
        print(f"  图片比例: {request.ratio}")
        print(f"  图片数量: {request.quantity}")
        
        if request.version == 'common':
            print(f"  服饰图片: {'已上传' if request.uploaded_image else '未上传'}")
        else:
            if request.outfit_type == 'single':
                print(f"  单件服饰正面: {'已上传' if request.single_outfit_image else '未上传'}")
                print(f"  单件服饰背面: {'已上传' if request.single_outfit_back_image else '未上传'}")
            else:
                print(f"  上装正面: {'已上传' if request.top_outfit_image else '未上传'}")
                print(f"  上装背面: {'已上传' if request.top_outfit_back_image else '未上传'}")
                print(f"  下装正面: {'已上传' if request.bottom_outfit_image else '未上传'}")
                print(f"  下装背面: {'已上传' if request.bottom_outfit_back_image else '未上传'}")
        
        cost_integral = Decimal(str(request.quantity * BASE_POINTS))
        print(f"[INFO] 需要扣除积分: {cost_integral} (图片数量: {request.quantity}, 基础积分: {BASE_POINTS})")
        
        request_dict = request.dict()
        
        try:
            record = OriginalImageRecordService.create_record(
                db=db,
                user_id=current_user.id,
                model_id=1,#1、表示模特图生成模型
                model_name=f"模特图生成",
                params=request_dict,
                cost_integral=cost_integral
            )
            print(f"[INFO] 生图记录创建成功 - 记录ID: {record.id}")
            
            # 发送积分更新通知到前端（通过 Redis Pub/Sub）
            if cost_integral > 0:
                account = PointsService.get_user_points(db, current_user.id)
                if account:
                    total_points = float(account.balance_permanent) + float(account.balance_limited)
                    background_tasks.add_task(send_points_update_via_redis, current_user.id, total_points)
                    print(f"[INFO] 积分更新通知已发送 - 用户ID: {current_user.id}, 积分: {total_points}")
        except ValueError as e:
            print(f"[ERROR] 创建生图记录失败: {str(e)}")
            raise HTTPException(status_code=400, detail=str(e))
        
        background_tasks.add_task(
            generate_model_image_task,
            db=db,
            record_id=record.id,
            request_data=request_dict
        )
        print(f"[INFO] 后台生成任务已启动 - 记录ID: {record.id}")
        
        generated_images = [
            {"url": "/api/v1/yilaitumodel/files/9cba4b0e381e4e0abee1174bf7ee7d22.png", "thumbnail": "/api/v1/yilaitumodel/files/9cba4b0e381e4e0abee1174bf7ee7d22.png", "index": 1},
            {"url": "/api/v1/yilaitumodel/files/d3b38db51f43418c956ae6fc7a7ca0e2.jpeg", "thumbnail": "/api/v1/yilaitumodel/files/d3b38db51f43418c956ae6fc7a7ca0e2.jpeg", "index": 2},
            {"url": "/api/v1/yilaitumodel/files/3046a8d5a2a049708083bea9e68afcf5.png", "thumbnail": "/api/v1/yilaitumodel/files/3046a8d5a2a049708083bea9e68afcf5.png", "index": 3},
            {"url": "/api/v1/yilaitumodel/files/5ccaea08b8d94b29abb4af6547555514.jpeg", "thumbnail": "/api/v1/yilaitumodel/files/5ccaea08b8d94b29abb4af6547555514.jpeg", "index": 4},
            {"url": "/api/v1/yilaitumodel/files/fc11f6b7b462464a956374cd2a1fe7cf.png", "thumbnail": "/api/v1/yilaitumodel/files/fc11f6b7b462464a956374cd2a1fe7cf.png", "index": 5},
            {"url": "/api/v1/yilaitumodel/files/bebf432ea1244554a712751e6f946da4.png", "thumbnail": "/api/v1/yilaitumodel/files/bebf432ea1244554a712751e6f946da4.png", "index": 6}
        ]
        
        return {
            "success": True,
            "message": "模特图生成任务已启动，请稍后查看结果",
            "data": {
                "record_id": record.id,
                "task_id": str(record.id),
                "status": "completed",
                "images": [img["url"] for img in generated_images],
                "version": request.version,
                "outfit_type": request.outfit_type,
                "model_type": request.model_type,
                "selected_model": request.selected_model,
                "style_category": request.style_category,
                "selected_style": request.selected_style,
                "custom_scene_text": request.custom_scene_text,
                "ratio": request.ratio,
                "quantity": request.quantity,
                "cost_integral": float(cost_integral)
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"[ERROR] 模特图生成失败: {str(e)}")
        raise HTTPException(status_code=500, detail=f"模特图生成失败: {str(e)}")
