"""
测试支付宝签名字符串生成
"""
import json
from urllib.parse import quote_plus

# 模拟创建订单时的参数
biz_content = {
    "out_trade_no": "ORD20260110010333000019",
    "total_amount": "0.10",
    "subject": "专业会员",
    "product_code": "FAST_INSTANT_TRADE_PAY"
}

params = {
    "app_id": "2021006123642530",
    "method": "alipay.trade.precreate",
    "charset": "utf-8",
    "sign_type": "RSA2",
    "timestamp": "2026-01-10 01:03:33",
    "version": "1.0",
    "notify_url": "https://zr848436ml96.vicp.fun/api/v1/payment/alipay/callback",
    "biz_content": json.dumps(biz_content, ensure_ascii=False),
    "app_cert_sn": "e131b05741200b0585b2038c23782398",
    "alipay_root_cert_sn": "687b59193f3f462dd5336e5abf83c5d8_02941eef3187dddf3d3b83462e1dfcf6"
}

# 排序参数（只排除sign）
sorted_params = sorted(params.items())
sign_str = "&".join([f"{k}={v}" for k, v in sorted_params if k != "sign" and v])

print("我们的签名字符串：")
print(sign_str)
print()

# 网关生成的验签字符串（从错误日志中提取）
gateway_sign_str = "alipay_root_cert_sn=687b59193f3f462dd5336e5abf83c5d8_02941eef3187dddf3d3b83462e1dfcf6&app_cert_sn=e131b05741200b0585b2038c23782398&app_id=2021006123642530&biz_content={\"out_trade_no\": \"ORD20260110010333000019\", \"total_amount\": \"0.10\", \"subject\": \"专业会员\", \"product_code\": \"FAST_INSTANT_TRADE_PAY\"}&charset=utf-8&method=alipay.trade.precreate&notify_url=https://zr848436ml96.vicp.fun/api/v1/payment/alipay/callback&sign_type=RSA2&timestamp=2026-01-10 01:03:33&version=1.0"

print("网关的验签字符串：")
print(gateway_sign_str)
print()

# 比较两个字符串
print("比较结果：")
print(f"长度是否相同: {len(sign_str) == len(gateway_sign_str)}")
print(f"字符串是否相同: {sign_str == gateway_sign_str}")
print()

# 找出差异
if sign_str != gateway_sign_str:
    print("差异分析：")
    # 分割成参数对
    our_params = sign_str.split('&')
    gateway_params = gateway_sign_str.split('&')
    
    print(f"我们的参数数量: {len(our_params)}")
    print(f"网关的参数数量: {len(gateway_params)}")
    print()
    
    # 逐个比较
    for i, (our_param, gateway_param) in enumerate(zip(our_params, gateway_params)):
        if our_param != gateway_param:
            print(f"参数 {i} 不同:")
            print(f"  我们: {our_param}")
            print(f"  网关: {gateway_param}")
            print()
