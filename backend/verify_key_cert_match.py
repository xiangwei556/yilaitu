#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""验证私钥和证书是否匹配"""
from cryptography import x509
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.backends import default_backend

private_key_path = r"D:\trae_projects\image-edit\backend\cert\alipay\app_private_key.pem"
cert_path = r"D:\trae_projects\image-edit\backend\cert\alipay\appCertPublicKey_2021006123642530.crt"

print("验证私钥和证书是否匹配:")
print("=" * 80)

# 读取私钥
with open(private_key_path, 'rb') as f:
    private_key_data = f.read()

# 读取证书
with open(cert_path, 'rb') as f:
    cert_data = f.read()

# 加载私钥
from cryptography.hazmat.primitives import serialization
private_key = serialization.load_pem_private_key(
    private_key_data,
    password=None,
    backend=default_backend()
)

# 加载证书
cert = x509.load_pem_x509_certificate(cert_data, default_backend())

# 获取私钥的公钥
private_public_key = private_key.public_key()

# 获取证书的公钥
cert_public_key = cert.public_key()

# 比较两个公钥
from cryptography.hazmat.primitives.asymmetric import rsa

if isinstance(private_public_key, rsa.RSAPublicKey) and isinstance(cert_public_key, rsa.RSAPublicKey):
    # 比较公钥的模数和指数
    private_numbers = private_public_key.public_numbers()
    cert_numbers = cert_public_key.public_numbers()
    
    print(f"私钥公钥模数: {private_numbers.n}")
    print(f"证书公钥模数: {cert_numbers.n}")
    print(f"私钥公钥指数: {private_numbers.e}")
    print(f"证书公钥指数: {cert_numbers.e}")
    
    if private_numbers.n == cert_numbers.n and private_numbers.e == cert_numbers.e:
        print("\n✓ 私钥和证书匹配！")
    else:
        print("\n✗ 私钥和证书不匹配！")
else:
    print("\n✗ 无法比较公钥类型")

# 显示证书主题
print(f"\n证书主题: {cert.subject}")
print(f"证书签发者: {cert.issuer}")
