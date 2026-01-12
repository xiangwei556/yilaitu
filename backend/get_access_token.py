import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from passport.app.db.redis import get_redis

async def get_access_token():
    """
    从 Redis 中获取微信 Access Token
    """
    redis = await get_redis()
    
    try:
        token = await redis.get("wechat_access_token")
        if token:
            print("=" * 60)
            print("微信 Access Token")
            print("=" * 60)
            print(f"\nToken: {token}")
            
            expire_time = await redis.ttl("wechat_access_token")
            print(f"剩余有效期: {expire_time} 秒")
            
            print("\n" + "=" * 60)
        else:
            print("❌ Redis 中没有找到 Access Token")
    except Exception as e:
        print(f"❌ 获取 Access Token 失败: {e}")
    finally:
        await redis.close()

if __name__ == "__main__":
    asyncio.run(get_access_token())
