"""
测试支付配置是否正确加载
"""
import sys
import os

# 添加项目根目录到路径
project_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, project_root)

from backend.passport.app.core.config import settings

def test_payment_config():
    """测试支付配置"""
    print("=" * 60)
    print("支付配置检查")
    print("=" * 60)
    
    configs = {
        "微信支付": {
            "WECHAT_PAY_APP_ID": settings.WECHAT_PAY_APP_ID,
            "WECHAT_PAY_MCH_ID": settings.WECHAT_PAY_MCH_ID,
            "WECHAT_PAY_API_KEY": settings.WECHAT_PAY_API_KEY,
            "WECHAT_PAY_API_V3_KEY": settings.WECHAT_PAY_API_V3_KEY,
            "WECHAT_PAY_NOTIFY_URL": settings.WECHAT_PAY_NOTIFY_URL,
        },
        "支付宝": {
            "ALIPAY_APP_ID": settings.ALIPAY_APP_ID,
            "ALIPAY_PRIVATE_KEY": "已配置" if settings.ALIPAY_PRIVATE_KEY else "未配置",
            "ALIPAY_PUBLIC_KEY": "已配置" if settings.ALIPAY_PUBLIC_KEY else "未配置",
            "ALIPAY_NOTIFY_URL": settings.ALIPAY_NOTIFY_URL,
            "ALIPAY_GATEWAY": settings.ALIPAY_GATEWAY,
        },
        "订单配置": {
            "ORDER_EXPIRE_MINUTES": settings.ORDER_EXPIRE_MINUTES,
            "QR_CODE_EXPIRE_MINUTES": settings.QR_CODE_EXPIRE_MINUTES,
            "PAYMENT_QUERY_RETRY_MAX": settings.PAYMENT_QUERY_RETRY_MAX,
        }
    }
    
    all_ok = True
    for category, config in configs.items():
        print(f"\n[{category}]")
        for key, value in config.items():
            if value:
                status = "[OK]"
                print(f"  {status} {key}: {value if len(str(value)) < 50 else str(value)[:50] + '...'}")
            else:
                status = "[未配置]"
                all_ok = False
                print(f"  {status} {key}: {value}")
    
    print("\n" + "=" * 60)
    if all_ok:
        print("[成功] 所有支付配置已正确设置！")
    else:
        print("[警告] 部分配置未设置，请检查 .env 文件")
    print("=" * 60)
    
    return all_ok

if __name__ == "__main__":
    success = test_payment_config()
    sys.exit(0 if success else 1)