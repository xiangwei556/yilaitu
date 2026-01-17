"""
微信委托代扣扣款服务
实现微信自动扣费的预通知、扣款、查询功能
"""
import hashlib
import time
import secrets
import json
from typing import Dict, Optional
from datetime import datetime
import httpx
import logging

from backend.passport.app.core.config import settings
from backend.subscription.config import wechat_contract_config

logger = logging.getLogger(__name__)


class WeChatDeductService:
    """微信委托代扣扣款服务"""

    def __init__(self):
        """初始化微信扣款服务"""
        self.app_id = settings.WECHAT_PAY_APP_ID
        self.mch_id = settings.WECHAT_PAY_MCH_ID
        self.api_key = settings.WECHAT_PAY_API_KEY  # V2接口使用的API密钥
        self.api_v3_key = settings.WECHAT_PAY_API_V3_KEY  # V3接口使用的API密钥
        self.notify_url = wechat_contract_config.DEDUCT_NOTIFY_URL

        # 加载私钥（V3接口需要）
        self._private_key = None
        self._load_private_key()

    def _load_private_key(self):
        """加载商户私钥"""
        try:
            from cryptography.hazmat.primitives.serialization import load_pem_private_key
            private_key_path = settings.WECHAT_PAY_MCH_PRIVATE_KEY_PATH
            if private_key_path:
                with open(private_key_path, 'rb') as f:
                    self._private_key = load_pem_private_key(f.read(), password=None)
                logger.info("[WeChatDeduct] 商户私钥加载成功")
        except Exception as e:
            logger.error(f"[WeChatDeduct] 加载商户私钥失败: {str(e)}")

    def _generate_md5_sign(self, params: Dict) -> str:
        """生成MD5签名（V2接口）"""
        filtered_params = {k: v for k, v in params.items() if v and k != 'sign'}
        sorted_params = sorted(filtered_params.items(), key=lambda x: x[0])
        query_string = '&'.join([f'{k}={v}' for k, v in sorted_params])
        sign_string = f'{query_string}&key={self.api_key}'
        return hashlib.md5(sign_string.encode('utf-8')).hexdigest().upper()

    def _verify_md5_sign(self, params: Dict) -> bool:
        """验证MD5签名"""
        received_sign = params.get('sign', '')
        if not received_sign:
            return False
        calculated_sign = self._generate_md5_sign(params)
        return received_sign == calculated_sign

    def _dict_to_xml(self, data: Dict) -> str:
        """字典转XML"""
        xml_parts = ['<xml>']
        for key, value in data.items():
            if value is not None:
                xml_parts.append(f'<{key}><![CDATA[{value}]]></{key}>')
        xml_parts.append('</xml>')
        return ''.join(xml_parts)

    def _xml_to_dict(self, xml_str: str) -> Dict:
        """XML转字典"""
        import xml.etree.ElementTree as ET
        root = ET.fromstring(xml_str)
        return {child.tag: child.text for child in root}

    def generate_out_trade_no(self, contract_id: int, deduct_time: datetime = None) -> str:
        """
        生成扣款商户订单号

        Args:
            contract_id: 签约协议ID
            deduct_time: 扣款时间

        Returns:
            str: 商户订单号
        """
        timestamp = int(time.time())
        random_str = secrets.token_hex(4)
        return f"D{contract_id}_{timestamp}_{random_str}"[:32]

    async def send_pre_notify(
        self,
        contract_id: str,
        amount: int,
        deduct_duration: int = 3
    ) -> Dict:
        """
        发送预扣款通知（V3接口）
        参考文档：https://pay.weixin.qq.com/doc/v2/partner/4011988373

        微信要求：
        - 扣款前必须发送预通知
        - 当前日期+1天内只能在7:00-22:00发送
        - 扣款窗口期：预通知后第3-9天

        Args:
            contract_id: 微信协议ID
            amount: 预计扣款金额（单位：分）
            deduct_duration: 扣款周期（1-3天）

        Returns:
            Dict: 发送结果
        """
        try:
            from cryptography.hazmat.primitives import hashes
            from cryptography.hazmat.primitives.asymmetric import padding
            import base64

            url = wechat_contract_config.PRE_NOTIFY_API_URL.format(contract_id=contract_id)
            url_path = f"/v3/partner-papay/contracts/{contract_id}/notify"

            body = {
                'sp_mchid': self.mch_id,
                'sp_appid': self.app_id,
                'estimated_amount': {
                    'amount': amount,
                    'currency': 'CNY'
                },
                'deduct_duration': {
                    'count': deduct_duration,
                    'unit': 'DAY'
                }
            }

            body_str = json.dumps(body, ensure_ascii=False, separators=(',', ':'))

            # 生成V3签名
            timestamp = str(int(time.time()))
            nonce = secrets.token_hex(16)
            message = f"POST\n{url_path}\n{timestamp}\n{nonce}\n{body_str}\n"

            signature = self._private_key.sign(
                message.encode('utf-8'),
                padding.PKCS1v15(),
                hashes.SHA256()
            )
            signature_b64 = base64.b64encode(signature).decode('utf-8')

            auth_header = (
                f'WECHATPAY2-SHA256-RSA2048 mchid="{self.mch_id}",'
                f'nonce_str="{nonce}",signature="{signature_b64}",'
                f'timestamp="{timestamp}",serial_no="{settings.WECHAT_PAY_CERT_SERIAL_NO}"'
            )

            headers = {
                'Content-Type': 'application/json',
                'Authorization': auth_header,
                'Accept': 'application/json'
            }

            logger.info(f"[WeChatDeduct] 发送预扣款通知: contract_id={contract_id}, amount={amount}")

            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"https://api.mch.weixin.qq.com{url_path}",
                    content=body_str,
                    headers=headers,
                    timeout=10.0
                )

                # 204表示成功
                if response.status_code == 204:
                    logger.info(f"[WeChatDeduct] 预扣款通知发送成功: contract_id={contract_id}")
                    return {
                        'success': True,
                        'contract_id': contract_id
                    }
                else:
                    error_data = response.json() if response.text else {}
                    error_code = error_data.get('code', '')
                    error_msg = error_data.get('message', response.text)
                    logger.error(f"[WeChatDeduct] 预扣款通知失败: {error_code} - {error_msg}")
                    return {
                        'success': False,
                        'error_code': error_code,
                        'error': error_msg
                    }

        except Exception as e:
            logger.error(f"[WeChatDeduct] 发送预扣款通知异常: {str(e)}")
            return {
                'success': False,
                'error': str(e)
            }

    async def apply_deduct(
        self,
        contract_id: str,
        out_trade_no: str,
        amount: int,
        description: str,
        attach: str = None
    ) -> Dict:
        """
        申请扣款（V2接口）
        参考文档：https://pay.weixin.qq.com/doc/v2/partner/4011988372

        Args:
            contract_id: 微信协议ID
            out_trade_no: 商户订单号
            amount: 扣款金额（单位：分）
            description: 商品描述
            attach: 附加数据

        Returns:
            Dict: 扣款申请结果
        """
        try:
            params = {
                'appid': self.app_id,
                'mch_id': self.mch_id,
                'nonce_str': secrets.token_hex(16),
                'body': description,
                'out_trade_no': out_trade_no,
                'total_fee': str(amount),
                'spbill_create_ip': '127.0.0.1',  # 服务器IP
                'notify_url': self.notify_url,
                'trade_type': 'PAP',  # 委托代扣固定值
                'contract_id': contract_id
            }

            if attach:
                params['attach'] = attach

            params['sign'] = self._generate_md5_sign(params)

            xml_data = self._dict_to_xml(params)
            url = wechat_contract_config.DEDUCT_API_URL

            logger.info(f"[WeChatDeduct] 申请扣款: contract_id={contract_id}, out_trade_no={out_trade_no}, amount={amount}")

            async with httpx.AsyncClient() as client:
                response = await client.post(
                    url,
                    content=xml_data,
                    headers={'Content-Type': 'application/xml'},
                    timeout=10.0
                )
                response.raise_for_status()

                result = self._xml_to_dict(response.text)

                if result.get('return_code') == 'SUCCESS' and result.get('result_code') == 'SUCCESS':
                    logger.info(f"[WeChatDeduct] 扣款申请成功: out_trade_no={out_trade_no}")
                    return {
                        'success': True,
                        'out_trade_no': out_trade_no,
                        'prepay_id': result.get('prepay_id', '')
                    }
                else:
                    error_code = result.get('err_code', '')
                    error_msg = result.get('err_code_des', result.get('return_msg', ''))
                    logger.error(f"[WeChatDeduct] 扣款申请失败: {error_code} - {error_msg}")
                    return {
                        'success': False,
                        'error_code': error_code,
                        'error': error_msg,
                        'out_trade_no': out_trade_no
                    }

        except Exception as e:
            logger.error(f"[WeChatDeduct] 申请扣款异常: {str(e)}")
            return {
                'success': False,
                'error': str(e),
                'out_trade_no': out_trade_no
            }

    async def query_deduct(self, out_trade_no: str) -> Dict:
        """
        查询扣款结果
        参考文档：https://pay.weixin.qq.com/doc/v2/partner/4011988377

        Args:
            out_trade_no: 商户订单号

        Returns:
            Dict: 扣款结果
        """
        try:
            params = {
                'appid': self.app_id,
                'mch_id': self.mch_id,
                'out_trade_no': out_trade_no,
                'nonce_str': secrets.token_hex(16)
            }

            params['sign'] = self._generate_md5_sign(params)

            xml_data = self._dict_to_xml(params)

            # 使用订单查询接口
            url = "https://api.mch.weixin.qq.com/pay/orderquery"

            logger.info(f"[WeChatDeduct] 查询扣款结果: out_trade_no={out_trade_no}")

            async with httpx.AsyncClient() as client:
                response = await client.post(
                    url,
                    content=xml_data,
                    headers={'Content-Type': 'application/xml'},
                    timeout=10.0
                )
                response.raise_for_status()

                result = self._xml_to_dict(response.text)

                if result.get('return_code') == 'SUCCESS' and result.get('result_code') == 'SUCCESS':
                    trade_state = result.get('trade_state', '')
                    status_map = {
                        'SUCCESS': 'paid',
                        'REFUND': 'refunded',
                        'NOTPAY': 'pending',
                        'CLOSED': 'closed',
                        'REVOKED': 'cancelled',
                        'USERPAYING': 'pending',
                        'PAYERROR': 'failed',
                        'ACCEPT': 'accepted'  # 已受理，待扣款
                    }

                    return {
                        'success': True,
                        'out_trade_no': out_trade_no,
                        'transaction_id': result.get('transaction_id', ''),
                        'trade_state': trade_state,
                        'status': status_map.get(trade_state, 'unknown'),
                        'total_fee': int(result.get('total_fee', 0)),
                        'time_end': result.get('time_end')
                    }
                else:
                    error_code = result.get('err_code', '')
                    error_msg = result.get('err_code_des', result.get('return_msg', ''))
                    return {
                        'success': False,
                        'error_code': error_code,
                        'error': error_msg,
                        'out_trade_no': out_trade_no
                    }

        except Exception as e:
            logger.error(f"[WeChatDeduct] 查询扣款结果异常: {str(e)}")
            return {
                'success': False,
                'error': str(e),
                'out_trade_no': out_trade_no
            }

    def process_deduct_callback(self, data: Dict) -> Dict:
        """
        处理扣款结果回调
        参考文档：https://pay.weixin.qq.com/doc/v2/partner/4011988376

        Args:
            data: 回调数据

        Returns:
            Dict: 处理结果
        """
        try:
            # 验证签名
            if not self._verify_md5_sign(data):
                logger.error("[WeChatDeduct] 扣款回调签名验证失败")
                return {
                    'success': False,
                    'error': '签名验证失败'
                }

            return_code = data.get('return_code')
            result_code = data.get('result_code')

            result = {
                'success': True,
                'out_trade_no': data.get('out_trade_no'),
                'transaction_id': data.get('transaction_id'),
                'contract_id': data.get('contract_id'),
                'total_fee': int(data.get('total_fee', 0)),
                'time_end': data.get('time_end')
            }

            if return_code == 'SUCCESS' and result_code == 'SUCCESS':
                # 扣款成功
                trade_state = data.get('trade_state', 'SUCCESS')
                result['trade_state'] = trade_state
                result['status'] = 'paid' if trade_state == 'SUCCESS' else 'pending'
                logger.info(f"[WeChatDeduct] 扣款成功: out_trade_no={result['out_trade_no']}, transaction_id={result['transaction_id']}")
            else:
                # 扣款失败
                error_code = data.get('err_code', '')
                error_msg = data.get('err_code_des', data.get('return_msg', ''))
                result['status'] = 'failed'
                result['error_code'] = error_code
                result['error'] = error_msg
                logger.error(f"[WeChatDeduct] 扣款失败: out_trade_no={result['out_trade_no']}, error={error_code} - {error_msg}")

            return result

        except Exception as e:
            logger.error(f"[WeChatDeduct] 处理扣款回调异常: {str(e)}")
            return {
                'success': False,
                'error': str(e)
            }

    def generate_callback_response(self, success: bool = True, msg: str = 'OK') -> str:
        """生成回调响应XML"""
        return_code = 'SUCCESS' if success else 'FAIL'
        return f"""<xml>
<return_code><![CDATA[{return_code}]]></return_code>
<return_msg><![CDATA[{msg}]]></return_msg>
</xml>"""
