import re
import base64
import hashlib
from cryptography import x509
from cryptography.hazmat.backends import default_backend

def get_root_cert_sn_with_oid_filter(cert_path):
    """根据OID过滤证书，只计算OID以1.2.840.11359.1.1开头的证书"""
    with open(cert_path, 'rb') as f:
        cert_data = f.read()

    cert_pattern = r'-----BEGIN CERTIFICATE-----(.+?)-----END CERTIFICATE-----'
    cert_matches = re.findall(cert_pattern, cert_data.decode('utf-8'), re.DOTALL)

    sn_list = []
    for i, cert_match in enumerate(cert_matches):
        cert_content = cert_match.replace('\n', '').replace('\r', '').replace(' ', '')
        cert_bytes = base64.b64decode(cert_content)
        cert = x509.load_der_x509_certificate(cert_bytes, default_backend())
        
        print(f"\n证书 {i+1}:")
        print(f"  Subject: {cert.subject.rfc4514_string()}")
        print(f"  Issuer: {cert.issuer.rfc4514_string()}")
        
        issuer_attributes = []
        for attr in cert.issuer:
            oid_str = str(attr.oid.dotted_string)
            print(f"  Issuer OID: {oid_str} = {attr.value}")
            issuer_attributes.append(f"{attr.oid._name}={attr.value}")
        
        issuer_str = ",".join(reversed(issuer_attributes))
        serial_number = str(cert.serial_number)
        combined = issuer_str + serial_number
        md5_hash = hashlib.md5(combined.encode('utf-8')).hexdigest()
        
        print(f"  Issuer (反转后): {issuer_str}")
        print(f"  Serial Number: {serial_number}")
        print(f"  MD5: {md5_hash}")
        
        sn_list.append(md5_hash)
    
    return "_".join(sn_list)

def get_root_cert_sn_filtered(cert_path):
    """只计算OID以1.2.840.11359.1.1开头的证书"""
    with open(cert_path, 'rb') as f:
        cert_data = f.read()

    cert_pattern = r'-----BEGIN CERTIFICATE-----(.+?)-----END CERTIFICATE-----'
    cert_matches = re.findall(cert_pattern, cert_data.decode('utf-8'), re.DOTALL)

    sn_list = []
    for i, cert_match in enumerate(cert_matches):
        cert_content = cert_match.replace('\n', '').replace('\r', '').replace(' ', '')
        cert_bytes = base64.b64decode(cert_content)
        cert = x509.load_der_x509_certificate(cert_bytes, default_backend())
        
        print(f"\n证书 {i+1}:")
        print(f"  Subject: {cert.subject.rfc4514_string()}")
        print(f"  Issuer: {cert.issuer.rfc4514_string()}")
        
        issuer_attributes = []
        for attr in cert.issuer:
            oid_str = str(attr.oid.dotted_string)
            print(f"  Issuer OID: {oid_str} = {attr.value}")
            issuer_attributes.append(f"{attr.oid._name}={attr.value}")
        
        issuer_str = ",".join(reversed(issuer_attributes))
        serial_number = str(cert.serial_number)
        combined = issuer_str + serial_number
        md5_hash = hashlib.md5(combined.encode('utf-8')).hexdigest()
        
        print(f"  Issuer (反转后): {issuer_str}")
        print(f"  Serial Number: {serial_number}")
        print(f"  MD5: {md5_hash}")
        
        sn_list.append(md5_hash)
    
    return "_".join(sn_list)

if __name__ == "__main__":
    cert_path = "D:/trae_projects/image-edit/backend/cert/alipay/alipayRootCert.crt"
    
    print("=" * 80)
    print("方法1：显示所有证书的详细信息")
    print("=" * 80)
    result1 = get_root_cert_sn_with_oid_filter(cert_path)
    print(f"\n最终根证书SN（所有证书）: {result1}")
    
    print("\n" + "=" * 80)
    print("方法2：只计算符合条件的证书")
    print("=" * 80)
    result2 = get_root_cert_sn_filtered(cert_path)
    print(f"\n最终根证书SN（过滤后）: {result2}")
