"""
测试创建支付订单API - 模拟请求
"""
import sys
import os
import asyncio

# 添加项目根目录到路径
current_dir = os.path.dirname(os.path.abspath(__file__))
backend_dir = os.path.dirname(current_dir)
project_root = os.path.dirname(backend_dir)
sys.path.insert(0, project_root)
sys.path.insert(0, backend_dir)

async def test_create_order():
    """测试创建订单流程"""
    print("=" * 60)
    print("测试创建支付订单流程")
    print("=" * 60)
    
    try:
        from backend.payment.services.wechat_pay_service import WeChatPayService
        from backend.passport.app.core.config import settings
        
        print("\n1. 测试微信支付服务初始化...")
        service = WeChatPayService()
        print(f"   [OK] 服务初始化成功")
        print(f"   - app_id: {bool(service.app_id)}")
        print(f"   - mch_id: {bool(service.mch_id)}")
        print(f"   - api_v3_key: {bool(service.api_v3_key)}")
        
        print("\n2. 测试创建订单（模拟）...")
        from decimal import Decimal
        
        result = await service.create_order(
            order_no="TEST_ORDER_123456",
            amount=Decimal("99.00"),
            description="测试订单",
            notify_url="https://test.com/callback"
        )
        
        print(f"   [结果] success={result.get('success')}")
        if result.get('success'):
            print(f"   [OK] 二维码URL: {result.get('qr_code_url', '')[:50]}...")
            print(f"   [OK] 支付号: {result.get('payment_no', '')}")
        else:
            print(f"   [失败] 错误: {result.get('error', '未知错误')}")
        
        print("\n3. 检查配置...")
        if not settings.WECHAT_PAY_APP_ID or not settings.WECHAT_PAY_MCH_ID or not settings.WECHAT_PAY_API_V3_KEY:
            print("   [警告] 微信支付配置不完整，将使用测试模式")
            print("   提示: 请在 .env 文件中配置微信支付参数")
        else:
            print("   [OK] 微信支付配置完整")
        
        return result.get('success', False)
        
    except Exception as e:
        print(f"\n[失败] 测试异常: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    print("开始测试支付订单创建流程...\n")
    success = asyncio.run(test_create_order())
    
    print("\n" + "=" * 60)
    if success:
        print("[成功] 测试通过，支付服务应该可以正常工作")
    else:
        print("[警告] 测试未完全通过，可能使用了测试模式")
        print("提示: 如果配置完整，请检查微信支付API密钥和证书")
    print("=" * 60)
    
    sys.exit(0 if success else 1)