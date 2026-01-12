import asyncio
import redis.asyncio as redis

REDIS_URL = "redis://localhost:6379/0"

async def get_access_token():
    """
    从 Redis 中获取微信 Access Token
    """
    redis_client = redis.from_url(
        REDIS_URL,
        encoding="utf-8",
        decode_responses=True
    )
    
    try:
        token = await redis_client.get("wechat:stable_access_token")
        if token:
            print("=" * 60)
            print("微信 Access Token")
            print("=" * 60)
            print(f"\nToken: {token}")
            
            expire_time = await redis_client.ttl("wechat:stable_access_token")
            print(f"剩余有效期: {expire_time} 秒")
            
            print("\n" + "=" * 60)
        else:
            print("❌ Redis 中没有找到 Access Token")
    except Exception as e:
        print(f"❌ 获取 Access Token 失败: {e}")
    finally:
        await redis_client.close()

if __name__ == "__main__":
    asyncio.run(get_access_token())
