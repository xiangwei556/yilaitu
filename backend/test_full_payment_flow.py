"""
测试完整的支付宝支付流程
"""
import sys
import os

# 设置Python路径
sys.path.insert(0, 'D:/trae_projects/image-edit/backend')

# 导入必要的模块
from dotenv import load_dotenv
load_dotenv()

# 直接读取并修改后的AlipayService代码
import base64
import hashlib
import logging
from typing import Dict, Optional
from cryptography import x509
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import padding
from cryptography.hazmat.backends import default_backend

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class AlipayService:
    def __init__(
        self,
        app_id: str,
        private_key_path: str,
        app_cert_path: str,
        alipay_public_cert_path: str,
        alipay_root_cert_path: str
    ):
        self.app_id = app_id
        self.private_key_path = private_key_path
        self.app_cert_path = app_cert_path
        self.alipay_public_cert_path = alipay_public_cert_path
        self.alipay_root_cert_path = alipay_root_cert_path
        
        self._private_key = None
        self._app_cert_sn = None
        self._alipay_root_cert_sn = None
        self._alipay_public_cert_sn = None
    
    def _load_private_key(self):
        """加载私钥"""
        if self._private_key is None:
            try:
                with open(self.private_key_path, 'r', encoding='utf-8') as f:
                    private_key_pem = f.read()
                
                # 解析PEM格式的私钥
                self._private_key = serialization.load_pem_private_key(
                    private_key_pem.encode('utf-8'),
                    password=None,
                    backend=default_backend()
                )
                logger.info("[支付宝] 私钥加载成功")
            except Exception as e:
                logger.error(f"[支付宝] 私钥加载失败: {str(e)}")
                raise
        return self._private_key
    
    def _get_cert_sn(self, cert_path: str) -> str:
        """获取证书序列号"""
        try:
            with open(cert_path, 'rb') as f:
                cert_data = f.read()
            
            cert = x509.load_pem_x509_certificate(cert_data, default_backend())
            serial_number = str(cert.serial_number)
            issuer_attributes = []
            
            oid_short_names = {
                x509.oid.NameOID.COUNTRY_NAME: "C",
                x509.oid.NameOID.STATE_OR_PROVINCE_NAME: "ST",
                x509.oid.NameOID.LOCALITY_NAME: "L",
                x509.oid.NameOID.ORGANIZATION_NAME: "O",
                x509.oid.NameOID.ORGANIZATIONAL_UNIT_NAME: "OU",
                x509.oid.NameOID.COMMON_NAME: "CN",
            }
            
            for attr in cert.issuer:
                short_name = oid_short_names.get(attr.oid, attr.oid._name)
                issuer_attributes.append(f"{short_name}={attr.value}")
            
            issuer_str = ",".join(reversed(issuer_attributes))
            combined = issuer_str + serial_number
            cert_sn = hashlib.md5(combined.encode('utf-8')).hexdigest()
            
            logger.info(f"[支付宝] 证书SN: {cert_sn}")
            return cert_sn
        except Exception as e:
            logger.error(f"[支付宝] 获取证书序列号失败: {str(e)}")
            return ""
    
    def _get_app_cert_sn(self) -> str:
        """获取应用证书序列号"""
        if self._app_cert_sn is None and self.app_cert_path:
            self._app_cert_sn = self._get_cert_sn(self.app_cert_path)
        return self._app_cert_sn or ""
    
    def _get_alipay_root_cert_sn(self) -> str:
        """
        获取支付宝根证书序列号
        只包含支付宝官方认可的三个根证书
        """
        if self._alipay_root_cert_sn is None and self.alipay_root_cert_path:
            try:
                import re
                from cryptography import x509
                from cryptography.hazmat.backends import default_backend

                with open(self.alipay_root_cert_path, 'rb') as f:
                    cert_data = f.read()

                # 提取所有PEM证书块
                cert_pattern = r'-----BEGIN CERTIFICATE-----(.+?)-----END CERTIFICATE-----'
                cert_matches = re.findall(cert_pattern, cert_data.decode('utf-8'), re.DOTALL)

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
                        logger.info(f"[支付宝] 跳过非官方根证书: {cert_cn}")
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
                    logger.info(f"[支付宝] 根证书 [{cert_cn}] SN: {md5_hash}")

                # 拼接所有根证书SN（用下划线分隔）
                self._alipay_root_cert_sn = "_".join(cert_sns)
                logger.info(f"[支付宝] 最终根证书SN: {self._alipay_root_cert_sn}")

            except Exception as e:
                logger.error(f"获取根证书序列号失败: {str(e)}")
                import traceback
                logger.error(f"详细错误信息: {traceback.format_exc()}")
                self._alipay_root_cert_sn = ""

        return self._alipay_root_cert_sn or ""
    
    def _sign(self, data: Dict) -> str:
        """生成支付宝签名（RSA2）"""
        try:
            # 排序参数（只排除sign）
            sorted_params = sorted(data.items())
            sign_str = "&".join([f"{k}={v}" for k, v in sorted_params if k != "sign" and v])
            
            logger.info(f"[支付宝] 待签名字符串: {sign_str[:100]}...")
            
            # 加载私钥
            private_key = self._load_private_key()
            
            # RSA2签名
            signature = private_key.sign(
                sign_str.encode('utf-8'),
                padding.PKCS1v15(),
                hashes.SHA256()
            )
            
            # Base64编码
            sign = base64.b64encode(signature).decode('utf-8')
            logger.info(f"[支付宝] 签名生成成功")
            
            return sign
        except Exception as e:
            logger.error(f"[支付宝] 签名生成失败: {str(e)}")
            import traceback
            logger.error(f"详细错误信息: {traceback.format_exc()}")
            raise
    
    def create_payment_url(self, order_no: str, amount: str, subject: str) -> str:
        """创建支付URL"""
        try:
            # 构建请求参数
            biz_content = {
                "out_trade_no": order_no,
                "total_amount": amount,
                "subject": subject,
                "product_code": "FAST_INSTANT_TRADE_PAY"
            }
            
            import json
            import time
            
            params = {
                "app_id": self.app_id,
                "method": "alipay.trade.page.pay",
                "charset": "utf-8",
                "sign_type": "RSA2",
                "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
                "version": "1.0",
                "notify_url": "https://example.com/notify",
                "biz_content": json.dumps(biz_content, ensure_ascii=False)
            }
            
            # 添加证书序列号
            app_cert_sn = self._get_app_cert_sn()
            alipay_root_cert_sn = self._get_alipay_root_cert_sn()
            
            if app_cert_sn:
                params["app_cert_sn"] = app_cert_sn
            if alipay_root_cert_sn:
                params["alipay_root_cert_sn"] = alipay_root_cert_sn
            
            # 生成签名
            sign = self._sign(params)
            params["sign"] = sign
            
            # 构建URL
            gateway_url = "https://openapi.alipay.com/gateway.do"
            query_string = "&".join([f"{k}={v}" for k, v in sorted(params.items())])
            url = f"{gateway_url}?{query_string}"
            
            logger.info(f"[支付宝] 支付URL生成成功")
            return url
        except Exception as e:
            logger.error(f"[支付宝] 创建支付URL失败: {str(e)}")
            import traceback
            logger.error(f"详细错误信息: {traceback.format_exc()}")
            raise

# 测试
print("=" * 100)
print("测试完整的支付宝支付流程")
print("=" * 100)
print()

# 创建 AlipayService 实例
alipay_service = AlipayService(
    app_id=os.getenv('ALIPAY_APP_ID'),
    private_key_path=os.getenv('ALIPAY_PRIVATE_KEY_PATH'),
    app_cert_path=os.getenv('ALIPAY_APP_CERT_PATH'),
    alipay_public_cert_path=os.getenv('ALIPAY_ALIPAY_CERT_PATH'),
    alipay_root_cert_path=os.getenv('ALIPAY_ALIPAY_ROOT_CERT_PATH')
)

# 先测试获取证书SN
print("测试证书SN计算：")
print("-" * 100)
app_cert_sn = alipay_service._get_app_cert_sn()
print(f"应用证书SN: {app_cert_sn}")
print()

root_cert_sn = alipay_service._get_alipay_root_cert_sn()
print(f"根证书SN: {root_cert_sn}")
print()

# 验证根证书SN
expected_root_cert_sn = "687b59193f3f462dd5336e5abf83c5d8_8af620707e5ddd8c7e76747e86a604dc_02941eef3187dddf3d3b83462e1dfcf6"
if root_cert_sn == expected_root_cert_sn:
    print("✓ 根证书SN计算正确")
else:
    print(f"✗ 根证书SN计算不正确")
    print(f"  期望: {expected_root_cert_sn}")
    print(f"  实际: {root_cert_sn}")
print()

# 测试创建支付URL
print("测试创建支付URL：")
print("-" * 100)
try:
    url = alipay_service.create_payment_url(
        order_no="TEST20240110001",
        amount="0.01",
        subject="测试商品"
    )
    
    print("✓ 支付URL创建成功")
    print()
    print(f"支付URL（前200字符）: {url[:200]}...")
    print()
    
except Exception as e:
    print(f"✗ 支付URL创建失败: {e}")
    import traceback
    print(traceback.format_exc())
