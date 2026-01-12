"""
测试修改后的支付宝根证书SN计算（直接导入模块）
"""
import sys
import os

# 设置Python路径
sys.path.insert(0, 'D:/trae_projects/image-edit/backend')

# 导入必要的模块
from dotenv import load_dotenv
load_dotenv()

# 测试根证书SN计算
print("=" * 100)
print("测试修改后的支付宝根证书SN计算")
print("=" * 100)
print()

# 读取根证书文件
root_cert_path = os.getenv('ALIPAY_ALIPAY_ROOT_CERT_PATH')
print(f"根证书路径: {root_cert_path}")
print()

import base64
import hashlib
import re
from cryptography import x509
from cryptography.hazmat.backends import default_backend

with open(root_cert_path, 'rb') as f:
    cert_data = f.read()

# 提取所有PEM证书块
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

# 支付宝官方认可的根证书CN列表
official_root_cert_cns = [
    "Ant Financial Certification Authority R1",
    "Ant Financial Certification Authority E1",
    "iTrusChina Class 2 Root CA - G3"
]

# 解析每个证书
cert_sns = []
for cert_match in cert_matches:
    # 提取证书内容（去掉BEGIN/END标记）
    cert_content = cert_match.replace('\n', '').replace('\r', '').replace(' ', '')
    cert_bytes = base64.b64decode(cert_content)

    # 解析X.509证书
    cert = x509.load_der_x509_certificate(cert_bytes, default_backend())

    # 获取证书的 Common Name (CN)
    cert_cn = None
    for attr in cert.subject:
        if attr.oid == x509.oid.NameOID.COMMON_NAME:
            cert_cn = attr.value
            break

    # 只处理支付宝官方认可的根证书
    if cert_cn not in official_root_cert_cns:
        print(f"跳过非官方根证书: {cert_cn}")
        continue

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
    cert_sns.append(md5_hash)
    print(f"根证书 [{cert_cn}] SN: {md5_hash}")

# 拼接所有根证书SN（用下划线分隔）
root_cert_sn = "_".join(cert_sns)

print()
print("=" * 100)
print("最终结果：")
print("=" * 100)
print(f"计算得到的根证书SN: {root_cert_sn}")
print(f"根证书SN长度: {len(root_cert_sn)}")
print()

# 验证是否正确
expected_sns = [
    "687b59193f3f462dd5336e5abf83c5d8",  # Ant Financial R1
    "8af620707e5ddd8c7e76747e86a604dc",  # Ant Financial E1
    "02941eef3187dddf3d3b83462e1dfcf6"   # iTrusChina
]

print("验证结果：")
print(f"是否包含所有官方根证书SN: {all(sn in root_cert_sn for sn in expected_sns)}")
print()

# 检查是否包含非官方证书SN
non_official_sn = "9e64d67d36446de33aae13a33a89e5a7"
print(f"是否包含非官方根证书SN ({non_official_sn}): {non_official_sn in root_cert_sn}")
print()

if root_cert_sn == "687b59193f3f462dd5336e5abf83c5d8_8af620707e5ddd8c7e76747e86a604dc_02941eef3187dddf3d3b83462e1dfcf6":
    print("✓ 根证书SN计算正确！")
else:
    print("✗ 根证书SN计算不正确")
    print(f"  期望: 687b59193f3f462dd5336e5abf83c5d8_8af620707e5ddd8c7e76747e86a604dc_02941eef3187dddf3d3b83462e1dfcf6")
    print(f"  实际: {root_cert_sn}")
