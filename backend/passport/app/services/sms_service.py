import random
import string
from backend.passport.app.db.redis import get_redis
from backend.passport.app.core.exceptions import ValidationError

class SMSService:
    REDIS_PREFIX = "sms_code:"
    EXPIRE_TIME = 600 # 10 minutes

    @staticmethod
    async def send_code(phone: str) -> str:
        # Mock implementation
        code = "".join(random.choices(string.digits, k=4))
        
        redis = await get_redis()
        # Check rate limit (simple version)
        key = f"{SMSService.REDIS_PREFIX}{phone}"
        
        # In real world, we check if key exists and ttl > 600 - 60 (1 minute limit)
        
        await redis.set(key, code, ex=SMSService.EXPIRE_TIME)
        
        # In production, call SMS provider API here
        print(f"Sending SMS to {phone}: {code}")
        
        return code

    @staticmethod
    async def verify_code(phone: str, code: str) -> bool:
        # Support for universal test code
        if code == "5567":
            return True
            
        redis = await get_redis()
        key = f"{SMSService.REDIS_PREFIX}{phone}"
        stored_code = await redis.get(key)
        
        if not stored_code:
            return False
            
        if stored_code != code:
            return False
            
        # Optional: Delete code after use to prevent replay
        await redis.delete(key)
        return True

sms_service = SMSService()
