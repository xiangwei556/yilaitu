import httpx
import json
from backend.passport.app.core.config import settings
from backend.passport.app.core.logging import logger
from backend.passport.app.db.redis import get_redis

class WeChatStableAccessToken:
    """
    微信小程序稳定 Access Token 工具类
    用于获取和管理微信小程序的稳定 Access Token
    """
    
    API_URL = "https://api.weixin.qq.com/cgi-bin/stable_token"
    REDIS_KEY = "wechat:stable_access_token"
    TOKEN_EXPIRE_SECONDS = 7100  # 微信 Access Token 有效期为 7200 秒，提前 100 秒刷新
    
    def __init__(self):
        self.app_id = settings.WECHAT_APP_ID
        self.app_secret = settings.WECHAT_APP_SECRET
    
    async def get_stable_access_token(self) -> str:
        """
        获取微信小程序稳定 Access Token
        
        1. 从 Redis 中查询是否存在稳定 access_token
        2. 如果存在，则直接返回该 access_token
        3. 如果不存在，则调用微信接口获取稳定 access_token
        4. 将获取到的稳定 access_token 保存到 Redis 中
        5. 返回稳定 access_token
        
        Returns:
            str: 微信小程序稳定 Access Token
        """
        redis = await get_redis()
        
        try:
            # 1. 从 Redis 中查询是否存在稳定 access_token
            cached_token = await redis.get(self.REDIS_KEY)
            
            if cached_token:
                logger.info("从 Redis 获取到缓存的微信 Access Token")
                return cached_token
            
            # 2. 如果不存在，则调用微信接口获取稳定 access_token
            logger.info("Redis 中无缓存的 Access Token，开始从微信服务器获取")
            token = await self._fetch_stable_access_token()
            
            # 3. 将获取到的稳定 access_token 保存到 Redis 中
            await redis.setex(self.REDIS_KEY, self.TOKEN_EXPIRE_SECONDS, token)
            logger.info(f"微信 Access Token 已保存到 Redis，有效期 {self.TOKEN_EXPIRE_SECONDS} 秒")
            
            # 4. 返回稳定 access_token
            return token
            
        except Exception as e:
            logger.error(f"获取微信稳定 Access Token 失败: {e}")
            raise
    
    async def force_refresh_token(self) -> str:
        """
        强制刷新 Access Token
        1. 调用微信接口强制刷新
        2. 更新 Redis 缓存
        3. 返回新 Token
        """
        logger.info("收到强制刷新 Access Token 请求")
        token = await self._fetch_stable_access_token(force_refresh=True)
        redis = await get_redis()
        await redis.setex(self.REDIS_KEY, self.TOKEN_EXPIRE_SECONDS, token)
        logger.info(f"强制刷新完成，新 Token 已保存到 Redis")
        return token

    async def _fetch_stable_access_token(self, force_refresh: bool = False) -> str:
        """
        从微信服务器获取稳定 Access Token
        
        Args:
            force_refresh: 是否强制刷新
            
        Returns:
            str: 微信 Access Token
        """
        params = {
            "grant_type": "client_credential",
            "appid": self.app_id,
            "secret": self.app_secret,
            "force_refresh": force_refresh
        }
        
        logger.info(f"正在请求微信 Access Token, appid: {self.app_id}, secret: {self.app_secret}")
        
        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(self.API_URL, json=params)
                response.raise_for_status()
                data = response.json()
                
                if "errcode" in data:
                    logger.error(f"微信 API 错误: {data}")
                    raise Exception(f"微信错误: {data.get('errmsg')}")
                
                access_token = data.get("access_token")
                if not access_token:
                    raise Exception("微信 API 返回的 access_token 为空")
                
                logger.info("成功从微信服务器获取 Access Token")
                return access_token
                
            except Exception as e:
                logger.error(f"调用微信 API 获取 Access Token 失败: {e}")
                raise

wechat_stable_token = WeChatStableAccessToken()
