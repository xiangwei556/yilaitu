#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""测试应用证书序列号计算"""
import hashlib
import re
import base64
from cryptography import x509
from cryptography.hazmat.backends import default_backend

cert_path = r"D:\trae_projects\image-edit\backend\cert\alipay\appCertPublicKey_2021006123642530.crt"

print(f"证书路径: {cert_path}")
print("=" * 80)

try:
    with open(cert_path, 'rb') as f:
        cert_data = f.read()

    print(f"证书文件大小: {len(cert_data)} bytes")
    print(f"证书文件内容前200字符: {cert_data[:200]}")
    print()

    # 提取PEM证书块
    cert_pattern = r'-----BEGIN CERTIFICATE-----(.+?)-----END CERTIFICATE-----'
    cert_match = re.search(cert_pattern, cert_data.decode('utf-8'), re.DOTALL)
    if not cert_match:
        print("无法解析证书文件")
        exit(1)

    # 提取证书内容（去掉BEGIN/END标记）
    cert_content = cert_match.group(1).replace('\n', '').replace('\r', '').replace(' ', '')
    print(f"证书内容长度: {len(cert_content)}")
    print(f"证书内容前100字符: {cert_content[:100]}")
    print()

    cert_bytes = base64.b64decode(cert_content)
    print(f"解码后证书字节长度: {len(cert_bytes)}")
    print()

    # 解析X.509证书
    cert = x509.load_der_x509_certificate(cert_bytes, default_backend())
    print(f"证书主题: {cert.subject}")
    print(f"证书签发者: {cert.issuer}")
    print(f"证书序列号: {cert.serial_number}")
    print()

    # 获取签发机构名称（issuer）并反转
    issuer_attributes = []
    for attr in cert.issuer:
        print(f"Issuer属性: {attr.oid._name} = {attr.value}")
        issuer_attributes.append(f"{attr.oid._name}={attr.value}")

    print()
    print(f"Issuer属性数组: {issuer_attributes}")
    print()

    # 反转issuer数组并转换为字符串
    issuer_str = ",".join(reversed(issuer_attributes))
    print(f"反转后的Issuer字符串: {issuer_str}")
    print()

    # 获取证书序列号（serialNumber）
    serial_number = str(cert.serial_number)
    print(f"序列号: {serial_number}")
    print()

    # 拼接反转后的issuer和序列号
    combined = issuer_str + serial_number
    print(f"拼接后的字符串: {combined}")
    print(f"拼接后字符串长度: {len(combined)}")
    print()

    # 计算MD5
    md5_hash = hashlib.md5(combined.encode('utf-8')).hexdigest()
    print(f"MD5哈希: {md5_hash}")
    print()

    print("=" * 80)
    print(f"最终应用证书序列号: {md5_hash}")

except Exception as e:
    print(f"错误: {str(e)}")
    import traceback
    print(f"详细错误信息: {traceback.format_exc()}")
