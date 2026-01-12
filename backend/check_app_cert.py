#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""检查应用证书详细信息"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from cryptography import x509
from cryptography.hazmat.backends import default_backend

cert_path = r"D:\trae_projects\image-edit\backend\cert\alipay\appCertPublicKey_2021006123642530.crt"

print("应用证书详细信息:")
print("=" * 80)

with open(cert_path, 'rb') as f:
    cert_data = f.read()

cert = x509.load_pem_x509_certificate(cert_data, default_backend())

print(f"证书主题 (Subject):")
print(f"  {cert.subject}")
print()

print(f"证书签发者 (Issuer):")
print(f"  {cert.issuer}")
print()

print(f"证书序列号 (Serial Number):")
print(f"  {cert.serial_number}")
print()

print(f"证书有效期:")
print(f"  生效时间: {cert.not_valid_before}")
print(f"  过期时间: {cert.not_valid_after}")
print()

print(f"证书公钥:")
print(f"  大小: {cert.public_key().key_size} bits")
print()

print(f"证书扩展信息:")
for extension in cert.extensions:
    print(f"  {extension.oid._name}: {extension.value}")
print()

print("重要提示:")
print("=" * 80)
print("1. 请确认这个证书已经上传到支付宝开发者平台")
print("2. 请确认支付宝开发者平台上的应用ID是: 2021006123642530")
print("3. 请确认证书没有过期")
print("4. 如果证书不匹配，请从支付宝开发者平台重新下载证书")
