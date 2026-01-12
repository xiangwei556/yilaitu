"""
支付宝支付服务
使用支付宝开放平台API
https://open.alipay.com/develop/pm/sub/setting?appId=2021006123642530
"""
import json
import time
import os
import base64
import hashlib
from typing import Dict, Optional
from decimal import Decimal
from datetime import datetime
from urllib.parse import urlencode, quote_plus
import httpx
from backend.passport.app.core.config import settings
from backend.payment.services.payment_service import PaymentService
from backend.passport.app.core.logging import logger


class AlipayService(PaymentService):
    """支付宝支付服务"""
    
    def __init__(self):
        self.app_id = settings.ALIPAY_APP_ID
        self.private_key = settings.ALIPAY_PRIVATE_KEY
        self.public_key = settings.ALIPAY_PUBLIC_KEY
        self.notify_url = settings.ALIPAY_NOTIFY_URL
        self.return_url = settings.ALIPAY_RETURN_URL
        self.gateway = settings.ALIPAY_GATEWAY
        self.sign_type = settings.ALIPAY_SIGN_TYPE
        
        # 证书配置
        self.app_cert_path = settings.ALIPAY_APP_CERT_PATH
        self.alipay_cert_path = settings.ALIPAY_ALIPAY_CERT_PATH
        self.alipay_root_cert_path = settings.ALIPAY_ALIPAY_ROOT_CERT_PATH
        self.app_private_key_path = settings.ALIPAY_PRIVATE_KEY_PATH
        
        # 证书内容缓存
        self._app_cert_sn = None
        self._alipay_root_cert_sn = None
    
    def _get_cert_sn(self, cert_path: str) -> str:
        """
        获取证书序列号
        支付宝要求：解析X.509证书文件，获取证书签发机构名称（issuer）以及证书内置序列号（serialNumber），
        将issuer数组反转后转换为字符串，然后与serialNumber拼接，最后计算MD5值
        注意：需要使用短OID名称（C、O、OU、CN等）而不是完整OID名称（countryName、organizationName等）
        """
        try:
            import hashlib
            import re
            from cryptography import x509
            from cryptography.hazmat.backends import default_backend

            with open(cert_path, 'rb') as f:
                cert_data = f.read()

            # 提取PEM证书块
            cert_pattern = r'-----BEGIN CERTIFICATE-----(.+?)-----END CERTIFICATE-----'
            cert_match = re.search(cert_pattern, cert_data.decode('utf-8'), re.DOTALL)
            if not cert_match:
                logger.error(f"无法解析证书文件: {cert_path}")
                return ""

            # 提取证书内容（去掉BEGIN/END标记）
            cert_content = cert_match.group(1).replace('\n', '').replace('\r', '').replace(' ', '')
            cert_bytes = base64.b64decode(cert_content)
            
            # 解析X.509证书
            cert = x509.load_der_x509_certificate(cert_bytes, default_backend())
            
            # OID到短名称的映射（匹配支付宝PHP SDK的格式）
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
            logger.info(f"[支付宝] 证书SN计算 - 路径: {cert_path}, Issuer: {issuer_str}, Serial: {serial_number}, MD5: {md5_hash}")
            return md5_hash
            
        except Exception as e:
            logger.error(f"获取证书序列号失败 {cert_path}: {str(e)}")
            import traceback
            logger.error(f"详细错误信息: {traceback.format_exc()}")
            return ""
    
    def _get_app_cert_sn(self) -> str:
        """获取应用证书序列号"""
        if self._app_cert_sn is None and self.app_cert_path:
            self._app_cert_sn = self._get_cert_sn(self.app_cert_path)
        return self._app_cert_sn or ""
    
    def _get_alipay_root_cert_sn(self) -> str:
        """
        获取支付宝根证书序列号
        根证书文件可能包含多个证书，需要计算每个证书的序列号并用下划线连接

        重要：只包含使用RSA签名算法(SHA256WithRSA/SHA1WithRSA)的证书
        排除ECDSA等其他算法的证书，这是支付宝官方SDK的标准做法
        OID前缀 1.2.840.113549.1.1 对应RSA相关签名算法
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

                # RSA签名算法OID前缀 (1.2.840.113549.1.1)
                # 只有使用RSA签名的证书才应被包含在根证书SN中
                RSA_OID_PREFIX = "1.2.840.113549.1.1"

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

                    # 获取签名算法OID
                    sig_alg_oid = cert.signature_algorithm_oid.dotted_string

                    # 只处理RSA签名算法的证书 (OID以1.2.840.113549.1.1开头)
                    if not sig_alg_oid.startswith(RSA_OID_PREFIX):
                        logger.info(f"[支付宝] 跳过非RSA签名证书: {cert_cn} (算法OID: {sig_alg_oid})")
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
        """
        生成支付宝签名（RSA2）
        注意：这里需要安装cryptography库来实现RSA签名
        """
        try:
            from cryptography.hazmat.primitives import hashes, serialization
            from cryptography.hazmat.primitives.asymmetric import padding
            from cryptography.hazmat.backends import default_backend
            
            # 排序参数（只排除sign）
            sorted_params = sorted(data.items())
            sign_str = "&".join([f"{k}={v}" for k, v in sorted_params if k != "sign" and v])
            
            # 优先使用私钥文件路径，如果没有则使用直接的私钥内容
            private_key_data = None
            if self.app_private_key_path and os.path.exists(self.app_private_key_path):
                # 从文件读取私钥
                with open(self.app_private_key_path, 'rb') as f:
                    private_key_data = f.read()
                logger.info(f"使用私钥文件进行签名: {self.app_private_key_path}")
            elif self.private_key and self.private_key != "your_private_key":
                # 使用直接的私钥内容
                private_key_data = self.private_key.encode('utf-8')
                logger.info("使用配置中的私钥内容进行签名")
            else:
                logger.error("没有配置有效的支付宝私钥")
                return ""
            
            # 加载私钥
            private_key = serialization.load_pem_private_key(
                private_key_data,
                password=None,
                backend=default_backend()
            )
            
            # 签名
            signature = private_key.sign(
                sign_str.encode('utf-8'),
                padding.PKCS1v15(),
                hashes.SHA256()
            )
            
            # Base64编码
            return base64.b64encode(signature).decode('utf-8')
            
        except ImportError:
            logger.error("需要安装cryptography库: pip install cryptography")
            return ""
        except Exception as e:
            logger.error(f"支付宝签名生成异常: {str(e)}")
            return ""
    
    def _verify_sign(self, data: Dict, sign: str) -> bool:
        """
        验证支付宝签名（支持证书方式）
        """
        try:
            from cryptography.hazmat.primitives import hashes, serialization
            from cryptography.hazmat.primitives.asymmetric import padding
            from cryptography.hazmat.backends import default_backend
            
            # 排序参数（排除sign和sign_type）
            sorted_params = sorted(data.items())
            sign_str = "&".join([f"{k}={v}" for k, v in sorted_params if k not in ["sign", "sign_type"] and v])
            
            # 优先使用证书方式验证
            if self.alipay_cert_path and os.path.exists(self.alipay_cert_path):
                try:
                    # 从支付宝证书中提取公钥
                    with open(self.alipay_cert_path, 'r', encoding='utf-8') as f:
                        cert_content = f.read()
                    
                    # 提取证书中的公钥
                    from cryptography import x509
                    cert = x509.load_pem_x509_certificate(cert_content.encode('utf-8'), default_backend())
                    public_key = cert.public_key()
                    
                    # 验证签名
                    signature_bytes = base64.b64decode(sign)
                    public_key.verify(
                        signature_bytes,
                        sign_str.encode('utf-8'),
                        padding.PKCS1v15(),
                        hashes.SHA256()
                    )
                    
                    return True
                    
                except Exception as cert_error:
                    logger.warning(f"证书验证失败，回退到公钥验证: {str(cert_error)}")
            
            # 回退到公钥验证
            if self.public_key:
                public_key = serialization.load_pem_public_key(
                    self.public_key.encode('utf-8'),
                    backend=default_backend()
                )
                
                # 验证签名
                signature_bytes = base64.b64decode(sign)
                public_key.verify(
                    signature_bytes,
                    sign_str.encode('utf-8'),
                    padding.PKCS1v15(),
                    hashes.SHA256()
                )
                
                return True
            
            logger.error("没有可用的公钥或证书进行签名验证")
            return False
            
        except Exception as e:
            logger.error(f"支付宝签名验证异常: {str(e)}")
            return False
    
    async def create_order(
        self,
        order_no: str,
        amount: Decimal,
        description: str,
        notify_url: str
    ) -> Dict:
        """
        创建支付宝支付订单（当面付-扫码支付）
        使用 alipay.trade.precreate 接口，返回可扫描的二维码短链接
        参考文档: https://opendocs.alipay.com/open/140/104600

        注意: alipay.trade.page.pay 返回的是完整URL，生成的二维码太密集无法扫描
              alipay.trade.precreate 返回 qr_code 短链接（如 https://qr.alipay.com/xxx），可正常扫描
        """
        try:
            logger.info(f"[支付宝] 开始创建订单 - 订单号: {order_no}, 金额: {amount}, 描述: {description}")

            # 当面付业务参数
            biz_content = {
                "out_trade_no": order_no,
                "total_amount": str(amount),
                "subject": description
            }

            params = {
                "app_id": self.app_id,
                "method": "alipay.trade.precreate",  # 使用预下单接口，返回二维码短链接
                "charset": "utf-8",
                "sign_type": self.sign_type,
                "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                "version": "1.0",
                "notify_url": notify_url or self.notify_url,
                "biz_content": json.dumps(biz_content, ensure_ascii=False)
            }

            # 如果启用了证书方式，添加证书序列号
            if self.app_cert_path and os.path.exists(self.app_cert_path):
                app_cert_sn = self._get_app_cert_sn()
                if app_cert_sn:
                    params["app_cert_sn"] = app_cert_sn
                    logger.info(f"[支付宝] 使用应用证书模式 - 证书SN: {app_cert_sn}")

            if self.alipay_root_cert_path and os.path.exists(self.alipay_root_cert_path):
                alipay_root_cert_sn = self._get_alipay_root_cert_sn()
                if alipay_root_cert_sn:
                    params["alipay_root_cert_sn"] = alipay_root_cert_sn

            # 生成签名
            logger.info(f"[支付宝] 开始生成签名 - 参数: {list(params.keys())}")
            sign = self._sign(params)
            if not sign:
                logger.error(f"[支付宝] 签名生成失败 - 订单号: {order_no}")
                return {
                    "success": False,
                    "error": "签名生成失败"
                }

            logger.info(f"[支付宝] 签名生成成功 - 订单号: {order_no}")
            params["sign"] = sign

            # 发送POST请求到支付宝网关
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    self.gateway,
                    params=params,
                    timeout=10.0
                )
                response.raise_for_status()

                # 解析响应
                try:
                    result = response.json()
                except (UnicodeDecodeError, json.JSONDecodeError):
                    # 尝试用GBK解码
                    content = response.content.decode('gbk')
                    result = json.loads(content)

                logger.info(f"[支付宝] API响应: {json.dumps(result, ensure_ascii=False)}")

            # 解析返回结果
            alipay_response = result.get("alipay_trade_precreate_response", {})
            code = alipay_response.get("code", "")

            if code == "10000":
                # 成功，获取二维码短链接
                qr_code = alipay_response.get("qr_code", "")
                logger.info(f"[支付宝] 订单创建成功 - 订单号: {order_no}, 二维码: {qr_code}")

                return {
                    "success": True,
                    "payment_no": order_no,
                    "qr_code_url": qr_code,  # 返回短链接，如 https://qr.alipay.com/xxx
                    "pay_url": qr_code,
                    "expire_seconds": 900  # 15分钟
                }
            else:
                # 失败
                error_msg = alipay_response.get("sub_msg", alipay_response.get("msg", "未知错误"))
                error_code = alipay_response.get("sub_code", alipay_response.get("code", ""))
                logger.error(f"[支付宝] 订单创建失败 - 订单号: {order_no}, 错误码: {error_code}, 错误信息: {error_msg}")

                return {
                    "success": False,
                    "error": f"{error_code}: {error_msg}"
                }

        except Exception as e:
            logger.error(f"[支付宝] 创建订单异常 - 订单号: {order_no}, 错误: {str(e)}")
            import traceback
            logger.error(f"[支付宝] 异常堆栈: {traceback.format_exc()}")
            return {
                "success": False,
                "error": str(e)
            }
    
    async def query_order(self, order_no: str) -> Dict:
        """
        查询支付宝订单状态

        Args:
            order_no: 商户订单号（out_trade_no）
        """
        try:
            biz_content = {
                "out_trade_no": order_no
            }
            
            params = {
                "app_id": self.app_id,
                "method": "alipay.trade.query",
                "charset": "utf-8",
                "sign_type": self.sign_type,
                "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                "version": "1.0",
                "biz_content": json.dumps(biz_content, ensure_ascii=False)
            }
            
            # 生成签名
            sign = self._sign(params)
            if not sign:
                return {
                    "success": False,
                    "error": "签名生成失败"
                }
            
            params["sign"] = sign
            
            # 发送请求
            async with httpx.AsyncClient() as client:
                # 将参数放在URL查询字符串中
                response = await client.post(
                    self.gateway,
                    params=params,
                    timeout=10.0
                )
                response.raise_for_status()

                # 支付宝API可能返回GBK编码，需要先解码再解析JSON
                try:
                    result = response.json()
                except (UnicodeDecodeError, json.JSONDecodeError):
                    # 尝试用GBK解码
                    content = response.content.decode('gbk')
                    result = json.loads(content)
                
                alipay_response = result.get("alipay_trade_query_response", {})
                code = alipay_response.get("code", "")
                
                if code == "10000":
                    trade_status = alipay_response.get("trade_status", "")
                    status_map = {
                        "TRADE_SUCCESS": "paid",
                        "TRADE_FINISHED": "paid",
                        "WAIT_BUYER_PAY": "pending",
                        "TRADE_CLOSED": "cancelled"
                    }
                    
                    return {
                        "success": True,
                        "status": status_map.get(trade_status, "unknown"),
                        "payment_no": alipay_response.get("trade_no", ""),
                        "amount": Decimal(alipay_response.get("total_amount", 0)),
                        "paid_time": alipay_response.get("send_pay_date")
                    }
                else:
                    return {
                        "success": False,
                        "error": alipay_response.get("sub_msg", "查询失败")
                    }
                    
        except Exception as e:
            logger.error(f"支付宝查询订单异常: {str(e)}")
            return {
                "success": False,
                "error": str(e)
            }
    
    async def verify_callback(self, data: Dict) -> bool:
        """
        验证支付宝回调签名
        """
        try:
            sign = data.get("sign", "")
            if not sign:
                return False
            
            # 移除sign和sign_type参数后验证
            verify_data = {k: v for k, v in data.items() if k not in ["sign", "sign_type"]}
            return self._verify_sign(verify_data, sign)
            
        except Exception as e:
            logger.error(f"支付宝回调验证异常: {str(e)}")
            return False
    
    async def process_callback(self, data: Dict) -> Dict:
        """
        处理支付宝支付回调
        """
        try:
            order_no = data.get("out_trade_no", "")
            payment_no = data.get("trade_no", "")
            trade_status = data.get("trade_status", "")
            
            status_map = {
                "TRADE_SUCCESS": "paid",
                "TRADE_FINISHED": "paid",
                "WAIT_BUYER_PAY": "pending",
                "TRADE_CLOSED": "cancelled"
            }
            
            return {
                "success": True,
                "order_no": order_no,
                "payment_no": payment_no,
                "status": status_map.get(trade_status, "unknown"),
                "amount": Decimal(data.get("total_amount", 0)),
                "paid_time": data.get("gmt_payment")
            }
            
        except Exception as e:
            logger.error(f"支付宝回调处理异常: {str(e)}")
            return {
                "success": False,
                "error": str(e)
            }