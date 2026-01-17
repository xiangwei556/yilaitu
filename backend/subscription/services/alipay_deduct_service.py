"""
支付宝周期扣款服务
实现支付宝自动扣费的扣款、查询功能
"""
import hashlib
import base64
import time
import json
import secrets
from typing import Dict, Optional
from datetime import datetime
import httpx
import logging

from backend.passport.app.core.config import settings
from backend.subscription.config import alipay_contract_config

logger = logging.getLogger(__name__)


class AlipayDeductService:
    """支付宝周期扣款服务"""

    def __init__(self):
        """初始化支付宝扣款服务"""
        self.app_id = settings.ALIPAY_APP_ID
        self.private_key = self._load_private_key()
        self.alipay_public_key = self._load_alipay_public_key()
        self.gateway = settings.ALIPAY_GATEWAY
        self.sign_type = settings.ALIPAY_SIGN_TYPE
        self.notify_url = alipay_contract_config.DEDUCT_NOTIFY_URL

    def _load_private_key(self) -> Optional[str]:
        """加载应用私钥"""
        try:
            private_key = getattr(settings, 'ALIPAY_PRIVATE_KEY', '')
            if private_key:
                return private_key
            private_key_path = getattr(settings, 'ALIPAY_PRIVATE_KEY_PATH', '')
            if private_key_path:
                with open(private_key_path, 'r') as f:
                    return f.read()
            return None
        except Exception as e:
            logger.error(f"[AlipayDeduct] 加载私钥失败: {str(e)}")
            return None

    def _load_alipay_public_key(self) -> Optional[str]:
        """加载支付宝公钥"""
        try:
            public_key = getattr(settings, 'ALIPAY_PUBLIC_KEY', '')
            if public_key:
                return public_key
            public_key_path = getattr(settings, 'ALIPAY_ALIPAY_CERT_PATH', '')
            if public_key_path:
                with open(public_key_path, 'r') as f:
                    return f.read()
            return None
        except Exception as e:
            logger.error(f"[AlipayDeduct] 加载支付宝公钥失败: {str(e)}")
            return None

    def _format_private_key(self, private_key: str) -> str:
        """格式化私钥"""
        if '-----BEGIN' in private_key:
            return private_key
        return f"-----BEGIN RSA PRIVATE KEY-----\n{private_key}\n-----END RSA PRIVATE KEY-----"

    def _format_public_key(self, public_key: str) -> str:
        """格式化公钥"""
        if '-----BEGIN' in public_key:
            return public_key
        return f"-----BEGIN PUBLIC KEY-----\n{public_key}\n-----END PUBLIC KEY-----"

    def _sign(self, unsigned_string: str) -> str:
        """RSA2签名"""
        from cryptography.hazmat.primitives import hashes, serialization
        from cryptography.hazmat.primitives.asymmetric import padding

        try:
            key_pem = self._format_private_key(self.private_key)
            private_key = serialization.load_pem_private_key(
                key_pem.encode('utf-8'),
                password=None
            )
            signature = private_key.sign(
                unsigned_string.encode('utf-8'),
                padding.PKCS1v15(),
                hashes.SHA256()
            )
            return base64.b64encode(signature).decode('utf-8')
        except Exception as e:
            logger.error(f"[AlipayDeduct] RSA签名失败: {str(e)}")
            raise

    def _verify_sign(self, params: Dict, sign: str) -> bool:
        """验证支付宝回调签名"""
        from cryptography.hazmat.primitives import hashes, serialization
        from cryptography.hazmat.primitives.asymmetric import padding

        try:
            sorted_params = sorted(params.items(), key=lambda x: x[0])
            unsigned_string = '&'.join([f'{k}={v}' for k, v in sorted_params if v])

            key_pem = self._format_public_key(self.alipay_public_key)
            public_key = serialization.load_pem_public_key(key_pem.encode('utf-8'))

            public_key.verify(
                base64.b64decode(sign),
                unsigned_string.encode('utf-8'),
                padding.PKCS1v15(),
                hashes.SHA256()
            )
            return True
        except Exception as e:
            logger.error(f"[AlipayDeduct] 验签失败: {str(e)}")
            return False

    def generate_out_trade_no(self, contract_id: int) -> str:
        """生成扣款商户订单号"""
        timestamp = int(time.time())
        random_str = secrets.token_hex(4)
        return f"AD{contract_id}_{timestamp}_{random_str}"[:32]

    async def apply_deduct(
        self,
        agreement_no: str,
        out_trade_no: str,
        amount: str,
        subject: str,
        body: str = None
    ) -> Dict:
        """
        申请扣款
        使用 alipay.trade.pay 接口

        Args:
            agreement_no: 支付宝签约协议号
            out_trade_no: 商户订单号
            amount: 扣款金额（元，字符串格式，如 "99.00"）
            subject: 订单标题
            body: 订单描述

        Returns:
            Dict: 扣款结果
        """
        try:
            timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')

            biz_content = {
                'out_trade_no': out_trade_no,
                'total_amount': amount,
                'subject': subject,
                'product_code': 'GENERAL_WITHHOLDING',  # 商家扣款产品码
                'agreement_params': {
                    'agreement_no': agreement_no
                }
            }

            if body:
                biz_content['body'] = body

            params = {
                'app_id': self.app_id,
                'method': alipay_contract_config.DEDUCT_API_METHOD,
                'charset': 'utf-8',
                'sign_type': self.sign_type,
                'timestamp': timestamp,
                'version': '1.0',
                'notify_url': self.notify_url,
                'biz_content': json.dumps(biz_content, ensure_ascii=False, separators=(',', ':'))
            }

            # 签名
            sorted_params = sorted(params.items(), key=lambda x: x[0])
            unsigned_string = '&'.join([f'{k}={v}' for k, v in sorted_params if v])
            params['sign'] = self._sign(unsigned_string)

            logger.info(f"[AlipayDeduct] 申请扣款: agreement_no={agreement_no}, out_trade_no={out_trade_no}, amount={amount}")

            async with httpx.AsyncClient() as client:
                response = await client.post(
                    self.gateway,
                    data=params,
                    timeout=10.0
                )
                response.raise_for_status()

                result = response.json()
                response_key = 'alipay_trade_pay_response'
                data = result.get(response_key, {})

                code = data.get('code', '')

                if code == '10000':
                    # 扣款成功
                    logger.info(f"[AlipayDeduct] 扣款成功: out_trade_no={out_trade_no}, trade_no={data.get('trade_no')}")
                    return {
                        'success': True,
                        'status': 'paid',
                        'out_trade_no': out_trade_no,
                        'trade_no': data.get('trade_no'),
                        'buyer_user_id': data.get('buyer_user_id'),
                        'total_amount': data.get('total_amount'),
                        'gmt_payment': data.get('gmt_payment')
                    }
                elif code == '10003':
                    # 等待用户付款
                    logger.info(f"[AlipayDeduct] 等待付款: out_trade_no={out_trade_no}")
                    return {
                        'success': True,
                        'status': 'pending',
                        'out_trade_no': out_trade_no,
                        'trade_no': data.get('trade_no')
                    }
                elif code == '20000':
                    # 系统繁忙，需要查询
                    logger.warning(f"[AlipayDeduct] 系统繁忙，需查询: out_trade_no={out_trade_no}")
                    return {
                        'success': True,
                        'status': 'unknown',
                        'out_trade_no': out_trade_no,
                        'need_query': True
                    }
                else:
                    # 扣款失败
                    error_code = data.get('sub_code', code)
                    error_msg = data.get('sub_msg', data.get('msg', ''))
                    logger.error(f"[AlipayDeduct] 扣款失败: {error_code} - {error_msg}")
                    return {
                        'success': False,
                        'status': 'failed',
                        'out_trade_no': out_trade_no,
                        'error_code': error_code,
                        'error': error_msg
                    }

        except Exception as e:
            logger.error(f"[AlipayDeduct] 申请扣款异常: {str(e)}")
            return {
                'success': False,
                'status': 'error',
                'out_trade_no': out_trade_no,
                'error': str(e)
            }

    async def query_deduct(self, out_trade_no: str = None, trade_no: str = None) -> Dict:
        """
        查询扣款结果
        使用 alipay.trade.query 接口

        Args:
            out_trade_no: 商户订单号
            trade_no: 支付宝交易号

        Returns:
            Dict: 查询结果
        """
        try:
            timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')

            biz_content = {}
            if trade_no:
                biz_content['trade_no'] = trade_no
            elif out_trade_no:
                biz_content['out_trade_no'] = out_trade_no
            else:
                return {
                    'success': False,
                    'error': '必须提供out_trade_no或trade_no'
                }

            params = {
                'app_id': self.app_id,
                'method': 'alipay.trade.query',
                'charset': 'utf-8',
                'sign_type': self.sign_type,
                'timestamp': timestamp,
                'version': '1.0',
                'biz_content': json.dumps(biz_content, ensure_ascii=False, separators=(',', ':'))
            }

            sorted_params = sorted(params.items(), key=lambda x: x[0])
            unsigned_string = '&'.join([f'{k}={v}' for k, v in sorted_params if v])
            params['sign'] = self._sign(unsigned_string)

            logger.info(f"[AlipayDeduct] 查询扣款结果: out_trade_no={out_trade_no}, trade_no={trade_no}")

            async with httpx.AsyncClient() as client:
                response = await client.post(
                    self.gateway,
                    data=params,
                    timeout=10.0
                )
                response.raise_for_status()

                result = response.json()
                response_key = 'alipay_trade_query_response'
                data = result.get(response_key, {})

                if data.get('code') == '10000':
                    trade_status = data.get('trade_status', '')
                    status_map = {
                        'WAIT_BUYER_PAY': 'pending',
                        'TRADE_CLOSED': 'closed',
                        'TRADE_SUCCESS': 'paid',
                        'TRADE_FINISHED': 'finished'
                    }

                    return {
                        'success': True,
                        'out_trade_no': data.get('out_trade_no'),
                        'trade_no': data.get('trade_no'),
                        'trade_status': trade_status,
                        'status': status_map.get(trade_status, 'unknown'),
                        'total_amount': data.get('total_amount'),
                        'buyer_user_id': data.get('buyer_user_id'),
                        'send_pay_date': data.get('send_pay_date')
                    }
                else:
                    error_code = data.get('sub_code', data.get('code', ''))
                    error_msg = data.get('sub_msg', data.get('msg', ''))
                    return {
                        'success': False,
                        'error_code': error_code,
                        'error': error_msg
                    }

        except Exception as e:
            logger.error(f"[AlipayDeduct] 查询扣款结果异常: {str(e)}")
            return {
                'success': False,
                'error': str(e)
            }

    async def cancel_deduct(self, out_trade_no: str) -> Dict:
        """
        撤销扣款
        用于扣款状态不明确时撤销

        Args:
            out_trade_no: 商户订单号

        Returns:
            Dict: 撤销结果
        """
        try:
            timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')

            biz_content = {
                'out_trade_no': out_trade_no
            }

            params = {
                'app_id': self.app_id,
                'method': 'alipay.trade.cancel',
                'charset': 'utf-8',
                'sign_type': self.sign_type,
                'timestamp': timestamp,
                'version': '1.0',
                'biz_content': json.dumps(biz_content, ensure_ascii=False, separators=(',', ':'))
            }

            sorted_params = sorted(params.items(), key=lambda x: x[0])
            unsigned_string = '&'.join([f'{k}={v}' for k, v in sorted_params if v])
            params['sign'] = self._sign(unsigned_string)

            logger.info(f"[AlipayDeduct] 撤销扣款: out_trade_no={out_trade_no}")

            async with httpx.AsyncClient() as client:
                response = await client.post(
                    self.gateway,
                    data=params,
                    timeout=10.0
                )
                response.raise_for_status()

                result = response.json()
                response_key = 'alipay_trade_cancel_response'
                data = result.get(response_key, {})

                if data.get('code') == '10000':
                    return {
                        'success': True,
                        'out_trade_no': out_trade_no,
                        'action': data.get('action')  # close/refund
                    }
                else:
                    error_code = data.get('sub_code', data.get('code', ''))
                    error_msg = data.get('sub_msg', data.get('msg', ''))
                    return {
                        'success': False,
                        'error_code': error_code,
                        'error': error_msg
                    }

        except Exception as e:
            logger.error(f"[AlipayDeduct] 撤销扣款异常: {str(e)}")
            return {
                'success': False,
                'error': str(e)
            }

    def process_deduct_callback(self, params: Dict) -> Dict:
        """
        处理扣款结果回调

        Args:
            params: 回调参数

        Returns:
            Dict: 处理结果
        """
        try:
            # 提取签名
            sign = params.pop('sign', '')
            sign_type = params.pop('sign_type', '')

            # 验证签名
            if not self._verify_sign(params, sign):
                logger.error("[AlipayDeduct] 扣款回调签名验证失败")
                return {
                    'success': False,
                    'error': '签名验证失败'
                }

            trade_status = params.get('trade_status', '')
            status_map = {
                'WAIT_BUYER_PAY': 'pending',
                'TRADE_CLOSED': 'closed',
                'TRADE_SUCCESS': 'paid',
                'TRADE_FINISHED': 'finished'
            }

            result = {
                'success': True,
                'out_trade_no': params.get('out_trade_no'),
                'trade_no': params.get('trade_no'),
                'trade_status': trade_status,
                'status': status_map.get(trade_status, 'unknown'),
                'total_amount': params.get('total_amount'),
                'buyer_id': params.get('buyer_id'),
                'gmt_payment': params.get('gmt_payment')
            }

            if trade_status == 'TRADE_SUCCESS':
                logger.info(f"[AlipayDeduct] 扣款成功: out_trade_no={result['out_trade_no']}, trade_no={result['trade_no']}")
            elif trade_status == 'TRADE_CLOSED':
                logger.warning(f"[AlipayDeduct] 交易关闭: out_trade_no={result['out_trade_no']}")
            else:
                logger.info(f"[AlipayDeduct] 交易状态更新: out_trade_no={result['out_trade_no']}, status={trade_status}")

            return result

        except Exception as e:
            logger.error(f"[AlipayDeduct] 处理扣款回调异常: {str(e)}")
            return {
                'success': False,
                'error': str(e)
            }

    def generate_callback_response(self, success: bool = True) -> str:
        """生成回调响应"""
        return 'success' if success else 'failure'
