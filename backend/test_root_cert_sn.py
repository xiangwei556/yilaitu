import re
import base64
import hashlib
from cryptography import x509
from cryptography.hazmat.backends import default_backend

def get_root_cert_sn(cert_path):
    """获取支付宝根证书序列号"""
    with open(cert_path, 'rb') as f:
        cert_data = f.read()

    # 提取所有PEM证书块
    cert_pattern = r'-----BEGIN CERTIFICATE-----(.+?)-----END CERTIFICATE-----'
    cert_matches = re.findall(cert_pattern, cert_data.decode('utf-8'), re.DOTALL)

    if not cert_matches:
        print(f"无法解析根证书文件: {cert_path}")
        return ""

    # 计算每个证书的MD5序列号
    sn_list = []
    for i, cert_match in enumerate(cert_matches):
        # 提取证书内容（去掉BEGIN/END标记）
        cert_content = cert_match.replace('\n', '').replace('\r', '').replace(' ', '')
        cert_bytes = base64.b64decode(cert_content)
        
        # 解析X.509证书
        cert = x509.load_der_x509_certificate(cert_bytes, default_backend())
        
        # 获取签发机构名称（issuer）并反转
        issuer_attributes = []
        for attr in cert.issuer:
            issuer_attributes.append(f"{attr.oid._name}={attr.value}")
        
        # 反转issuer数组并转换为字符串
        issuer_str = ",".join(reversed(issuer_attributes))
        
        # 获取证书序列号（serialNumber）
        serial_number = str(cert.serial_number)
        
        # 拼接反转后的issuer和序列号
        combined = issuer_str + serial_number
        
        # 计算MD5
        md5_hash = hashlib.md5(combined.encode('utf-8')).hexdigest()
        sn_list.append(md5_hash)
        
        print(f"\n证书 {i+1}:")
        print(f"Issuer (反转前): {','.join(issuer_attributes)}")
        print(f"Issuer (反转后): {issuer_str}")
        print(f"Serial Number: {serial_number}")
        print(f"Combined: {combined}")
        print(f"MD5: {md5_hash}")

    return "_".join(sn_list)

if __name__ == "__main__":
    cert_path = "D:/trae_projects/image-edit/backend/cert/alipay/alipayRootCert.crt"
    root_cert_sn = get_root_cert_sn(cert_path)
    print(f"\n最终根证书SN: {root_cert_sn}")