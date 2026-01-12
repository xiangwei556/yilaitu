import asyncio
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.passport.app.db.redis import get_redis

async def save_token_to_redis():
    """
    将新的 Access Token 保存到 Redis
    """
    redis = await get_redis()
    
    REDIS_KEY = "wechat:stable_access_token"
    TOKEN_EXPIRE_SECONDS = 7100
    
    access_token = "99__VmphN1A6doXWNKLQNL_F6B3tuNIPc1sSN7VnCKCkFgtQs0SWZznpNkFM1AEOnPaFWNrBBSV4PGlQGTo8hCaC1bcQIZpoPAhEgPHUGlpHVT2FI3-YYPutifZ2C8JRVhAIATBF"
    
    try:
        await redis.setex(REDIS_KEY, TOKEN_EXPIRE_SECONDS, access_token)
        print(f"✅ Access Token 已成功保存到 Redis")
        print(f"Redis Key: {REDIS_KEY}")
        print(f"有效期: {TOKEN_EXPIRE_SECONDS} 秒")
        
        # 验证是否保存成功
        saved_token = await redis.get(REDIS_KEY)
        if saved_token:
            print(f"\n验证成功: 从 Redis 读取到的 Token 与保存的一致")
        else:
            print(f"\n警告: 从 Redis 读取 Token 失败")
            
    except Exception as e:
        print(f"❌ 保存 Access Token 到 Redis 失败: {e}")

if __name__ == "__main__":
    asyncio.run(save_token_to_redis())
