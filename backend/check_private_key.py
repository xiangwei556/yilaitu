#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""检查私钥格式"""
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.backends import default_backend

private_key_path = r"D:\trae_projects\image-edit\backend\cert\alipay\app_private_key.pem"

print("检查私钥格式:")
print("=" * 80)

with open(private_key_path, 'rb') as f:
    private_key_data = f.read()

# 尝试加载私钥
try:
    private_key = serialization.load_pem_private_key(
        private_key_data,
        password=None,
        backend=default_backend()
    )
    
    print(f"私钥类型: {type(private_key).__name__}")
    print(f"私钥大小: {private_key.key_size} bits")
    
    # 获取私钥的PEM格式
    pem_data = private_key.private_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PrivateFormat.PKCS8,
        encryption_algorithm=serialization.NoEncryption()
    )
    
    print(f"\n私钥格式: PKCS#8")
    print(f"私钥内容（前100字符）: {pem_data.decode('utf-8')[:100]}")
    
    # 提取公钥
    public_key = private_key.public_key()
    public_key_pem = public_key.public_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PublicFormat.SubjectPublicKeyInfo
    )
    
    print(f"\n对应的公钥:")
    print(public_key_pem.decode('utf-8'))
    
except Exception as e:
    print(f"错误: {str(e)}")
    import traceback
    print(f"详细错误信息: {traceback.format_exc()}")
