import httpx
from urllib.parse import quote, urlencode
from backend.passport.app.core.config import settings
from backend.passport.app.core.logging import logger

class WeChatService:
    API_BASE_URL = "https://api.weixin.qq.com/sns"
    OPEN_BASE_URL = "https://open.weixin.qq.com/connect"
    
    def __init__(self):
        self.app_id = settings.WECHAT_APP_ID
        self.app_secret = settings.WECHAT_APP_SECRET
    
    def get_pc_login_url(self, redirect_uri: str, state: str = "STATE") -> str:
        """
        Generate WeChat Scan QR Code Login URL (Website App)
        """
        params = {
            "appid": self.app_id,
            "redirect_uri": redirect_uri,
            "response_type": "code",
            "scope": "snsapi_login",
            "state": state,
        }
        # WeChat requires param order? Not really, but urlencode is safe.
        # But the URL format is specific:
        # https://open.weixin.qq.com/connect/qrconnect?appid=APPID&redirect_uri=REDIRECT_URI&response_type=code&scope=SCOPE&state=STATE#wechat_redirect
        
        base = f"{self.OPEN_BASE_URL}/qrconnect"
        query = urlencode(params)
        return f"{base}?{query}#wechat_redirect"

    async def get_access_token(self, code: str) -> dict:
        """
        Get Access Token using authorization code
        """
        url = f"{self.API_BASE_URL}/oauth2/access_token"
        params = {
            "appid": self.app_id,
            "secret": self.app_secret,
            "code": code,
            "grant_type": "authorization_code"
        }
        
        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(url, params=params)
                response.raise_for_status()
                data = response.json()
                
                if "errcode" in data:
                    logger.error(f"WeChat API Error: {data}")
                    raise Exception(f"WeChat Error: {data.get('errmsg')}")
                    
                return data
            except Exception as e:
                logger.error(f"Failed to get WeChat access token: {e}")
                raise

    async def get_user_info(self, access_token: str, openid: str) -> dict:
        """
        Get User Info
        """
        url = f"{self.API_BASE_URL}/userinfo"
        params = {
            "access_token": access_token,
            "openid": openid,
            "lang": "zh_CN"
        }
        
        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(url, params=params)
                response.raise_for_status()
                data = response.json()
                
                if "errcode" in data:
                    logger.error(f"WeChat API Error: {data}")
                    raise Exception(f"WeChat Error: {data.get('errmsg')}")
                
                return data
            except Exception as e:
                logger.error(f"Failed to get WeChat user info: {e}")
                raise

wechat_service = WeChatService()
