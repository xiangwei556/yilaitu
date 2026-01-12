"""
测试支付API接口 - 用于诊断问题
"""
import sys
import os

# 添加项目根目录到路径
current_dir = os.path.dirname(os.path.abspath(__file__))
backend_dir = os.path.dirname(current_dir)
project_root = os.path.dirname(backend_dir)
sys.path.insert(0, project_root)
sys.path.insert(0, backend_dir)

def test_imports():
    """测试所有导入"""
    print("=" * 60)
    print("测试导入")
    print("=" * 60)
    
    errors = []
    
    try:
        from backend.payment.models.payment import PaymentRecord
        print("[OK] PaymentRecord 导入成功")
    except Exception as e:
        print(f"[失败] PaymentRecord 导入失败: {e}")
        errors.append(f"PaymentRecord: {e}")
    
    try:
        from backend.payment.services.order_service import OrderService
        print("[OK] OrderService 导入成功")
    except Exception as e:
        print(f"[失败] OrderService 导入失败: {e}")
        errors.append(f"OrderService: {e}")
    
    try:
        from backend.payment.services.business_service import BusinessService
        print("[OK] BusinessService 导入成功")
    except Exception as e:
        print(f"[失败] BusinessService 导入失败: {e}")
        errors.append(f"BusinessService: {e}")
    
    try:
        from backend.payment.services.wechat_pay_service import WeChatPayService
        print("[OK] WeChatPayService 导入成功")
        
        # 测试初始化
        service = WeChatPayService()
        print(f"[OK] WeChatPayService 初始化成功")
        print(f"  - app_id: {bool(service.app_id)}")
        print(f"  - mch_id: {bool(service.mch_id)}")
        print(f"  - api_v3_key: {bool(service.api_v3_key)}")
    except Exception as e:
        print(f"[失败] WeChatPayService 导入/初始化失败: {e}")
        errors.append(f"WeChatPayService: {e}")
    
    try:
        from backend.payment.services.alipay_service import AlipayService
        print("[OK] AlipayService 导入成功")
    except Exception as e:
        print(f"[失败] AlipayService 导入失败: {e}")
        errors.append(f"AlipayService: {e}")
    
    try:
        from backend.payment.api.payment import router
        print("[OK] Payment API router 导入成功")
    except Exception as e:
        print(f"[失败] Payment API router 导入失败: {e}")
        errors.append(f"Payment API: {e}")
    
    try:
        from backend.order.models.order import Order
        print("[OK] Order 模型导入成功")
    except Exception as e:
        print(f"[失败] Order 模型导入失败: {e}")
        errors.append(f"Order: {e}")
    
    try:
        from backend.membership.models.membership import MembershipPackage
        print("[OK] MembershipPackage 导入成功")
    except Exception as e:
        print(f"[失败] MembershipPackage 导入失败: {e}")
        errors.append(f"MembershipPackage: {e}")
    
    try:
        from backend.points.models.points import PointsPackage
        print("[OK] PointsPackage 导入成功")
    except Exception as e:
        print(f"[失败] PointsPackage 导入失败: {e}")
        errors.append(f"PointsPackage: {e}")
    
    print("\n" + "=" * 60)
    if errors:
        print(f"[失败] 发现 {len(errors)} 个导入错误:")
        for error in errors:
            print(f"  - {error}")
        return False
    else:
        print("[成功] 所有导入测试通过")
        return True

def test_config():
    """测试配置"""
    print("\n" + "=" * 60)
    print("测试配置")
    print("=" * 60)
    
    try:
        from backend.passport.app.core.config import settings
        
        print(f"[配置] WECHAT_PAY_APP_ID: {bool(settings.WECHAT_PAY_APP_ID)}")
        print(f"[配置] WECHAT_PAY_MCH_ID: {bool(settings.WECHAT_PAY_MCH_ID)}")
        print(f"[配置] WECHAT_PAY_API_V3_KEY: {bool(settings.WECHAT_PAY_API_V3_KEY)}")
        print(f"[配置] WECHAT_PAY_NOTIFY_URL: {settings.WECHAT_PAY_NOTIFY_URL}")
        
        if not settings.WECHAT_PAY_APP_ID or not settings.WECHAT_PAY_MCH_ID or not settings.WECHAT_PAY_API_V3_KEY:
            print("[警告] 微信支付配置不完整，将使用测试模式")
        else:
            print("[OK] 微信支付配置完整")
        
        return True
    except Exception as e:
        print(f"[失败] 配置测试失败: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_database():
    """测试数据库连接"""
    print("\n" + "=" * 60)
    print("测试数据库")
    print("=" * 60)
    
    try:
        from backend.passport.app.db.session import SessionLocal, engine
        from backend.payment.models.payment import PaymentRecord
        from backend.order.models.order import Order
        from sqlalchemy import inspect
        
        # 测试连接
        db = SessionLocal()
        try:
            db.execute("SELECT 1")
            print("[OK] 数据库连接成功")
        except Exception as e:
            print(f"[失败] 数据库连接失败: {e}")
            return False
        finally:
            db.close()
        
        # 检查表是否存在
        inspector = inspect(engine)
        tables = inspector.get_table_names()
        
        if 'payment_records' in tables:
            print("[OK] payment_records 表存在")
        else:
            print("[警告] payment_records 表不存在，需要执行数据库迁移")
        
        if 'orders' in tables:
            print("[OK] orders 表存在")
            # 检查字段
            columns = [col['name'] for col in inspector.get_columns('orders')]
            required_fields = ['payment_no', 'qr_code_url', 'expire_at']
            missing_fields = [f for f in required_fields if f not in columns]
            if missing_fields:
                print(f"[警告] orders 表缺少字段: {missing_fields}")
            else:
                print("[OK] orders 表字段完整")
        else:
            print("[失败] orders 表不存在")
            return False
        
        return True
    except Exception as e:
        print(f"[失败] 数据库测试失败: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    print("开始支付系统诊断测试...\n")
    
    import_ok = test_imports()
    config_ok = test_config()
    db_ok = test_database()
    
    print("\n" + "=" * 60)
    print("诊断结果")
    print("=" * 60)
    
    if import_ok and config_ok and db_ok:
        print("[成功] 所有测试通过，支付系统应该可以正常工作")
        sys.exit(0)
    else:
        print("[失败] 发现问题，请检查上述错误信息")
        if not db_ok:
            print("\n建议: 运行数据库迁移脚本")
            print("  python backend/payment/safe_migration.py")
        sys.exit(1)