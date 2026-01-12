"""
测试修改后的根证书SN计算
"""
import sys
sys.path.insert(0, 'D:/trae_projects/image-edit/backend')

from payment.services.alipay_service import AlipayService
import os

# 从环境变量加载配置
from dotenv import load_dotenv
load_dotenv()

# 创建 AlipayService 实例
alipay_service = AlipayService(
    app_id=os.getenv('ALIPAY_APP_ID'),
    private_key_path=os.getenv('ALIPAY_PRIVATE_KEY_PATH'),
    app_cert_path=os.getenv('ALIPAY_APP_CERT_PATH'),
    alipay_public_cert_path=os.getenv('ALIPAY_PUBLIC_CERT_PATH'),
    alipay_root_cert_path=os.getenv('ALIPAY_ROOT_CERT_PATH')
)

# 测试获取根证书SN
print("=" * 100)
print("测试修改后的根证书SN计算")
print("=" * 100)
print()

root_cert_sn = alipay_service._get_alipay_root_cert_sn()
print(f"计算得到的根证书SN: {root_cert_sn}")
print()

# 验证是否正确
expected_sns = [
    "687b59193f3f462dd5336e5abf83c5d8",  # Ant Financial R1
    "8af620707e5ddd8c7e76747e86a604dc",  # Ant Financial E1
    "02941eef3187dddf3d3b83462e1dfcf6"   # iTrusChina
]

print("验证结果：")
print(f"是否包含所有官方根证书SN: {all(sn in root_cert_sn for sn in expected_sns)}")
print()

# 检查是否包含非官方证书SN
non_official_sn = "9e64d67d36446de33aae13a33a89e5a7"
print(f"是否包含非官方根证书SN ({non_official_sn}): {non_official_sn in root_cert_sn}")
print()

# 打印各个SN
print("各个官方根证书SN：")
for i, sn in enumerate(expected_sns):
    print(f"  {i+1}. {sn}")
print()

# 测试完整的签名生成
print("=" * 100)
print("测试完整的签名生成")
print("=" * 100)
print()

test_params = {
    "app_id": os.getenv('ALIPAY_APP_ID'),
    "method": "alipay.trade.page.pay",
    "charset": "utf-8",
    "sign_type": "RSA2",
    "timestamp": "2024-01-10 12:00:00",
    "version": "1.0",
    "notify_url": "https://example.com/notify",
    "biz_content": '{"out_trade_no":"test123","total_amount":"0.01","subject":"测试商品"}'
}

try:
    sign = alipay_service._sign(test_params)
    print(f"签名生成成功")
    print(f"签名: {sign[:50]}...")
    print()
    
    # 获取应用证书SN
    app_cert_sn = alipay_service._get_app_cert_sn()
    print(f"应用证书SN: {app_cert_sn}")
    print(f"根证书SN: {root_cert_sn}")
    print()
    
except Exception as e:
    print(f"签名生成失败: {e}")
    import traceback
    print(traceback.format_exc())
