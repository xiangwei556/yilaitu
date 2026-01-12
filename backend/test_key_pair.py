"""
检查应用公钥证书的详细信息
"""
import base64
import re
from cryptography import x509
from cryptography.hazmat.backends import default_backend
from cryptography.hazmat.primitives import serialization

# 读取应用公钥证书
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
    
    print("应用公钥证书信息：")
    print(f"Subject: {cert.subject}")
    print(f"Issuer: {cert.issuer}")
    print(f"Serial Number: {cert.serial_number}")
    print(f"Not Valid Before: {cert.not_valid_before}")
    print(f"Not Valid After: {cert.not_valid_after}")
    print()
    
    # 获取公钥
    public_key = cert.public_key()
    
    print("公钥信息：")
    print(f"类型: {type(public_key).__name__}")
    print(f"大小: {public_key.key_size} bits")
    print()
    
    # 将公钥转换为PEM格式
    public_key_pem = public_key.public_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PublicFormat.SubjectPublicKeyInfo
    )
    
    print("公钥（PEM格式）：")
    print(public_key_pem.decode('utf-8'))
    print()
    
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
    
    print("私钥信息：")
    print(f"类型: {type(private_key).__name__}")
    print(f"大小: {private_key.key_size} bits")
    print()
    
    # 从私钥提取公钥
    private_key_public_key = private_key.public_key()
    
    print("从私钥提取的公钥（PEM格式）：")
    private_key_public_pem = private_key_public_key.public_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PublicFormat.SubjectPublicKeyInfo
    )
    print(private_key_public_pem.decode('utf-8'))
    print()
    
    # 比较两个公钥
    print("比较两个公钥：")
    print(f"是否相同: {public_key_pem == private_key_public_pem}")
    print()
    
    if public_key_pem != private_key_public_pem:
        print("公钥不匹配！")
        print("证书中的公钥和私钥文件中的公钥不一致。")
    else:
        print("✓ 公钥匹配！证书和私钥文件是一对。")
