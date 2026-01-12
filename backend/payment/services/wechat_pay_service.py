"""
微信支付服务
使用微信支付API v3
"""
import json
import time
import hashlib
import hmac
import base64
import secrets
import os
from typing import Dict, Optional
from decimal import Decimal
from datetime import datetime
import httpx
from cryptography import x509
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.asymmetric import padding
from cryptography.hazmat.primitives.serialization import load_pem_private_key, load_pem_public_key
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from backend.passport.app.core.config import settings
from backend.payment.services.payment_service import PaymentService
from backend.passport.app.core.logging import logger


class WeChatPayService(PaymentService):
    """微信支付服务"""
    
    def __init__(self):
        self.app_id = settings.WECHAT_PAY_APP_ID
        self.mch_id = settings.WECHAT_PAY_MCH_ID
        self.api_key = settings.WECHAT_PAY_API_KEY
        self.api_v3_key = settings.WECHAT_PAY_API_V3_KEY
        self.cert_path = settings.WECHAT_PAY_CERT_PATH
        self.mch_private_key_path = settings.WECHAT_PAY_MCH_PRIVATE_KEY_PATH
        self.platform_cert_path = settings.WECHAT_PAY_PLATFORM_CERT_PATH
        self.cert_serial_no = settings.WECHAT_PAY_CERT_SERIAL_NO
        self.notify_url = settings.WECHAT_PAY_NOTIFY_URL
        self.base_url = "https://api.mch.weixin.qq.com"
        self._private_key = None
        self._platform_public_key = None
        
        # 检查必要配置
        if not self.app_id or not self.mch_id or not self.api_v3_key:
            logger.warning("微信支付配置不完整，将使用测试模式")
        
        # 加载商户私钥
        try:
            if self.mch_private_key_path:
                with open(self.mch_private_key_path, 'rb') as f:
                    private_key_data = f.read()
                    self._private_key = load_pem_private_key(private_key_data, password=None)
                    logger.info("商户私钥加载成功")
            else:
                logger.warning("商户私钥路径未配置")
        except Exception as e:
            logger.error(f"加载商户私钥失败: {str(e)}")
            self._private_key = None
        
        # 初始化平台公钥（将动态获取）
        self._platform_public_key = None
        self._platform_cert_serial_no = None
        
        # 尝试加载平台证书
        self._load_platform_certificate()
        
    def _generate_signature(self, method: str, url: str, timestamp: str, nonce: str, body: str = "") -> str:
        """
        生成微信支付API v3签名 (RSA-SHA256)
        """
        if not self._private_key:
            logger.error("商户私钥未加载，无法生成签名")
            raise ValueError("商户私钥未加载")
        
        # 微信支付API v3签名消息格式：method\nurl\ntimestamp\nnonce\nbody\n
        message = f"{method}\n{url}\n{timestamp}\n{nonce}\n{body}\n"
        
        # 调试日志：打印签名原始消息
        logger.info(f"签名消息内容: method={method}, url={url}, timestamp={timestamp}, nonce={nonce}")
        logger.info(f"签名消息体: {repr(message)}")
        logger.info(f"签名消息长度: {len(message)}")
        logger.info(f"签名消息体内容: {message}")
        logger.info(f"私钥是否加载: {self._private_key is not None}")
        
        try:
            # 使用RSA私钥签名
            signature = self._private_key.sign(
                message.encode('utf-8'),
                padding.PKCS1v15(),
                hashes.SHA256()
            )
            signature_b64 = base64.b64encode(signature).decode('utf-8')
            logger.info(f"签名生成成功: {signature_b64[:50]}...")
            logger.info(f"完整签名: {signature_b64}")
            return signature_b64
        except Exception as e:
            logger.error(f"RSA签名生成失败: {str(e)}")
            raise ValueError(f"RSA签名生成失败: {str(e)}")
    
    def _get_authorization(self, method: str, url: str, body: str = "") -> str:
        """
        获取Authorization header
        """
        timestamp = str(int(time.time()))
        nonce = secrets.token_hex(16)  # 生成32位随机字符串
        signature = self._generate_signature(method, url, timestamp, nonce, body)
        
        auth_header = f'WECHATPAY2-SHA256-RSA2048 mchid="{self.mch_id}",nonce_str="{nonce}",signature="{signature}",timestamp="{timestamp}",serial_no="{self.cert_serial_no}"'
        
        # 调试日志：打印Authorization头（隐藏敏感信息）
        logger.info(f"Authorization头: mchid={self.mch_id}, nonce={nonce[:10]}..., timestamp={timestamp}, serial_no={self.cert_serial_no}")
        logger.info(f"Authorization头长度: {len(auth_header)}")
        logger.info(f"完整Authorization头: {auth_header}")
        
        return auth_header
    
    def _get_authorization_with_params(self, method: str, url: str, body: str, timestamp: str, nonce: str) -> str:
        """
        使用指定的时间戳和nonce获取Authorization header
        """
        signature = self._generate_signature(method, url, timestamp, nonce, body)
        
        auth_header = f'WECHATPAY2-SHA256-RSA2048 mchid="{self.mch_id}",nonce_str="{nonce}",signature="{signature}",timestamp="{timestamp}",serial_no="{self.cert_serial_no}"'
        
        # 调试日志：打印Authorization头（隐藏敏感信息）
        logger.info(f"Authorization头(指定参数): mchid={self.mch_id}, nonce={nonce[:10]}..., timestamp={timestamp}, serial_no={self.cert_serial_no}")
        logger.info(f"Authorization头长度: {len(auth_header)}")
        
        return auth_header
    
    async def create_order(
        self,
        order_no: str,
        amount: Decimal,
        description: str,
        notify_url: str
    ) -> Dict:
        """
        创建微信支付订单（Native支付）
        """
        try:
            # 检查配置是否完整
            if not self.app_id or not self.mch_id or not self.api_v3_key or not self._private_key:
                logger.warning(f"微信支付配置不完整，使用测试模式。app_id={bool(self.app_id)}, mch_id={bool(self.mch_id)}, api_v3_key={bool(self.api_v3_key)}, private_key={bool(self._private_key)}")
                # 测试模式：返回模拟的二维码URL
                return {
                    "success": True,
                    "payment_no": f"TEST_{order_no}",
                    "qr_code_url": f"weixin://wxpay/bizpayurl?pr=TEST_{order_no}",
                    "expire_seconds": 900
                }
            
            url = f"{self.base_url}/v3/pay/transactions/native"
            
            # 金额转换为分
            total = int(amount * 100)
            
            body = {
                "appid": self.app_id,
                "mchid": self.mch_id,
                "description": description,
                "out_trade_no": order_no,
                "notify_url": notify_url or self.notify_url,
                "amount": {
                    "total": total,
                    "currency": "CNY"
                }
            }
            
            body_str = json.dumps(body, ensure_ascii=False, separators=(',', ':'))
            logger.info(f"微信支付创建订单请求: order_no={order_no}, amount={amount}")
            logger.info(f"请求体JSON字符串: {body_str}")
            logger.info(f"请求体JSON长度: {len(body_str)}")
            logger.info(f"实际配置参数: app_id={self.app_id}, mch_id={self.mch_id}, notify_url={notify_url or self.notify_url}")
            logger.info(f"订单参数: order_no={order_no}, description={description}, total={total}")
            
            # 关键调试：打印原始body字典和序列化后的字符串进行比对
            logger.info(f"原始body字典: {body}")
            logger.info(f"body字符串repr: {repr(body_str)}")
            logger.info(f"body字符串每个字符的ASCII: {[ord(c) for c in body_str]}")
            
            # 生成时间戳和nonce，确保签名和请求使用相同的值
            timestamp = str(int(time.time()))
            nonce = secrets.token_hex(16)
            
            # 生成Authorization头（使用相同的时间戳和nonce）
            auth_header = self._get_authorization_with_params("POST", "/v3/pay/transactions/native", body_str, timestamp, nonce)
            
            headers = {
                "Content-Type": "application/json",
                "Authorization": auth_header,
                "Accept": "application/json"
            }
            
            # 关键调试：打印用于签名的完整消息
            signature_message = f"POST\n/v3/pay/transactions/native\n{timestamp}\n{nonce}\n{body_str}\n"
            logger.info(f"用于签名的完整消息: {repr(signature_message)}")
            logger.info(f"用于签名的完整消息长度: {len(signature_message)}")
            logger.info(f"时间戳: {timestamp}")
            logger.info(f"随机串: {nonce}")
            
            # 打印调用前的参数
            logger.info(f"微信支付创建订单调用参数: method=POST, url={url}")
            logger.info(f"请求头: {headers}")
            logger.info(f"请求体字符串: {body_str}")
            logger.info(f"请求体长度: {len(body_str)}")
            
            # 关键调试：打印即将发送的HTTP请求详情
            logger.info(f"即将发送HTTP请求:")
            logger.info(f"URL: {url}")
            logger.info(f"方法: POST")
            logger.info(f"请求头: {headers}")
            logger.info(f"请求体: {repr(body_str)}")
            logger.info(f"请求体长度: {len(body_str)}")
            
            # 关键调试：打印即将发送的HTTP请求详情
            logger.info(f"即将发送HTTP请求:")
            logger.info(f"URL: {url}")
            logger.info(f"方法: POST")
            logger.info(f"请求头: {headers}")
            logger.info(f"请求体: {repr(body_str)}")
            logger.info(f"请求体长度: {len(body_str)}")
            
            async with httpx.AsyncClient() as client:
                response = await client.post(url, data=body_str, headers=headers, timeout=10.0)
                
                # 记录响应状态
                logger.info(f"微信支付API响应状态: {response.status_code}")
                
                if response.status_code != 200:
                    error_text = response.text
                    logger.error(f"微信支付API返回错误: status={response.status_code}, response={error_text}")
                    return {
                        "success": False,
                        "error": f"微信支付API返回错误: {response.status_code} - {error_text[:200]}"
                    }
                
                result = response.json()
                logger.info(f"微信支付API响应: {json.dumps(result, ensure_ascii=False)[:200]}")
                
                if "code_url" in result:
                    return {
                        "success": True,
                        "payment_no": result.get("prepay_id", ""),
                        "qr_code_url": result["code_url"],
                        "expire_seconds": 900  # 15分钟
                    }
                else:
                    error_msg = result.get("message") or result.get("detail") or json.dumps(result)
                    logger.error(f"微信支付创建订单失败: {error_msg}")
                    return {
                        "success": False,
                        "error": f"创建订单失败: {error_msg}"
                    }
                    
        except httpx.HTTPStatusError as e:
            error_text = e.response.text if e.response else str(e)
            logger.error(f"微信支付HTTP错误: {e.response.status_code if e.response else 'unknown'} - {error_text[:200]}")
            return {
                "success": False,
                "error": f"HTTP错误: {e.response.status_code if e.response else 'unknown'} - {error_text[:200]}"
            }
        except Exception as e:
            import traceback
            error_detail = traceback.format_exc()
            logger.error(f"微信支付创建订单异常: {str(e)}\n{error_detail}")
            return {
                "success": False,
                "error": f"创建订单异常: {str(e)}"
            }
    
    async def query_order(self, order_no: str) -> Dict:
        """
        查询微信支付订单状态
        使用商户订单号查询
        参考文档：https://pay.weixin.qq.com/doc/v3/merchant/4012791879

        Args:
            order_no: 商户订单号（out_trade_no）
        """
        try:
            # 检查是否为测试订单
            if order_no.startswith("TEST_"):
                logger.info(f"查询测试订单状态: {order_no}")
                # 测试订单默认返回待支付状态
                return {
                    "success": True,
                    "status": "pending",
                    "payment_no": "",
                    "amount": Decimal(0),
                    "paid_time": None
                }

            # 检查配置是否完整
            if not self.app_id or not self.mch_id or not self.api_v3_key or not self._private_key:
                logger.warning(f"微信支付配置不完整，无法查询真实订单。app_id={bool(self.app_id)}, mch_id={bool(self.mch_id)}, api_v3_key={bool(self.api_v3_key)}, private_key={bool(self._private_key)}")
                return {
                    "success": False,
                    "error": "微信支付配置不完整"
                }

            # 构建URL，必须包含mchid参数
            url_path = f"/v3/pay/transactions/out-trade-no/{order_no}?mchid={self.mch_id}"
            url = f"{self.base_url}{url_path}"

            headers = {
                "Authorization": self._get_authorization("GET", url_path),
                "Accept": "application/json"
            }

            logger.info(f"微信支付查询订单: order_no={order_no}, url={url}")

            async with httpx.AsyncClient() as client:
                response = await client.get(url, headers=headers, timeout=10.0)
                response.raise_for_status()
                result = response.json()

                # 解析支付状态
                trade_state = result.get("trade_state", "")
                status_map = {
                    "SUCCESS": "paid",
                    "NOTPAY": "pending",
                    "CLOSED": "cancelled",
                    "REVOKED": "cancelled",
                    "USERPAYING": "pending",
                    "PAYERROR": "failed"
                }

                logger.info(f"微信支付订单查询成功: order_no={order_no}, trade_state={trade_state}")

                return {
                    "success": True,
                    "status": status_map.get(trade_state, "unknown"),
                    "payment_no": result.get("transaction_id", ""),
                    "amount": Decimal(result.get("amount", {}).get("total", 0)) / 100,
                    "paid_time": result.get("success_time")
                }

        except Exception as e:
            logger.error(f"微信支付查询订单异常: order_no={order_no}, error={str(e)}")
            return {
                "success": False,
                "error": str(e)
            }
    
    # 已移除：不再从微信支付API获取平台证书，只使用本地配置的证书文件
    
    def _load_platform_certificate(self):
        """
        加载微信支付平台证书或公钥
        根据官方文档，平台证书需要从微信支付API获取并解密
        或者使用您手动下载的平台证书文件或公钥文件
        """
        try:
            # 检查是否配置了平台证书路径
            if self.platform_cert_path and os.path.exists(self.platform_cert_path):
                with open(self.platform_cert_path, 'rb') as f:
                    cert_data = f.read()
                    
                    # 尝试作为X.509证书加载
                    try:
                        cert = x509.load_pem_x509_certificate(cert_data)
                        self._platform_public_key = cert.public_key()
                        self._platform_cert_serial_no = cert.serial_number
                        logger.info(f"微信支付平台证书加载成功: serial_no={cert.serial_number}")
                        return
                    except Exception:
                        # 如果不是证书格式，尝试作为公钥加载
                        try:
                            public_key = load_pem_public_key(cert_data)
                            self._platform_public_key = public_key
                            self._platform_cert_serial_no = None  # 公钥文件没有序列号
                            logger.info("微信支付平台公钥加载成功")
                            return
                        except Exception as e:
                            logger.error(f"平台证书/公钥文件格式错误: {str(e)}")
                            return
            
            # 如果没有配置平台证书路径，记录错误信息
            logger.error("微信支付平台证书未配置或文件不存在")
            logger.error("请确保已正确配置平台证书路径: WECHAT_PAY_PLATFORM_CERT_PATH")
            logger.error("您需要从微信支付商户平台下载平台证书或使用已提供的证书文件")
            
            # 尝试从默认位置加载（支持证书和公钥格式）
            default_cert_paths = [
                "d:/trae_projects/image-edit/backend/cert/wechat/pub_key.pem",
                "d:/trae_projects/image-edit/backend/cert/wechat/wechatpay_platform_cert.pem",
                "d:/trae_projects/image-edit/backend/cert/wechat/platform_cert.pem",
                "d:/trae_projects/image-edit/backend/cert/wechat/platform.crt"
            ]
            
            for cert_path in default_cert_paths:
                if os.path.exists(cert_path):
                    try:
                        with open(cert_path, 'rb') as f:
                            cert_data = f.read()
                            
                            # 尝试作为X.509证书加载
                            try:
                                cert = x509.load_pem_x509_certificate(cert_data)
                                self._platform_public_key = cert.public_key()
                                self._platform_cert_serial_no = cert.serial_number
                                logger.info(f"从默认路径加载微信支付平台证书成功: {cert_path}")
                                return
                            except Exception:
                                # 尝试作为公钥加载
                                try:
                                    public_key = serialization.load_pem_public_key(cert_data)
                                    self._platform_public_key = public_key
                                    self._platform_cert_serial_no = None
                                    logger.info(f"从默认路径加载微信支付平台公钥成功: {cert_path}")
                                    return
                                except Exception:
                                    pass
                    except Exception as e:
                        logger.warning(f"尝试加载默认证书/公钥失败 {cert_path}: {str(e)}")
            
            logger.error("未找到微信支付平台证书或公钥，回调签名验证将无法进行")
            
        except Exception as e:
            logger.error(f"加载平台证书失败: {str(e)}")
            self._platform_public_key = None
            self._platform_cert_serial_no = None
    
    # 已移除：不再解密平台证书，只使用本地配置的证书文件
    
    async def verify_callback(self, data: Dict) -> bool:
        """
        验证微信支付回调签名
        参考官方文档：https://pay.weixin.qq.com/doc/v3/merchant/4012071382
        """
        try:
            # 获取签名信息
            signature = data.get("signature", "")
            timestamp = data.get("timestamp", "")
            nonce = data.get("nonce", "")
            body = data.get("body", "")
            
            if not all([signature, timestamp, nonce, body]):
                logger.warning("回调数据缺少必要的签名字段")
                logger.info(f"收到的字段 - signature: {bool(signature)}, timestamp: {bool(timestamp)}, nonce: {bool(nonce)}, body: {bool(body)}")
                return False
            
            # 验证签名
            message = f"{timestamp}\n{nonce}\n{body}\n"
            
            if not self._platform_public_key:
                logger.error("微信支付平台公钥未加载，无法验证签名")
                logger.error("请确保已正确配置平台证书路径: WECHAT_PAY_PLATFORM_CERT_PATH")
                logger.error("当前配置的平台证书路径: {}".format(self.platform_cert_path or "未配置"))
                logger.error("请检查证书文件是否存在且格式正确")
                return False
            
            try:
                # 解码base64签名
                signature_bytes = base64.b64decode(signature)
                
                # 使用微信支付平台公钥验证签名
                self._platform_public_key.verify(
                    signature_bytes,
                    message.encode('utf-8'),
                    padding.PKCS1v15(),
                    hashes.SHA256()
                )
                
                logger.info("微信支付回调签名验证成功")
                return True
                
            except Exception as e:
                logger.error(f"签名验证失败: {str(e)}")
                logger.info(f"验证的消息内容: {repr(message)}")
                return False
            
        except Exception as e:
            logger.error(f"微信支付回调验证异常: {str(e)}")
            return False
    
    def _decrypt_callback_resource(self, resource: Dict) -> Dict:
        """
        解密微信支付回调资源数据
        使用AES-256-GCM解密，参考官方文档
        """
        try:
            ciphertext = resource.get("ciphertext", "")
            nonce = resource.get("nonce", "")
            associated_data = resource.get("associated_data", "")
            
            if not all([ciphertext, nonce, self.api_v3_key]):
                raise ValueError("缺少解密必要参数")
            
            # 将APIv3密钥转换为32字节
            key_bytes = self.api_v3_key.encode('utf-8')
            if len(key_bytes) != 32:
                raise ValueError("APIv3密钥必须是32字节")
            
            # 创建AESGCM实例
            aesgcm = AESGCM(key_bytes)
            
            # 解码base64密文
            ciphertext_bytes = base64.b64decode(ciphertext)
            nonce_bytes = nonce.encode('utf-8')
            associated_data_bytes = associated_data.encode('utf-8') if associated_data else b''
            
            # 解密
            decrypted_data = aesgcm.decrypt(nonce_bytes, ciphertext_bytes, associated_data_bytes)
            
            # 解析JSON
            return json.loads(decrypted_data.decode('utf-8'))
            
        except Exception as e:
            logger.error(f"AES-GCM解密失败: {str(e)}")
            raise

    async def process_callback(self, data: Dict) -> Dict:
        """
        处理微信支付回调
        参考官方文档：https://pay.weixin.qq.com/doc/v3/merchant/4012071382
        """
        try:
            # 解析回调数据
            resource = data.get("resource", {})
            
            if not resource:
                raise ValueError("回调数据缺少resource字段")
            
            # 解密回调资源数据
            decrypted_data = self._decrypt_callback_resource(resource)
            
            logger.info(f"解密后的回调数据: {decrypted_data}")
            
            # 提取订单信息
            order_no = decrypted_data.get("out_trade_no", "")
            payment_no = decrypted_data.get("transaction_id", "")
            trade_state = decrypted_data.get("trade_state", "")
            
            # 状态映射
            status_map = {
                "SUCCESS": "paid",
                "REFUND": "refunded", 
                "NOTPAY": "pending",
                "CLOSED": "cancelled",
                "REVOKED": "cancelled",
                "USERPAYING": "pending",
                "PAYERROR": "failed"
            }
            
            # 获取金额信息
            amount_info = decrypted_data.get("amount", {})
            total_amount = amount_info.get("total", 0)
            payer_total = amount_info.get("payer_total", total_amount)
            
            return {
                "success": True,
                "order_no": order_no,
                "payment_no": payment_no,
                "status": status_map.get(trade_state, "unknown"),
                "amount": float(Decimal(total_amount) / 100),  # 转换为元并转为float
                "payer_amount": float(Decimal(payer_total) / 100),
                "paid_time": decrypted_data.get("success_time"),
                "trade_state": trade_state,
                "trade_state_desc": decrypted_data.get("trade_state_desc", "")
            }
            
        except Exception as e:
            logger.error(f"微信支付回调处理异常: {str(e)}")
            return {
                "success": False,
                "error": str(e)
            }