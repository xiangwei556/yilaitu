"""
测试支付宝签名算法
"""
import base64
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import padding
from cryptography.hazmat.backends import default_backend

# 读取私钥
private_key_path = "D:/trae_projects/image-edit/backend/cert/alipay/app_private_key.pem"
with open(private_key_path, 'rb') as f:
    private_key_data = f.read()

# 加载私钥
private_key = serialization.load_pem_private_key(
    private_key_data,
    password=None,
    backend=default_backend()
)

print("私钥加载成功！")
print(f"私钥类型: {type(private_key).__name__}")
print(f"私钥大小: {private_key.key_size} bits")
print()

# 测试签名字符串
sign_str = "alipay_root_cert_sn=687b59193f3f462dd5336e5abf83c5d8_02941eef3187dddf3d3b83462e1dfcf6&app_cert_sn=e131b05741200b0585b2038c23782398&app_id=2021006123642530&biz_content={\"out_trade_no\": \"ORD20260110010333000019\", \"total_amount\": \"0.10\", \"subject\": \"专业会员\", \"product_code\": \"FAST_INSTANT_TRADE_PAY\"}&charset=utf-8&method=alipay.trade.precreate&notify_url=https://zr848436ml96.vicp.fun/api/v1/payment/alipay/callback&sign_type=RSA2&timestamp=2026-01-10 01:03:33&version=1.0"

print("签名字符串：")
print(sign_str)
print()

# 生成签名
signature = private_key.sign(
    sign_str.encode('utf-8'),
    padding.PKCS1v15(),
    hashes.SHA256()
)

# Base64编码
signature_b64 = base64.b64encode(signature).decode('utf-8')

print("生成的签名（Base64）：")
print(signature_b64)
print(f"签名长度: {len(signature_b64)}")
print()

# 验证签名
try:
    # 读取应用公钥证书
    from cryptography import x509
    import re

    app_cert_path = "D:/trae_projects/image-edit/backend/cert/alipay/appCertPublicKey_2021006123642530.crt"
    with open(app_cert_path, 'rb') as f:
        cert_data = f.read()

    # 提取PEM证书块
    cert_pattern = r'-----BEGIN CERTIFICATE-----(.+?)-----END CERTIFICATE-----'
    cert_match = re.search(cert_pattern, cert_data.decode('utf-8'), re.DOTALL)
    if cert_match:
        cert_content = cert_match.group(1).replace('\n', '').replace('\r', '').replace(' ', '')
        cert_bytes = base64.b64decode(cert_content)
        
        # 解析X.509证书
        cert = x509.load_der_x509_certificate(cert_bytes, default_backend())
        
        # 获取公钥
        public_key = cert.public_key()
        
        print("应用公钥证书加载成功！")
        print(f"公钥类型: {type(public_key).__name__}")
        print(f"公钥大小: {public_key.key_size} bits")
        print()
        
        # 验证签名
        public_key.verify(
            signature,
            sign_str.encode('utf-8'),
            padding.PKCS1v15(),
            hashes.SHA256()
        )
        
        print("✓ 签名验证成功！私钥和公钥匹配！")
        
    else:
        print("无法解析应用公钥证书")
        
except Exception as e:
    print(f"✗ 签名验证失败: {str(e)}")
    import traceback
    traceback.print_exc()
