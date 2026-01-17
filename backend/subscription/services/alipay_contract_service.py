"""
支付宝周期扣款签约服务
实现支付宝自动扣费的签约、解约、查询功能
"""
import hashlib
import base64
import time
import json
import secrets
from typing import Dict, Optional
from datetime import datetime
from urllib.parse import quote_plus
import httpx
import logging

from backend.passport.app.core.config import settings
from backend.subscription.config import alipay_contract_config

logger = logging.getLogger(__name__)


class AlipayContractService:
    """支付宝周期扣款签约服务"""

    def __init__(self):
        """初始化支付宝签约服务"""
        self.app_id = settings.ALIPAY_APP_ID
        self.private_key = self._load_private_key()
        self.alipay_public_key = self._load_alipay_public_key()
        self.gateway = settings.ALIPAY_GATEWAY
        self.sign_type = settings.ALIPAY_SIGN_TYPE
        self.sign_notify_url = alipay_contract_config.SIGN_NOTIFY_URL
        self.deduct_notify_url = alipay_contract_config.DEDUCT_NOTIFY_URL

        # 检查配置
        if not all([self.app_id, self.private_key]):
            logger.warning("支付宝签约配置不完整")

    def _load_private_key(self) -> Optional[str]:
        """加载应用私钥"""
        try:
            # 优先从环境变量读取
            private_key = getattr(settings, 'ALIPAY_PRIVATE_KEY', '')
            if private_key:
                return private_key

            # 从文件读取
            private_key_path = getattr(settings, 'ALIPAY_PRIVATE_KEY_PATH', '')
            if private_key_path:
                with open(private_key_path, 'r') as f:
                    return f.read()

            return None
        except Exception as e:
            logger.error(f"[AlipayContract] 加载私钥失败: {str(e)}")
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
            logger.error(f"[AlipayContract] 加载支付宝公钥失败: {str(e)}")
            return None

    def _format_private_key(self, private_key: str) -> str:
        """格式化私钥"""
        if '-----BEGIN' in private_key:
            return private_key
        # 添加PEM头尾
        return f"-----BEGIN RSA PRIVATE KEY-----\n{private_key}\n-----END RSA PRIVATE KEY-----"

    def _format_public_key(self, public_key: str) -> str:
        """格式化公钥"""
        if '-----BEGIN' in public_key:
            return public_key
        return f"-----BEGIN PUBLIC KEY-----\n{public_key}\n-----END PUBLIC KEY-----"

    def _sign(self, unsigned_string: str) -> str:
        """
        RSA2签名

        Args:
            unsigned_string: 待签名字符串

        Returns:
            str: Base64编码的签名
        """
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
            logger.error(f"[AlipayContract] RSA签名失败: {str(e)}")
            raise

    def _verify_sign(self, params: Dict, sign: str) -> bool:
        """
        验证支付宝回调签名

        Args:
            params: 回调参数（不含sign和sign_type）
            sign: 签名

        Returns:
            bool: 签名是否有效
        """
        from cryptography.hazmat.primitives import hashes, serialization
        from cryptography.hazmat.primitives.asymmetric import padding

        try:
            # 排序并拼接
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
            logger.error(f"[AlipayContract] 验签失败: {str(e)}")
            return False

    def generate_agreement_no(self, user_id: int) -> str:
        """
        生成商户侧签约号

        Args:
            user_id: 用户ID

        Returns:
            str: 签约号
        """
        timestamp = int(time.time())
        random_str = secrets.token_hex(4)
        return f"ALI{user_id}_{timestamp}_{random_str}"[:32]

    def generate_sign_url(
        self,
        external_agreement_no: str,
        sign_scene: str = None,
        external_logon_id: str = None,
        return_url: str = None
    ) -> Dict:
        """
        生成签约跳转URL

        Args:
            external_agreement_no: 商户签约号
            sign_scene: 签约场景码
            external_logon_id: 用户标识（手机号、邮箱等）
            return_url: 签约完成后返回地址

        Returns:
            Dict: 包含签约URL
        """
        try:
            timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')

            # 业务参数
            biz_content = {
                'personal_product_code': alipay_contract_config.PRODUCT_CODE,
                'sign_scene': sign_scene or alipay_contract_config.SIGN_SCENE,
                'external_agreement_no': external_agreement_no,
            }

            if external_logon_id:
                biz_content['external_logon_id'] = external_logon_id

            # 周期扣款参数
            biz_content['period_rule_params'] = {
                'period_type': 'DAY',
                'period': 30,  # 30天周期
                'execute_time': datetime.now().strftime('%Y-%m-%d'),
                'single_amount': 999.00,  # 单次最大扣款金额
                'total_amount': 99999.00  # 总扣款金额上限
            }

            # 公共参数
            params = {
                'app_id': self.app_id,
                'method': alipay_contract_config.SIGN_API_METHOD,
                'charset': 'utf-8',
                'sign_type': self.sign_type,
                'timestamp': timestamp,
                'version': '1.0',
                'notify_url': self.sign_notify_url,
                'biz_content': json.dumps(biz_content, ensure_ascii=False, separators=(',', ':'))
            }

            if return_url:
                params['return_url'] = return_url

            # 生成签名
            sorted_params = sorted(params.items(), key=lambda x: x[0])
            unsigned_string = '&'.join([f'{k}={v}' for k, v in sorted_params if v])
            sign = self._sign(unsigned_string)
            params['sign'] = sign

            # 构建URL
            encoded_params = {k: quote_plus(str(v)) for k, v in params.items()}
            query_string = '&'.join([f'{k}={v}' for k, v in encoded_params.items()])
            sign_url = f"{self.gateway}?{query_string}"

            logger.info(f"[AlipayContract] 生成签约URL: external_agreement_no={external_agreement_no}")

            return {
                'success': True,
                'sign_url': sign_url,
                'external_agreement_no': external_agreement_no,
                'params': params
            }

        except Exception as e:
            logger.error(f"[AlipayContract] 生成签约URL失败: {str(e)}")
            return {
                'success': False,
                'error': str(e)
            }

    async def query_agreement(self, agreement_no: str = None, external_agreement_no: str = None) -> Dict:
        """
        查询签约状态

        Args:
            agreement_no: 支付宝返回的协议号
            external_agreement_no: 商户签约号

        Returns:
            Dict: 签约状态
        """
        try:
            timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')

            biz_content = {
                'personal_product_code': alipay_contract_config.PRODUCT_CODE,
            }

            if agreement_no:
                biz_content['agreement_no'] = agreement_no
            elif external_agreement_no:
                biz_content['external_agreement_no'] = external_agreement_no
            else:
                return {
                    'success': False,
                    'error': '必须提供agreement_no或external_agreement_no'
                }

            params = {
                'app_id': self.app_id,
                'method': alipay_contract_config.QUERY_CONTRACT_API_METHOD,
                'charset': 'utf-8',
                'sign_type': self.sign_type,
                'timestamp': timestamp,
                'version': '1.0',
                'biz_content': json.dumps(biz_content, ensure_ascii=False, separators=(',', ':'))
            }

            # 签名
            sorted_params = sorted(params.items(), key=lambda x: x[0])
            unsigned_string = '&'.join([f'{k}={v}' for k, v in sorted_params if v])
            params['sign'] = self._sign(unsigned_string)

            logger.info(f"[AlipayContract] 查询签约状态: agreement_no={agreement_no}, external_agreement_no={external_agreement_no}")

            async with httpx.AsyncClient() as client:
                response = await client.post(
                    self.gateway,
                    data=params,
                    timeout=10.0
                )
                response.raise_for_status()

                result = response.json()
                response_key = 'alipay_user_agreement_query_response'
                data = result.get(response_key, {})

                if data.get('code') == '10000':
                    # 状态映射
                    status = data.get('status', '')
                    state_map = {
                        'NORMAL': 'signed',
                        'UNSIGN': 'unsigned',
                        'STOP': 'stopped',
                        'TEMP': 'temporary'
                    }

                    return {
                        'success': True,
                        'agreement_no': data.get('agreement_no'),
                        'external_agreement_no': data.get('external_agreement_no'),
                        'state': state_map.get(status, 'unknown'),
                        'status': status,
                        'alipay_user_id': data.get('alipay_logon_id'),
                        'sign_time': data.get('sign_time'),
                        'valid_time': data.get('valid_time'),
                        'invalid_time': data.get('invalid_time')
                    }
                else:
                    error_code = data.get('code', '')
                    error_msg = data.get('sub_msg', data.get('msg', ''))
                    logger.error(f"[AlipayContract] 查询签约状态失败: {error_code} - {error_msg}")
                    return {
                        'success': False,
                        'error_code': error_code,
                        'error': error_msg
                    }

        except Exception as e:
            logger.error(f"[AlipayContract] 查询签约状态异常: {str(e)}")
            return {
                'success': False,
                'error': str(e)
            }

    async def cancel_agreement(
        self,
        agreement_no: str = None,
        external_agreement_no: str = None,
        reason: str = '用户主动解约'
    ) -> Dict:
        """
        解除签约协议

        Args:
            agreement_no: 支付宝协议号
            external_agreement_no: 商户签约号
            reason: 解约原因

        Returns:
            Dict: 解约结果
        """
        try:
            timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')

            biz_content = {
                'personal_product_code': alipay_contract_config.PRODUCT_CODE,
                'agreement_unsign_reason': reason
            }

            if agreement_no:
                biz_content['agreement_no'] = agreement_no
            elif external_agreement_no:
                biz_content['external_agreement_no'] = external_agreement_no
            else:
                return {
                    'success': False,
                    'error': '必须提供agreement_no或external_agreement_no'
                }

            params = {
                'app_id': self.app_id,
                'method': alipay_contract_config.CANCEL_CONTRACT_API_METHOD,
                'charset': 'utf-8',
                'sign_type': self.sign_type,
                'timestamp': timestamp,
                'version': '1.0',
                'biz_content': json.dumps(biz_content, ensure_ascii=False, separators=(',', ':'))
            }

            # 签名
            sorted_params = sorted(params.items(), key=lambda x: x[0])
            unsigned_string = '&'.join([f'{k}={v}' for k, v in sorted_params if v])
            params['sign'] = self._sign(unsigned_string)

            logger.info(f"[AlipayContract] 解除签约: agreement_no={agreement_no}, external_agreement_no={external_agreement_no}")

            async with httpx.AsyncClient() as client:
                response = await client.post(
                    self.gateway,
                    data=params,
                    timeout=10.0
                )
                response.raise_for_status()

                result = response.json()
                response_key = 'alipay_user_agreement_unsign_response'
                data = result.get(response_key, {})

                if data.get('code') == '10000':
                    return {
                        'success': True
                    }
                else:
                    error_code = data.get('code', '')
                    error_msg = data.get('sub_msg', data.get('msg', ''))
                    logger.error(f"[AlipayContract] 解除签约失败: {error_code} - {error_msg}")
                    return {
                        'success': False,
                        'error_code': error_code,
                        'error': error_msg
                    }

        except Exception as e:
            logger.error(f"[AlipayContract] 解除签约异常: {str(e)}")
            return {
                'success': False,
                'error': str(e)
            }

    def process_sign_callback(self, params: Dict) -> Dict:
        """
        处理签约结果回调

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
                logger.error("[AlipayContract] 签约回调签名验证失败")
                return {
                    'success': False,
                    'error': '签名验证失败'
                }

            # 解析通知类型
            notify_type = params.get('notify_type', '')
            status = params.get('status', '')

            result = {
                'success': True,
                'notify_type': notify_type,
                'agreement_no': params.get('agreement_no'),
                'external_agreement_no': params.get('external_agreement_no'),
                'alipay_user_id': params.get('alipay_user_id'),
                'sign_time': params.get('sign_time'),
                'status': status
            }

            if notify_type == 'dut_user_sign':
                # 用户签约通知
                if status == 'NORMAL':
                    logger.info(f"[AlipayContract] 用户签约成功: agreement_no={result['agreement_no']}")
                    result['change_type'] = 'ADD'
                else:
                    logger.warning(f"[AlipayContract] 签约状态异常: status={status}")
            elif notify_type == 'dut_user_unsign':
                # 用户解约通知
                logger.info(f"[AlipayContract] 用户解约: agreement_no={result['agreement_no']}")
                result['change_type'] = 'DELETE'
            else:
                logger.warning(f"[AlipayContract] 未知通知类型: {notify_type}")

            return result

        except Exception as e:
            logger.error(f"[AlipayContract] 处理签约回调异常: {str(e)}")
            return {
                'success': False,
                'error': str(e)
            }

    def generate_callback_response(self, success: bool = True) -> str:
        """生成回调响应"""
        return 'success' if success else 'failure'
