from fastapi import APIRouter, Request, HTTPException
from fastapi.responses import PlainTextResponse
from xml.etree import ElementTree as ET
from backend.passport.app.core.config import settings
from backend.passport.app.core.logging import logger
from backend.passport.app.db.redis import get_redis
import hashlib

router = APIRouter()

@router.get("/wechat/msg", response_class=PlainTextResponse)
async def wechat_validate(
    signature: str,
    timestamp: str,
    nonce: str,
    echostr: str
):
    """
    微信服务器配置验证接口
    
    Args:
        signature: 微信加密签名
        timestamp: 时间戳
        nonce: 随机数
        echostr: 随机字符串
    
    Returns:
        PlainTextResponse: 验证成功返回echostr，失败返回错误信息
    """
    try:
        # 验证签名
        tmp_list = [settings.WECHAT_TOKEN, timestamp, nonce]
        tmp_list.sort()
        tmp_str = ''.join(tmp_list).encode('utf-8')
        tmp_sign = hashlib.sha1(tmp_str).hexdigest()
        
        if tmp_sign == signature:
            logger.info("微信服务器配置验证成功")
            return echostr
        else:
            logger.warning(f"微信服务器配置验证失败: 期望签名 {tmp_sign}, 实际签名 {signature}")
            raise HTTPException(status_code=403, detail="验证失败")
    except Exception as e:
        logger.error(f"微信服务器配置验证异常: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/wechat/msg", response_class=PlainTextResponse)
async def wechat_receive_msg(request: Request):
    """
    接收微信关注/扫码事件
    
    Args:
        request: FastAPI请求对象
    
    Returns:
        PlainTextResponse: 必须返回"success"，否则微信会重复推送
    """
    try:
        # 解析微信推送的XML数据
        xml_data = await request.body()
        xml_str = xml_data.decode('utf-8')
        logger.info(f"接收到微信推送消息: {xml_str}")
        
        root = ET.fromstring(xml_str)
        
        # 提取核心参数
        msg_type = root.find('MsgType').text if root.find('MsgType') is not None else ''
        event = root.find('Event').text if root.find('Event') is not None else ''
        openid = root.find('FromUserName').text if root.find('FromUserName') is not None else ''
        event_key = root.find('EventKey').text if root.find('EventKey') is not None else ''
        
        logger.info(f"微信事件详情 - MsgType: {msg_type}, Event: {event}, OpenID: {openid}, EventKey: {event_key}")
        
        # 处理「关注事件」或「扫码事件」
        if msg_type == 'event':
            # 处理关注事件（用户扫描带参数二维码关注）
            if event == 'subscribe':
                scene_id = ''
                # 提取场景值（EventKey格式为 qrscene_场景值）
                if event_key and event_key.startswith('qrscene_'):
                    scene_id = event_key.replace('qrscene_', '')
                elif event_key:
                    scene_id = event_key
                
                if scene_id:
                    # 将openid与场景值绑定存储到Redis
                    redis = await get_redis()
                    redis_key = f"wechat_scene_{scene_id}"
                    
                    # 检查是否已存在该scene_id
                    existing_value = await redis.get(redis_key)
                    if existing_value:
                        logger.info(f"场景值 {scene_id} 已存在，原值: {existing_value}")
                    
                    # 存储openid，有效期1小时
                    await redis.setex(redis_key, 3600, openid)
                    logger.info(f"用户 {openid} 关注了服务号，场景值: {scene_id} 已绑定")
                else:
                    logger.warning(f"关注事件中未找到场景值，EventKey: {event_key}")
            
            # 处理扫码事件（用户已关注，扫描带参数二维码）
            elif event == 'SCAN':
                scene_id = event_key if event_key else ''
                
                if scene_id:
                    # 将openid与场景值绑定存储到Redis
                    redis = await get_redis()
                    redis_key = f"wechat_scene_{scene_id}"
                    
                    # 检查是否已存在该scene_id
                    existing_value = await redis.get(redis_key)
                    if existing_value:
                        logger.info(f"场景值 {scene_id} 已存在，原值: {existing_value}")
                    
                    # 存储openid，有效期1小时
                    await redis.setex(redis_key, 3600, openid)
                    logger.info(f"用户 {openid} 扫描了二维码，场景值: {scene_id} 已绑定")
                else:
                    logger.warning(f"扫码事件中未找到场景值，EventKey: {event_key}")
        
        # 必须返回success，否则微信会重复推送
        return "success"
        
    except Exception as e:
        logger.error(f"处理微信消息异常: {e}")
        # 即使出错也要返回success，避免微信重复推送
        return "success"
