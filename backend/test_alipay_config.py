#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""测试支付宝配置加载"""
import os
import sys

# 添加项目根目录到Python路径
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.passport.app.core.config import settings

print("支付宝配置检查:")
print("=" * 80)
print(f"ALIPAY_APP_ID: {settings.ALIPAY_APP_ID}")
print(f"ALIPAY_APP_CERT_PATH: {settings.ALIPAY_APP_CERT_PATH}")
print(f"ALIPAY_ALIPAY_CERT_PATH: {settings.ALIPAY_ALIPAY_CERT_PATH}")
print(f"ALIPAY_ALIPAY_ROOT_CERT_PATH: {settings.ALIPAY_ALIPAY_ROOT_CERT_PATH}")
print(f"ALIPAY_PRIVATE_KEY_PATH: {settings.ALIPAY_PRIVATE_KEY_PATH}")
print()

print("证书文件存在性检查:")
print("=" * 80)
print(f"应用证书存在: {os.path.exists(settings.ALIPAY_APP_CERT_PATH) if settings.ALIPAY_APP_CERT_PATH else False}")
print(f"支付宝证书存在: {os.path.exists(settings.ALIPAY_ALIPAY_CERT_PATH) if settings.ALIPAY_ALIPAY_CERT_PATH else False}")
print(f"支付宝根证书存在: {os.path.exists(settings.ALIPAY_ALIPAY_ROOT_CERT_PATH) if settings.ALIPAY_ALIPAY_ROOT_CERT_PATH else False}")
print(f"私钥文件存在: {os.path.exists(settings.ALIPAY_PRIVATE_KEY_PATH) if settings.ALIPAY_PRIVATE_KEY_PATH else False}")
print()

print("测试AlipayService初始化:")
print("=" * 80)
from backend.payment.services.alipay_service import AlipayService

service = AlipayService()
print(f"service.app_cert_path: {service.app_cert_path}")
print(f"service.alipay_cert_path: {service.alipay_cert_path}")
print(f"service.alipay_root_cert_path: {service.alipay_root_cert_path}")
print(f"service.app_private_key_path: {service.app_private_key_path}")
print()

print("测试证书SN计算:")
print("=" * 80)
app_cert_sn = service._get_app_cert_sn()
print(f"应用证书SN: {app_cert_sn}")

root_cert_sn = service._get_alipay_root_cert_sn()
print(f"根证书SN: {root_cert_sn}")
