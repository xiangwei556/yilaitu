import uuid
import base64
import io
from captcha.image import ImageCaptcha
from backend.passport.app.db.redis import get_redis
from backend.passport.app.core.config import settings

class CaptchaService:
    REDIS_PREFIX = "captcha:"
    
    @property
    def expire_time(self):
        return getattr(settings, "CAPTCHA_EXPIRE_SECONDS", 300)

    async def create_captcha(self) -> dict:
        """
        Generate a graphic captcha.
        Returns:
            dict: {"captcha_id": str, "captcha_image": str (base64)}
        """
        image = ImageCaptcha(width=160, height=60)
        
        # Generate random text (4 chars)
        import random
        import string
        code = "".join(random.choices(string.ascii_uppercase + string.digits, k=4))
        
        # Generate image
        data = image.generate(code)
        
        # Store in Redis
        captcha_id = str(uuid.uuid4())
        redis = await get_redis()
        key = f"{self.REDIS_PREFIX}{captcha_id}"
        await redis.set(key, code, ex=self.expire_time)
        
        # Encode image to base64
        base64_image = base64.b64encode(data.getvalue()).decode('utf-8')
        
        return {
            "captcha_id": captcha_id,
            "captcha_image": f"data:image/png;base64,{base64_image}"
        }

    async def verify_captcha(self, captcha_id: str, code: str) -> bool:
        """
        Verify captcha code.
        """
        if not captcha_id or not code:
            return False
            
        redis = await get_redis()
        key = f"{self.REDIS_PREFIX}{captcha_id}"
        stored_code = await redis.get(key)
        
        if not stored_code:
            return False
            
        # Case insensitive comparison
        if stored_code.lower() != code.lower():
            return False
            
        # Delete after successful verification (or let it expire?)
        # Usually delete to prevent replay
        await redis.delete(key)
        return True

captcha_service = CaptchaService()
