"""
测试根证书序列号计算
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from payment.services.alipay_service import AlipayService

service = AlipayService()

print(f"根证书路径: {service.alipay_root_cert_path}")
print(f"根证书路径是否存在: {os.path.exists(service.alipay_root_cert_path) if service.alipay_root_cert_path else 'N/A'}")
print()

alipay_root_cert_sn = service._get_alipay_root_cert_sn()
print(f"根证书SN: {alipay_root_cert_sn}")
print(f"根证书SN长度: {len(alipay_root_cert_sn)}")
print()

app_cert_sn = service._get_app_cert_sn()
print(f"应用证书SN: {app_cert_sn}")
print(f"应用证书SN长度: {len(app_cert_sn)}")
