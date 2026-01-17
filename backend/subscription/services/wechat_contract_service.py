"""
微信委托代扣签约服务
实现微信自动扣费的签约、解约、查询功能
"""
import hashlib
import time
import secrets
import json
import urllib.parse
from typing import Dict, Optional
from datetime import datetime
import httpx
import logging

from backend.passport.app.core.config import settings
from backend.subscription.config import wechat_contract_config

logger = logging.getLogger(__name__)


class WeChatContractService:
    """微信委托代扣签约服务"""

    def __init__(self):
        """初始化微信签约服务"""
        self.app_id = settings.WECHAT_PAY_APP_ID
        self.mch_id = settings.WECHAT_PAY_MCH_ID
        self.api_key = settings.WECHAT_PAY_API_KEY  # V2接口使用的API密钥
        self.plan_id = wechat_contract_config.PLAN_ID
        self.sign_notify_url = wechat_contract_config.SIGN_NOTIFY_URL
        self.deduct_notify_url = wechat_contract_config.DEDUCT_NOTIFY_URL

        # 检查配置
        if not all([self.app_id, self.mch_id, self.api_key]):
            logger.warning("微信支付签约配置不完整")

    def _generate_md5_sign(self, params: Dict) -> str:
        """
        生成MD5签名
        参考：https://pay.weixin.qq.com/doc/v2/partner/4011988365

        Args:
            params: 待签名参数字典

        Returns:
            str: MD5签名（大写）
        """
        # 1. 过滤空值和sign字段
        filtered_params = {k: v for k, v in params.items() if v and k != 'sign'}

        # 2. 按字典序排序
        sorted_params = sorted(filtered_params.items(), key=lambda x: x[0])

        # 3. 拼接成URL键值对格式
        query_string = '&'.join([f'{k}={v}' for k, v in sorted_params])

        # 4. 拼接API密钥
        sign_string = f'{query_string}&key={self.api_key}'

        # 5. MD5加密并转大写
        sign = hashlib.md5(sign_string.encode('utf-8')).hexdigest().upper()

        logger.debug(f"[WeChatContract] 签名字符串: {query_string}&key=***")
        logger.debug(f"[WeChatContract] 生成签名: {sign}")

        return sign

    def _verify_md5_sign(self, params: Dict) -> bool:
        """
        验证MD5签名

        Args:
            params: 包含sign字段的参数字典

        Returns:
            bool: 签名是否有效
        """
        received_sign = params.get('sign', '')
        if not received_sign:
            return False

        calculated_sign = self._generate_md5_sign(params)
        return received_sign == calculated_sign

    def generate_contract_code(self, user_id: int) -> str:
        """
        生成商户侧协议号
        格式：CONTRACT_{user_id}_{timestamp}_{random}

        Args:
            user_id: 用户ID

        Returns:
            str: 协议号（最长32字符）
        """
        timestamp = int(time.time())
        random_str = secrets.token_hex(4)  # 8字符随机串
        contract_code = f"C{user_id}_{timestamp}_{random_str}"
        # 确保不超过32字符
        return contract_code[:32]

    def generate_sign_url(
        self,
        contract_code: str,
        display_account: str,
        request_serial: int,
        return_web: int = 1
    ) -> Dict:
        """
        生成签约跳转URL
        参考文档：https://pay.weixin.qq.com/doc/v2/partner/4011988365

        Args:
            contract_code: 商户侧协议号
            display_account: 签约展示账号（如手机号、用户名）
            request_serial: 请求序列号（不能有前导零）
            return_web: 签约后返回控制，1=跳转回商户页面

        Returns:
            Dict: 包含签约URL和参数
        """
        try:
            timestamp = str(int(time.time()))

            params = {
                'appid': self.app_id,
                'mch_id': self.mch_id,
                'plan_id': self.plan_id,
                'contract_code': contract_code,
                'request_serial': str(request_serial),
                'contract_display_account': display_account,
                'notify_url': self.sign_notify_url,
                'version': '1.0',
                'timestamp': timestamp,
                'return_web': str(return_web)
            }

            # 生成签名
            params['sign'] = self._generate_md5_sign(params)

            # 构建签约URL
            base_url = wechat_contract_config.SIGN_API_URL
            # URL编码参数
            encoded_params = {k: urllib.parse.quote(str(v), safe='') for k, v in params.items()}
            query_string = '&'.join([f'{k}={v}' for k, v in encoded_params.items()])
            sign_url = f"{base_url}?{query_string}"

            logger.info(f"[WeChatContract] 生成签约URL: contract_code={contract_code}")

            return {
                'success': True,
                'sign_url': sign_url,
                'contract_code': contract_code,
                'params': params
            }

        except Exception as e:
            logger.error(f"[WeChatContract] 生成签约URL失败: {str(e)}")
            return {
                'success': False,
                'error': str(e)
            }

    async def query_contract(
        self,
        contract_id: str = None,
        plan_id: str = None,
        contract_code: str = None
    ) -> Dict:
        """
        查询签约状态
        参考文档：https://pay.weixin.qq.com/doc/v2/partner/4011988379

        Args:
            contract_id: 微信返回的协议ID（二选一）
            plan_id: 签约模板ID
            contract_code: 商户侧协议号（二选一）

        Returns:
            Dict: 签约状态信息
        """
        try:
            params = {
                'appid': self.app_id,
                'mch_id': self.mch_id,
                'nonce_str': secrets.token_hex(16)
            }

            # 使用contract_id或plan_id+contract_code查询
            if contract_id:
                params['contract_id'] = contract_id
            elif plan_id and contract_code:
                params['plan_id'] = plan_id
                params['contract_code'] = contract_code
            else:
                return {
                    'success': False,
                    'error': '必须提供contract_id或plan_id+contract_code'
                }

            params['sign'] = self._generate_md5_sign(params)

            # 转换为XML
            xml_data = self._dict_to_xml(params)

            url = wechat_contract_config.QUERY_CONTRACT_API_URL
            logger.info(f"[WeChatContract] 查询签约状态: contract_id={contract_id}, contract_code={contract_code}")

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
                    # 合约状态：0=已签约 1=未签约/已解约 9=签约进行中
                    contract_state = result.get('contract_state', '')
                    state_map = {
                        '0': 'signed',
                        '1': 'unsigned',
                        '9': 'signing'
                    }

                    return {
                        'success': True,
                        'contract_id': result.get('contract_id'),
                        'contract_code': result.get('contract_code'),
                        'state': state_map.get(contract_state, 'unknown'),
                        'state_code': contract_state,
                        'openid': result.get('openid'),
                        'signed_time': result.get('contract_signed_time'),
                        'expired_time': result.get('contract_expired_time'),
                        'terminated_time': result.get('contract_terminated_time'),
                        'terminate_mode': result.get('contract_terminate_mode')
                    }
                else:
                    error_code = result.get('err_code', '')
                    error_msg = result.get('err_code_des', result.get('return_msg', ''))
                    logger.error(f"[WeChatContract] 查询签约状态失败: {error_code} - {error_msg}")
                    return {
                        'success': False,
                        'error_code': error_code,
                        'error': error_msg
                    }

        except Exception as e:
            logger.error(f"[WeChatContract] 查询签约状态异常: {str(e)}")
            return {
                'success': False,
                'error': str(e)
            }

    async def cancel_contract(
        self,
        contract_id: str = None,
        plan_id: str = None,
        contract_code: str = None,
        reason: str = '用户主动解约'
    ) -> Dict:
        """
        解除签约协议
        参考文档：https://pay.weixin.qq.com/doc/v2/partner/4011988377

        Args:
            contract_id: 微信返回的协议ID
            plan_id: 签约模板ID
            contract_code: 商户侧协议号
            reason: 解约原因

        Returns:
            Dict: 解约结果
        """
        try:
            params = {
                'appid': self.app_id,
                'mch_id': self.mch_id,
                'nonce_str': secrets.token_hex(16),
                'contract_termination_remark': reason,
                'version': '1.0'
            }

            # 使用contract_id或plan_id+contract_code
            if contract_id:
                params['contract_id'] = contract_id
            elif plan_id and contract_code:
                params['plan_id'] = plan_id
                params['contract_code'] = contract_code
            else:
                return {
                    'success': False,
                    'error': '必须提供contract_id或plan_id+contract_code'
                }

            params['sign'] = self._generate_md5_sign(params)

            xml_data = self._dict_to_xml(params)

            url = wechat_contract_config.CANCEL_CONTRACT_API_URL
            logger.info(f"[WeChatContract] 解除签约: contract_id={contract_id}, contract_code={contract_code}")

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
                    return {
                        'success': True,
                        'contract_id': result.get('contract_id')
                    }
                else:
                    error_code = result.get('err_code', '')
                    error_msg = result.get('err_code_des', result.get('return_msg', ''))
                    logger.error(f"[WeChatContract] 解除签约失败: {error_code} - {error_msg}")
                    return {
                        'success': False,
                        'error_code': error_code,
                        'error': error_msg
                    }

        except Exception as e:
            logger.error(f"[WeChatContract] 解除签约异常: {str(e)}")
            return {
                'success': False,
                'error': str(e)
            }

    def process_sign_callback(self, data: Dict) -> Dict:
        """
        处理签约结果回调
        参考文档：https://pay.weixin.qq.com/doc/v2/partner/4011988378

        Args:
            data: 回调数据字典

        Returns:
            Dict: 处理结果
        """
        try:
            # 验证签名
            if not self._verify_md5_sign(data):
                logger.error("[WeChatContract] 签约回调签名验证失败")
                return {
                    'success': False,
                    'error': '签名验证失败'
                }

            return_code = data.get('return_code')
            result_code = data.get('result_code')

            if return_code == 'SUCCESS' and result_code == 'SUCCESS':
                # 签约成功
                change_type = data.get('change_type')  # ADD=签约 DELETE=解约

                result = {
                    'success': True,
                    'change_type': change_type,
                    'contract_id': data.get('contract_id'),
                    'contract_code': data.get('contract_code'),
                    'plan_id': data.get('plan_id'),
                    'openid': data.get('openid'),
                    'operate_time': data.get('operate_time'),
                    'request_serial': data.get('request_serial')
                }

                if change_type == 'ADD':
                    logger.info(f"[WeChatContract] 用户签约成功: contract_id={result['contract_id']}")
                elif change_type == 'DELETE':
                    logger.info(f"[WeChatContract] 用户解约成功: contract_id={result['contract_id']}")

                return result
            else:
                error_code = data.get('err_code', '')
                error_msg = data.get('err_code_des', data.get('return_msg', ''))
                logger.error(f"[WeChatContract] 签约回调失败: {error_code} - {error_msg}")
                return {
                    'success': False,
                    'error_code': error_code,
                    'error': error_msg
                }

        except Exception as e:
            logger.error(f"[WeChatContract] 处理签约回调异常: {str(e)}")
            return {
                'success': False,
                'error': str(e)
            }

    def _dict_to_xml(self, data: Dict) -> str:
        """字典转XML"""
        xml_parts = ['<xml>']
        for key, value in data.items():
            if value:
                xml_parts.append(f'<{key}><![CDATA[{value}]]></{key}>')
        xml_parts.append('</xml>')
        return ''.join(xml_parts)

    def _xml_to_dict(self, xml_str: str) -> Dict:
        """XML转字典"""
        import xml.etree.ElementTree as ET
        root = ET.fromstring(xml_str)
        return {child.tag: child.text for child in root}

    def generate_callback_response(self, success: bool = True, msg: str = 'OK') -> str:
        """
        生成回调响应XML

        Args:
            success: 是否成功
            msg: 消息

        Returns:
            str: XML响应
        """
        return_code = 'SUCCESS' if success else 'FAIL'
        return f"""<xml>
<return_code><![CDATA[{return_code}]]></return_code>
<return_msg><![CDATA[{msg}]]></return_msg>
</xml>"""
