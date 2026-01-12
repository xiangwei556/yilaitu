import re
import base64
import hashlib
from cryptography import x509
from cryptography.hazmat.backends import default_backend

def get_root_cert_sn_v1(cert_path):
    """方法1：使用当前的实现"""
    with open(cert_path, 'rb') as f:
        cert_data = f.read()

    cert_pattern = r'-----BEGIN CERTIFICATE-----(.+?)-----END CERTIFICATE-----'
    cert_matches = re.findall(cert_pattern, cert_data.decode('utf-8'), re.DOTALL)

    sn_list = []
    for cert_match in cert_matches:
        cert_content = cert_match.replace('\n', '').replace('\r', '').replace(' ', '')
        cert_bytes = base64.b64decode(cert_content)
        cert = x509.load_der_x509_certificate(cert_bytes, default_backend())
        
        issuer_attributes = []
        for attr in cert.issuer:
            issuer_attributes.append(f"{attr.oid._name}={attr.value}")
        
        issuer_str = ",".join(reversed(issuer_attributes))
        serial_number = str(cert.serial_number)
        combined = issuer_str + serial_number
        md5_hash = hashlib.md5(combined.encode('utf-8')).hexdigest()
        sn_list.append(md5_hash)
    
    return "_".join(sn_list)

def get_root_cert_sn_v2(cert_path):
    """方法2：使用OID的短名称"""
    with open(cert_path, 'rb') as f:
        cert_data = f.read()

    cert_pattern = r'-----BEGIN CERTIFICATE-----(.+?)-----END CERTIFICATE-----'
    cert_matches = re.findall(cert_pattern, cert_data.decode('utf-8'), re.DOTALL)

    sn_list = []
    for cert_match in cert_matches:
        cert_content = cert_match.replace('\n', '').replace('\r', '').replace(' ', '')
        cert_bytes = base64.b64decode(cert_content)
        cert = x509.load_der_x509_certificate(cert_bytes, default_backend())
        
        issuer_attributes = []
        for attr in cert.issuer:
            oid_str = str(attr.oid.dotted_string)
            issuer_attributes.append(f"{oid_str}={attr.value}")
        
        issuer_str = ",".join(reversed(issuer_attributes))
        serial_number = str(cert.serial_number)
        combined = issuer_str + serial_number
        md5_hash = hashlib.md5(combined.encode('utf-8')).hexdigest()
        sn_list.append(md5_hash)
    
    return "_".join(sn_list)

def get_root_cert_sn_v3(cert_path):
    """方法3：不反转issuer数组"""
    with open(cert_path, 'rb') as f:
        cert_data = f.read()

    cert_pattern = r'-----BEGIN CERTIFICATE-----(.+?)-----END CERTIFICATE-----'
    cert_matches = re.findall(cert_pattern, cert_data.decode('utf-8'), re.DOTALL)

    sn_list = []
    for cert_match in cert_matches:
        cert_content = cert_match.replace('\n', '').replace('\r', '').replace(' ', '')
        cert_bytes = base64.b64decode(cert_content)
        cert = x509.load_der_x509_certificate(cert_bytes, default_backend())
        
        issuer_attributes = []
        for attr in cert.issuer:
            issuer_attributes.append(f"{attr.oid._name}={attr.value}")
        
        issuer_str = ",".join(issuer_attributes)
        serial_number = str(cert.serial_number)
        combined = issuer_str + serial_number
        md5_hash = hashlib.md5(combined.encode('utf-8')).hexdigest()
        sn_list.append(md5_hash)
    
    return "_".join(sn_list)

def get_root_cert_sn_v4(cert_path):
    """方法4：使用等号分隔，不使用逗号"""
    with open(cert_path, 'rb') as f:
        cert_data = f.read()

    cert_pattern = r'-----BEGIN CERTIFICATE-----(.+?)-----END CERTIFICATE-----'
    cert_matches = re.findall(cert_pattern, cert_data.decode('utf-8'), re.DOTALL)

    sn_list = []
    for cert_match in cert_matches:
        cert_content = cert_match.replace('\n', '').replace('\r', '').replace(' ', '')
        cert_bytes = base64.b64decode(cert_content)
        cert = x509.load_der_x509_certificate(cert_bytes, default_backend())
        
        issuer_attributes = []
        for attr in cert.issuer:
            issuer_attributes.append(f"{attr.oid._name}={attr.value}")
        
        issuer_str = "".join(reversed(issuer_attributes))
        serial_number = str(cert.serial_number)
        combined = issuer_str + serial_number
        md5_hash = hashlib.md5(combined.encode('utf-8')).hexdigest()
        sn_list.append(md5_hash)
    
    return "_".join(sn_list)

def get_root_cert_sn_v5(cert_path):
    """方法5：使用PHP风格的array2string格式"""
    with open(cert_path, 'rb') as f:
        cert_data = f.read()

    cert_pattern = r'-----BEGIN CERTIFICATE-----(.+?)-----END CERTIFICATE-----'
    cert_matches = re.findall(cert_pattern, cert_data.decode('utf-8'), re.DOTALL)

    sn_list = []
    for cert_match in cert_matches:
        cert_content = cert_match.replace('\n', '').replace('\r', '').replace(' ', '')
        cert_bytes = base64.b64decode(cert_content)
        cert = x509.load_der_x509_certificate(cert_bytes, default_backend())
        
        issuer_attributes = []
        for attr in cert.issuer:
            oid_name = attr.oid._name
            if oid_name == "countryName":
                oid_name = "C"
            elif oid_name == "organizationName":
                oid_name = "O"
            elif oid_name == "organizationalUnitName":
                oid_name = "OU"
            elif oid_name == "commonName":
                oid_name = "CN"
            issuer_attributes.append(f"{oid_name}={attr.value}")
        
        issuer_str = ",".join(reversed(issuer_attributes))
        serial_number = str(cert.serial_number)
        combined = issuer_str + serial_number
        md5_hash = hashlib.md5(combined.encode('utf-8')).hexdigest()
        sn_list.append(md5_hash)
    
    return "_".join(sn_list)

if __name__ == "__main__":
    cert_path = "D:/trae_projects/image-edit/backend/cert/alipay/alipayRootCert.crt"
    
    print("方法1（当前实现）:")
    print(get_root_cert_sn_v1(cert_path))
    print()
    
    print("方法2（使用OID短名称）:")
    print(get_root_cert_sn_v2(cert_path))
    print()
    
    print("方法3（不反转issuer数组）:")
    print(get_root_cert_sn_v3(cert_path))
    print()
    
    print("方法4（不使用逗号分隔）:")
    print(get_root_cert_sn_v4(cert_path))
    print()
    
    print("方法5（使用PHP风格的短名称）:")
    print(get_root_cert_sn_v5(cert_path))
