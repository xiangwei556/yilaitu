#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""测试支付宝签名生成"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import json
from datetime import datetime
from backend.payment.services.alipay_service import AlipayService

service = AlipayService()

# 模拟创建订单的参数
biz_content = {
    "out_trade_no": "TEST_ORD20260110004118000019",
    "total_amount": "0.01",
    "subject": "测试订单",
    "product_code": "FAST_INSTANT_TRADE_PAY"
}

params = {
    "app_id": service.app_id,
    "method": "alipay.trade.precreate",
    "charset": "utf-8",
    "sign_type": service.sign_type,
    "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
    "version": "1.0",
    "notify_url": "https://zr848436ml96.vicp.fun/api/v1/payment/alipay/callback",
    "biz_content": json.dumps(biz_content, ensure_ascii=False)
}

# 添加证书序列号
if service.app_cert_path:
    app_cert_sn = service._get_app_cert_sn()
    if app_cert_sn:
        params["app_cert_sn"] = app_cert_sn

if service.alipay_root_cert_path:
    alipay_root_cert_sn = service._get_alipay_root_cert_sn()
    if alipay_root_cert_sn:
        params["alipay_root_cert_sn"] = alipay_root_cert_sn

print("支付宝签名测试:")
print("=" * 80)
print("参数:")
for key, value in sorted(params.items()):
    print(f"  {key}: {value}")
print()

# 生成签名
print("生成签名...")
sign = service._sign(params)
print(f"签名结果: {sign}")
print()

# 显示签名字符串
print("签名字符串生成逻辑:")
print("=" * 80)
sorted_params = sorted(params.items())
sign_str = "&".join([f"{k}={v}" for k, v in sorted_params if k not in ["sign"] and v])
print(f"签名字符串: {sign_str}")
print(f"签名字符串长度: {len(sign_str)}")
print()

# 显示支付宝期望的格式
print("支付宝官方文档示例:")
print("=" * 80)
print("app_id=2021006123642530&biz_content={\"out_trade_no\":\"TEST_ORD20260110004118000019\"}&charset=utf-8&method=alipay.trade.query&sign_type=RSA2&timestamp=2026-01-10 00:46:07&version=1.0")
