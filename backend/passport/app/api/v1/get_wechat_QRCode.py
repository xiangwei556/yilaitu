import httpx
import time
import random
from backend.passport.app.core.config import settings
from backend.passport.app.core.logging import logger
from backend.passport.app.utils.webchat_get_stable_access_token import wechat_stable_token
from backend.passport.app.db.redis import get_redis

class WeChatQRCodeService:
    """
    微信小程序二维码服务类
    用于生成微信小程序二维码
    """
    
    API_URL = "https://api.weixin.qq.com/cgi-bin/qrcode/create"
    
    def __init__(self):
        self.app_id = settings.WECHAT_APP_ID
        self.app_secret = settings.WECHAT_APP_SECRET
    
    async def get_wechat_QRCode(
        self,
        expire_seconds: int = 60,
        action_name: str = "QR_STR_SCENE",
        scene_id: str = None
    ) -> dict:
        """
        获取微信小程序二维码
        
        Args:
            expire_seconds: 过期时间，单位秒，默认值60秒，最大不超过2592000（30天）
            action_name: 二维码类型，默认值QR_STR_SCENE（支持字符串场景值）
            scene_id: 场景值，如果不提供则自动生成（使用时间戳）
        
        Returns:
            dict: 包含以下字段：
                - scene_id: 场景值，用于前端轮询
                - ticket: 获取的二维码ticket
                - expire_seconds: 该二维码有效时间，以秒为单位
                - url: 二维码图片解析后的地址
                - qr_code_url: 组装好的二维码图片 URL，格式为 https://mp.weixin.qq.com/cgi-bin/showqrcode?ticket=xxx
        """
        # 如果没有提供scene_id，则生成唯一的scene_id（使用毫秒级时间戳 + 5位随机数+ str(random.randint(10000, 99999))）
        if scene_id is None:
            scene_id = str(int(time.time() * 1000)) 
        
        # 构建action_info（使用scene_str支持字符串类型）
        action_info = {"scene": {"scene_str": scene_id}}
        
        try:
            # 1. 从工具类中获取 access_token
            access_token = await wechat_stable_token.get_stable_access_token()
            logger.info("成功获取微信 Access Token")
            
            # 2. 将scene_id存储到Redis中，标记为待扫码状态
            redis = await get_redis()
            redis_key = f"wechat_scene_{scene_id}"
            await redis.setex(redis_key, expire_seconds, "pending")
            logger.info(f"场景值 {scene_id} 已存储到Redis，等待用户扫码")
            
            # 3. 调用微信 API 生成二维码 (包含重试机制)
            max_retries = 1
            for attempt in range(max_retries + 1):
                params = {
                    "access_token": access_token
                }
                
                data = {
                    "expire_seconds": expire_seconds,
                    "action_name": action_name,
                    "action_info": action_info
                }
                
                async with httpx.AsyncClient() as client:
                    response = await client.post(self.API_URL, params=params, json=data)
                    response.raise_for_status()
                    result = response.json()
                    
                    logger.info(f"微信API返回的完整结果 (attempt {attempt}): {result}")
                    
                    # 检查是否有错误
                    if "errcode" in result and result["errcode"] != 0:
                        # 处理 Access Token 过期的情况 (40001: 获取access_token时AppSecret错误，或者access_token无效; 40014: 不合法的access_token; 42001: access_token超时)
                        if result["errcode"] in [40001, 40014, 42001] and attempt < max_retries:
                            logger.warning(f"微信 Access Token 失效 (code: {result['errcode']})，正在强制刷新重试...")
                            access_token = await wechat_stable_token.force_refresh_token()
                            continue
                        
                        logger.error(f"微信 API 错误: {result}")
                        raise Exception(f"微信错误: {result.get('errmsg')} rid: {result.get('rid', 'unknown')}")
                    
                    # 成功，跳出循环
                    break
                
            # 4. 提取返回参数
            ticket = result.get("ticket")
            expire_seconds_result = result.get("expire_seconds")
            url = result.get("url")
            
            if not ticket:
                raise Exception("微信 API 返回的 ticket 为空")
            
            # 5. 组装二维码图片 URL
            qr_code_url = f"https://mp.weixin.qq.com/cgi-bin/showqrcode?ticket={ticket}"
            
            logger.info(f"成功生成微信二维码，scene_id: {scene_id}, ticket: {ticket[:20]}...")
            logger.info(f"微信API返回的url: {url}")
            
            # 6. 返回结果
            return {
                "scene_id": scene_id,
                "ticket": ticket,
                "expire_seconds": expire_seconds_result,
                "url": url,
                "qr_code_url": qr_code_url
            }
                
        except Exception as e:
            logger.error(f"生成微信二维码失败: {e}")
            raise

wechat_qrcode_service = WeChatQRCodeService()
