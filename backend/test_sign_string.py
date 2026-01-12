#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""测试支付宝签名生成 - 验证签名字符串格式"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import json
from datetime import datetime
from backend.payment.services.alipay_service import AlipayService

service = AlipayService()

# 模拟查询订单的参数（从日志中提取）
biz_content = {
    "out_trade_no": "TEST_ORD20260110004118000019"
}

params = {
    "app_id": service.app_id,
    "method": "alipay.trade.query",
    "charset": "utf-8",
    "sign_type": service.sign_type,
    "timestamp": "2026-01-10 00:53:32",
    "version": "1.0",
    "biz_content": json.dumps(biz_content, ensure_ascii=False)
}

# 添加证书序列号
if service.app_cert_path:
    app_cert_sn = service._get_app_cert_sn()
    if app_cert_sn:
        params["app_cert_sn"] = app_cert_sn
        print(f"应用证书SN: {app_cert_sn}")

if service.alipay_root_cert_path:
    alipay_root_cert_sn = service._get_alipay_root_cert_sn()
    if alipay_root_cert_sn:
        params["alipay_root_cert_sn"] = alipay_root_cert_sn
        print(f"根证书SN: {alipay_root_cert_sn}")

print("\n参数列表:")
for k, v in sorted(params.items()):
    print(f"  {k}={v}")

# 生成签名
sign = service._sign(params)
print(f"\n生成的签名: {sign}")

# 手动计算签名字符串（排除sign、app_cert_sn、alipay_root_cert_sn）
sorted_params = sorted(params.items())
sign_str = "&".join([f"{k}={v}" for k, v in sorted_params if k not in ["sign", "app_cert_sn", "alipay_root_cert_sn"] and v])
print(f"\n签名字符串:")
print(sign_str)

# 对比网关生成的验签字符串
gateway_sign_str = "app_id=2021006123642530&biz_content={\"out_trade_no\": \"TEST_ORD20260110004118000019\"}&charset=utf-8&method=alipay.trade.query&sign_type=RSA2&timestamp=2026-01-10 00:53:32&version=1.0"
print(f"\n网关验签字符串:")
print(gateway_sign_str)

print(f"\n签名字符串对比:")
print(f"我们生成的: {sign_str}")
print(f"网关期望的:  {gateway_sign_str}")
print(f"是否一致: {sign_str == gateway_sign_str}")
