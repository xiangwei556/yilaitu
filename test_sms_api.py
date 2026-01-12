"""
测试短信发送接口
"""
import requests
import json
import asyncio
import aiohttp


async def test_send_sms_async():
    """异步测试发送短信"""
    url = "https://zr848436ml96.vicp.fun/api/v1/auth/login/send_sms"
    phone = "13401022282"
    
    payload = {
        "phone_number": phone
    }
    
    headers = {
        "Content-Type": "application/json",
        "Accept": "application/json"
    }
    
    print("=" * 60)
    print("测试短信发送接口")
    print("=" * 60)
    print(f"URL: {url}")
    print(f"请求体: {json.dumps(payload, ensure_ascii=False)}")
    print(f"请求头: {headers}")
    print("=" * 60)
    
    try:
        # 异步发送请求
        async with aiohttp.ClientSession() as session:
            async with session.post(url, json=payload, headers=headers, timeout=aiohttp.ClientTimeout(total=30)) as response:
                status_code = response.status
                response_text = await response.text()
                
                print(f"\n响应状态码: {status_code}")
                print(f"响应头: {dict(response.headers)}")
                print(f"响应体: {response_text}")
                
                # 分析可能的权限问题
                print("\n" + "=" * 60)
                print("权限问题分析:")
                print("=" * 60)
                
                if status_code == 200:
                    print("✓ 请求成功!")
                    try:
                        response_json = json.loads(response_text)
                        print(f"响应消息: {response_json.get('msg', '无')}")
                    except:
                        pass
                elif status_code == 401:
                    print("✗ 401 未授权 - 需要登录认证")
                    print("  可能原因:")
                    print("  - 接口需要认证令牌 (Bearer token)")
                    print("  - 需要在请求头中添加 Authorization 字段")
                elif status_code == 403:
                    print("✗ 403 禁止访问 - 无权限")
                    print("  可能原因:")
                    print("  - 域名不在允许的域名列表中")
                    print("  - IP被限制访问")
                    print("  - CORS配置问题")
                elif status_code == 404:
                    print("✗ 404 未找到 - 接口路径错误")
                    print("  可能原因:")
                    print("  - 路由配置问题")
                    print("  - 接口路径不匹配")
                elif status_code == 500:
                    print("✗ 500 服务器内部错误")
                    print("  可能原因:")
                    print("  - 后端服务异常")
                    print("  - 数据库连接失败")
                    print("  - 短信服务配置错误")
                else:
                    print(f"✗ 其他错误 - 状态码: {status_code}")
                
                # 检查响应头中的特殊字段
                print("\n" + "=" * 60)
                print("响应头分析:")
                print("=" * 60)
                for key, value in response.headers.items():
                    if any(x in key.lower() for x in ['access-control', 'content-type', 'server', 'date']):
                        print(f"  {key}: {value}")
                        
    except aiohttp.ClientError as e:
        print(f"\n请求异常: {type(e).__name__}")
        print(f"错误信息: {str(e)}")
        print("\n可能的原因:")
        print("  - 网络连接失败")
        print("  - 域名解析失败")
        print("  - SSL证书问题")
        print("  - 端口未正确转发")
        print("  - 防火墙阻止连接")


def test_localhost():
    """测试本地接口"""
    url = "http://127.0.0.1:8001/api/v1/auth/login/send_sms"
    phone = "13401022282"
    
    payload = {
        "phone_number": phone
    }
    
    headers = {
        "Content-Type": "application/json",
        "Accept": "application/json"
    }
    
    print("\n" + "=" * 60)
    print("测试本地接口 (127.0.0.1:8001)")
    print("=" * 60)
    
    try:
        response = requests.post(url, json=payload, headers=headers, timeout=30)
        print(f"状态码: {response.status_code}")
        print(f"响应体: {response.text}")
        
        try:
            response_json = response.json()
            print(f"解析的响应: {json.dumps(response_json, ensure_ascii=False, indent=2)}")
        except:
            pass
            
    except requests.exceptions.RequestException as e:
        print(f"请求异常: {e}")


async def main():
    """主函数"""
    print("\n开始测试...")
    
    # 先测试本地
    test_localhost()
    
    # 然后测试花生壳域名
    await test_send_sms_async()
    
    print("\n" + "=" * 60)
    print("测试完成")
    print("=" * 60)


if __name__ == "__main__":
    asyncio.run(main())
