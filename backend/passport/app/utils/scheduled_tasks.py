import asyncio
from backend.passport.app.utils.webchat_get_stable_access_token import wechat_stable_token
from backend.passport.app.core.logging import logger

async def refresh_wechat_access_token_task():
    """
    定时任务：每小时刷新一次微信 Access Token
    """
    while True:
        try:
            logger.info("开始刷新微信 Access Token")
            token = await wechat_stable_token.get_stable_access_token()
            logger.info("微信 Access Token 刷新成功")
        except Exception as e:
            logger.error(f"刷新微信 Access Token 失败: {e}")
        
        # 每小时执行一次
        await asyncio.sleep(3600)
