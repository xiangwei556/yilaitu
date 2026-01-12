import json
import random
import os
import time
import datetime
from typing import List
from alibabacloud_dysmsapi20170525.client import Client as Dysmsapi20170525Client
from alibabacloud_credentials.client import Client as CredentialClient
from alibabacloud_credentials import models as cred_models
from alibabacloud_tea_openapi import models as open_api_models
from alibabacloud_dysmsapi20170525 import models as dysmsapi_20170525_models
from alibabacloud_tea_util import models as util_models
from backend.passport.app.db.redis import get_redis
from backend.passport.app.core.logging import logger
from backend.passport.app.core.config import settings


def mask_credentials(cred: str) -> str:
    """脱敏显示凭证"""
    if not cred:
        return "None"
    if len(cred) <= 8:
        return "*" * len(cred)
    return cred[:4] + "****" + cred[-4:]


class SmsSender:
    def __init__(self):
        pass

    @staticmethod
    def create_client(access_key_id: str, access_key_secret: str) -> Dysmsapi20170525Client:
        """
        使用AK&SK初始化账号Client
        @return: Client
        @throws Exception
        """
        # 使用静态凭证
        cred_config = cred_models.Config(
            type='access_key',
            access_key_id=access_key_id,
            access_key_secret=access_key_secret
        )
        credential = CredentialClient(cred_config)
        
        config = open_api_models.Config(
            credential=credential
        )
        config.endpoint = f'dysmsapi.aliyuncs.com'
        return Dysmsapi20170525Client(config)

    @staticmethod
    async def send_sms(phone_number: str) -> bool:
        """
        发送短信验证码
        :param phone_number: 手机号
        :return: 是否发送成功
        """
        # 获取阿里云凭证（从配置文件读取）
        access_key_id = settings.ALIBABA_CLOUD_ACCESS_KEY_ID or ''
        access_key_secret = settings.ALIBABA_CLOUD_ACCESS_KEY_SECRET or ''
        
        # 如果配置文件没有，则尝试从环境变量读取（兼容旧方式）
        if not access_key_id:
            access_key_id = os.environ.get('ALIBABA_CLOUD_ACCESS_KEY_ID', '') 
        if not access_key_secret:
            access_key_secret = os.environ.get('ALIBABA_CLOUD_ACCESS_KEY_SECRET', '')
        
        # 记录调用参数
        logger.info("=" * 60)
        logger.info("开始发送短信")
        logger.info("=" * 60)
        logger.info(f"目标手机号: {phone_number}")
        logger.info(f"阿里云 ACCESS_KEY_ID: {mask_credentials(access_key_id)}")
        logger.info(f"阿里云 ACCESS_KEY_SECRET: {mask_credentials(access_key_secret)}")
        logger.info(f"配置来源: {'settings.ALIBABA_CLOUD_ACCESS_KEY_ID' if settings.ALIBABA_CLOUD_ACCESS_KEY_ID else '环境变量'}")
        
        # 更严格的凭证验证
        if not access_key_id or not access_key_secret:
            logger.error("CRITICAL: 阿里云 Access Key 或 Secret 为空！")
            logger.error("请检查以下配置:")
            logger.error("1. settings.ALIBABA_CLOUD_ACCESS_KEY_ID")
            logger.error("2. settings.ALIBABA_CLOUD_ACCESS_KEY_SECRET") 
            logger.error("3. 环境变量 ALIBABA_CLOUD_ACCESS_KEY_ID")
            logger.error("4. 环境变量 ALIBABA_CLOUD_ACCESS_KEY_SECRET")
            return False
        
        # 验证AccessKey格式
        if len(access_key_id) < 10 or len(access_key_secret) < 20:
            logger.error("CRITICAL: AccessKey ID 或 Secret 格式不正确！ ")
            logger.error(f"AccessKey ID长度: {len(access_key_id)}, 期望长度 >= 10")
            logger.error(f"AccessKey Secret长度: {len(access_key_secret)}, 期望长度 >= 20")
            return False
        
        # 检查系统时间（阿里云要求时间误差<15分钟）
        current_time = datetime.datetime.now()
        logger.info(f"当前系统时间: {current_time.strftime('%Y-%m-%d %H:%M:%S')}")
        logger.info(f"时间戳: {int(time.time())}")
        
        # 检查是否接近整点（阿里云整点时刻可能会有时间同步问题）
        if current_time.minute == 0 and current_time.second < 5:
            logger.warning("警告：当前时间接近整点，可能存在时间同步问题，建议等待几秒后重试")
        
        # 生成4位随机验证码
        code = str(random.randint(1000, 9999))
        logger.info(f"生成的验证码: {code}")
        
        # 创建客户端
        try:
            client = SmsSender.create_client(access_key_id, access_key_secret)
            logger.info("阿里云客户端创建成功")
        except Exception as e:
            logger.error(f"创建阿里云客户端失败: {str(e)}")
            logger.error(f"异常详情: {type(e).__name__}")
            logger.error("可能的解决方案:")
            logger.error("1. 检查AccessKey ID和Secret是否正确")
            logger.error("2. 检查网络连接是否正常")
            logger.error("3. 检查系统时间是否正确（阿里云要求时间误差<15分钟）")
            logger.error("4. 检查阿里云账号是否启用短信服务")
            return False
        
        # 构建短信请求
        send_sms_request = dysmsapi_20170525_models.SendSmsRequest(
            phone_numbers=phone_number,
            sign_name='萧腾广州贸易',
            template_code='SMS_500570207',
            template_param=json.dumps({"code": code}, ensure_ascii=False)
        )
        runtime = util_models.RuntimeOptions()
        
        logger.info(f"短信模板参数1: sign_name=萧腾广州贸易, template_code=SMS_500570207")
        logger.info(f"模板内容: {json.dumps({'code': code}, ensure_ascii=False)}")
        
        try:
            # 发送短信
            logger.info("正在调用阿里云短信服务...")
            resp = await client.send_sms_with_options_async(send_sms_request, runtime)
            
            # 记录响应
            logger.info("阿里云短信发送响应:")
            logger.info(json.dumps(resp.body.to_map(), ensure_ascii=False, default=str))
            
            if resp.body.code == 'OK':
                # 存储验证码到Redis，有效期5分钟
                redis = await get_redis()
                key = f"sms_code:{phone_number}"
                await redis.setex(key, 300, code)
                logger.info(f"短信验证码 {code} 已发送至 {phone_number} 并存入Redis")
                logger.info(f"Redis key: {key}, 有效期: 300秒")
                return True
            else:
                logger.error(f"短信发送失败!")
                logger.error(f"错误码: {resp.body.code}")
                logger.error(f"错误消息: {resp.body.message}")
                logger.error(f"请求ID: {resp.body.request_id}")
                if hasattr(resp.body, 'biz_id'):
                    logger.error(f"业务ID: {resp.body.biz_id}")
                return False
                
        except Exception as error:
            logger.error("=" * 60)
            logger.error("短信发送异常")
            logger.error("=" * 60)
            logger.error(f"异常类型: {type(error).__name__}")
            logger.error(f"异常信息: {str(error)}")
            
            # 特殊处理签名错误
            if "SignatureDoesNotMatch" in str(error):
                logger.error("=" * 60)
                logger.error("签名验证失败 - 常见解决方案:")
                logger.error("1. 检查AccessKey ID和AccessKey Secret是否正确")
                logger.error("2. 检查AccessKey是否已启用短信服务权限")
                logger.error("3. 检查系统时间是否正确（误差<15分钟）")
                logger.error("4. 检查短信签名是否已审核通过")
                logger.error("5. 检查短信模板是否已审核通过")
                logger.error("6. 尝试重新生成AccessKey")
                logger.error("=" * 60)
            
            # 如果有详细信息，记录更多上下文
            if hasattr(error, 'args'):
                logger.error(f"异常参数: {error.args}")
            if hasattr(error, '__traceback__'):
                import traceback
                logger.error(f"异常堆栈:\n{''.join(traceback.format_tb(error.__traceback__))}")
            
            return False

    @staticmethod
    async def verify_code(phone_number: str, code: str) -> bool:
        """
        校验验证码
        :param phone_number: 手机号
        :param code: 验证码
        :return: 是否校验通过
        """
        try:
            redis = await get_redis()
            key = f"sms_code:{phone_number}"
            saved_code = await redis.get(key)
            
            if saved_code and saved_code == code:
                # 验证成功后删除验证码
                await redis.delete(key)
                logger.info(f"验证码校验成功，已删除Redis中的验证码")
                return True
            elif saved_code:
                logger.warning(f"验证码校验失败，输入: {code}, 正确: {saved_code}")
                return False
            else:
                logger.warning(f"验证码已过期或不存在，手机号: {phone_number}")
                return False
        except Exception as e:
            logger.error(f"校验验证码异常: {e}")
            return False
