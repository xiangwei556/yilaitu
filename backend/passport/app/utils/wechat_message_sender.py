import httpx
import json
from backend.passport.app.utils.webchat_get_stable_access_token import wechat_stable_token

class WeChatMessageSender:
    @staticmethod
    async def send_custom_text(openid, content):
        """发送客服文本消息（关注后48小时内有效）"""
        try:
            access_token = await wechat_stable_token.get_stable_access_token()
            url = f"https://api.weixin.qq.com/cgi-bin/message/custom/send?access_token={access_token}"
            data = {
                "touser": openid,
                "msgtype": "text",
                "text": {"content": content}
            }
            async with httpx.AsyncClient() as client:
                # 使用 ensure_ascii=False 防止中文被转义
                response = await client.post(
                    url, 
                    content=json.dumps(data, ensure_ascii=False).encode("utf-8"),
                    headers={"Content-Type": "application/json"}
                )
                return response.json()
        except Exception as e:
            return {"errcode": -1, "errmsg": str(e)}

    @staticmethod
    async def send_template_msg(openid, template_id, url, data):
        """发送模板消息（需提前申请模板）"""
        try:
            access_token = await wechat_stable_token.get_stable_access_token()
            api_url = f"https://api.weixin.qq.com/cgi-bin/message/template/send?access_token={access_token}"
            payload = {
                "touser": openid,
                "template_id": template_id,
                "url": url,
                "data": data
            }
            async with httpx.AsyncClient() as client:
                response = await client.post(api_url, json=payload)
                return response.json()
        except Exception as e:
            return {"errcode": -1, "errmsg": str(e)}
