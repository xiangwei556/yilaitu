"""
检查支付宝根证书的序列号
"""
import base64
import re
import hashlib
from cryptography import x509
from cryptography.hazmat.backends import default_backend

# 读取支付宝根证书
root_cert_path = "D:/trae_projects/image-edit/backend/cert/alipay/alipayRootCert.crt"
with open(root_cert_path, 'rb') as f:
    cert_data = f.read()

print("支付宝根证书文件内容：")
print(cert_data.decode('utf-8'))
print()

# 提取PEM证书块
cert_pattern = r'-----BEGIN CERTIFICATE-----(.+?)-----END CERTIFICATE-----'
cert_matches = re.findall(cert_pattern, cert_data.decode('utf-8'), re.DOTALL)

print(f"找到 {len(cert_matches)} 个证书")
print()

# OID到短名称的映射
oid_short_names = {
    x509.oid.NameOID.COUNTRY_NAME: "C",
    x509.oid.NameOID.STATE_OR_PROVINCE_NAME: "ST",
    x509.oid.NameOID.LOCALITY_NAME: "L",
    x509.oid.NameOID.ORGANIZATION_NAME: "O",
    x509.oid.NameOID.ORGANIZATIONAL_UNIT_NAME: "OU",
    x509.oid.NameOID.COMMON_NAME: "CN",
    x509.oid.NameOID.EMAIL_ADDRESS: "emailAddress",
    x509.oid.NameOID.SERIAL_NUMBER: "serialNumber",
    x509.oid.NameOID.TITLE: "title",
    x509.oid.NameOID.GIVEN_NAME: "givenName",
    x509.oid.NameOID.SURNAME: "surname",
    x509.oid.NameOID.PSEUDONYM: "pseudonym",
    x509.oid.NameOID.GENERATION_QUALIFIER: "generationQualifier",
    x509.oid.NameOID.DN_QUALIFIER: "dnQualifier",
}

# 解析每个证书
cert_sns = []
for i, cert_match in enumerate(cert_matches):
    print(f"证书 {i+1}:")
    
    # 提取证书内容（去掉BEGIN/END标记）
    cert_content = cert_match.replace('\n', '').replace('\r', '').replace(' ', '')
    cert_bytes = base64.b64decode(cert_content)
    
    # 解析X.509证书
    cert = x509.load_der_x509_certificate(cert_bytes, default_backend())
    
    print(f"  Subject: {cert.subject}")
    print(f"  Issuer: {cert.issuer}")
    print(f"  Serial Number: {cert.serial_number}")
    
    # 获取签发机构名称（issuer）并反转
    issuer_attributes = []
    for attr in cert.issuer:
        short_name = oid_short_names.get(attr.oid, attr.oid._name)
        issuer_attributes.append(f"{short_name}={attr.value}")
    
    # 反转issuer数组并转换为字符串
    issuer_str = ",".join(reversed(issuer_attributes))
    
    # 获取证书序列号（serialNumber）
    serial_number = str(cert.serial_number)
    
    # 拼接反转后的issuer和序列号
    combined = issuer_str + serial_number
    
    # 计算MD5
    md5_hash = hashlib.md5(combined.encode('utf-8')).hexdigest()
    
    print(f"  Issuer (reversed): {issuer_str}")
    print(f"  Certificate SN (MD5): {md5_hash}")
    print()
    
    cert_sns.append(md5_hash)

# 拼接所有根证书SN（用下划线分隔）
root_cert_sn = "_".join(cert_sns)

print("=" * 80)
print(f"计算得到的根证书SN: {root_cert_sn}")
print(f"硬编码的根证书SN:   687b59193f3f462dd5336e5abf83c5d8_02941eef3187dddf3d3b83462e1dfcf6")
print(f"是否匹配: {root_cert_sn == '687b59193f3f462dd5336e5abf83c5d8_02941eef3187dddf3d3b83462e1dfcf6'}")
print("=" * 80)
