import jwt
from backend.passport.app.core.config import settings

def decode_token(token: str):
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        print(f"\n{'='*60}")
        print(f"Token 解码结果:")
        print(f"{'='*60}")
        print(f"sub (user_id): {payload.get('sub')}")
        print(f"jti (JWT ID): {payload.get('jti')}")
        print(f"exp (过期时间): {payload.get('exp')}")
        print(f"其他字段: {payload}")
        print(f"{'='*60}\n")
        return payload
    except jwt.ExpiredSignatureError:
        print("Token 已过期")
        return None
    except jwt.InvalidTokenError as e:
        print(f"Token 无效: {e}")
        return None

if __name__ == "__main__":
    print("请从浏览器控制台复制 token 并粘贴到下面:")
    print("在浏览器控制台执行: localStorage.getItem('token')")
    token = input("\n请输入 token: ").strip()
    
    if token:
        decode_token(token)
    else:
        print("未输入 token")
