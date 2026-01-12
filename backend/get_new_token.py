import asyncio
import httpx
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.passport.app.core.config import settings

async def get_new_access_token():
    """
    获取最新的微信 Access Token
    """
    API_URL = "https://api.weixin.qq.com/cgi-bin/stable_token"
    
    params = {
        "grant_type": "client_credential",
        "appid": settings.WECHAT_APP_ID,
        "secret": settings.WECHAT_APP_SECRET,
        "force_refresh": True
    }
    
    async with httpx.AsyncClient() as client:
        try:
            print(f"正在从微信服务器获取新的 Access Token...")
            print(f"AppID: {settings.WECHAT_APP_ID}")
            
            response = await client.post(API_URL, json=params)
            response.raise_for_status()
            data = response.json()
            
            if "errcode" in data:
                print(f"错误: 微信 API 返回错误")
                print(f"错误码: {data.get('errcode')}")
                print(f"错误信息: {data.get('errmsg')}")
                return None
            
            access_token = data.get("access_token")
            expires_in = data.get("expires_in")
            
            if access_token:
                print(f"\n✅ 成功获取新的 Access Token!")
                print(f"Access Token: {access_token}")
                print(f"有效期: {expires_in} 秒")
                print(f"\n请复制上面的 Access Token 使用")
                return access_token
            else:
                print("错误: 微信 API 返回的 access_token 为空")
                return None
                
        except Exception as e:
            print(f"错误: 调用微信 API 失败: {e}")
            return None

if __name__ == "__main__":
    asyncio.run(get_new_access_token())
