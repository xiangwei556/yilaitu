# -*- coding: utf-8 -*-
"""
订阅系统配置文件
包含自动续费、签约、扣款相关的配置
"""
import os


class SubscriptionConfig:
    """订阅系统配置类"""

    # ==================== 自动续费配置 ====================
    # 到期前N天发送预通知
    AUTO_RENEWAL_NOTIFY_DAYS = int(os.getenv("AUTO_RENEWAL_NOTIFY_DAYS", "3"))

    # 扣款最大重试次数
    AUTO_RENEWAL_RETRY_MAX = int(os.getenv("AUTO_RENEWAL_RETRY_MAX", "3"))

    # 重试间隔(天)
    AUTO_RENEWAL_RETRY_INTERVALS = [1, 3, 7]

    # 连续扣款失败N次后关闭自动续费
    AUTO_RENEWAL_FAIL_LIMIT = int(os.getenv("AUTO_RENEWAL_FAIL_LIMIT", "3"))


class WeChatContractConfig:
    """微信委托代扣配置类"""

    # 签约模板ID（需要在微信支付后台申请）
    PLAN_ID = os.getenv("WECHAT_PAP_PLAN_ID", "")

    # 签约通知回调地址
    SIGN_NOTIFY_URL = os.getenv(
        "WECHAT_PAP_SIGN_NOTIFY_URL",
        ""
    )

    # 扣款结果通知回调地址
    DEDUCT_NOTIFY_URL = os.getenv(
        "WECHAT_PAP_DEDUCT_NOTIFY_URL",
        ""
    )

    # 扣款周期(1-3天)
    DEDUCT_DURATION = int(os.getenv("WECHAT_PAP_DEDUCT_DURATION", "3"))

    # 签约API地址
    SIGN_API_URL = "https://api.mch.weixin.qq.com/papay/partner/entrustweb"

    # 扣款API地址
    DEDUCT_API_URL = "https://api.mch.weixin.qq.com/pay/partner/pappayapply"

    # 查询签约状态API地址
    QUERY_CONTRACT_API_URL = "https://api.mch.weixin.qq.com/papay/partner/querycontract"

    # 解约API地址
    CANCEL_CONTRACT_API_URL = "https://api.mch.weixin.qq.com/papay/deletecontract"

    # 预扣款通知API地址(V3)
    PRE_NOTIFY_API_URL = "https://api.mch.weixin.qq.com/v3/partner-papay/contracts/{contract_id}/notify"

    # 扣款频率限制(QPS)
    DEDUCT_QPS_LIMIT = 150

    # 微信回调IP白名单
    CALLBACK_IP_WHITELIST = ["101.226.233.128/25"]


class AlipayContractConfig:
    """支付宝周期扣款配置类"""

    # 周期扣款产品码
    PRODUCT_CODE = os.getenv("ALIPAY_CYCLE_PRODUCT_CODE", "CYCLE_PAY_AUTH")

    # 签约场景码
    SIGN_SCENE = os.getenv("ALIPAY_CYCLE_SIGN_SCENE", "INDUSTRY|CYCLE_PAY")

    # 签约通知回调地址
    SIGN_NOTIFY_URL = os.getenv(
        "ALIPAY_CYCLE_SIGN_NOTIFY_URL",
        ""
    )

    # 扣款结果通知回调地址
    DEDUCT_NOTIFY_URL = os.getenv(
        "ALIPAY_CYCLE_DEDUCT_NOTIFY_URL",
        ""
    )

    # 签约接口名称
    SIGN_API_METHOD = "alipay.user.agreement.page.sign"

    # 扣款接口名称
    DEDUCT_API_METHOD = "alipay.trade.pay"

    # 查询签约状态接口
    QUERY_CONTRACT_API_METHOD = "alipay.user.agreement.query"

    # 解约接口
    CANCEL_CONTRACT_API_METHOD = "alipay.user.agreement.unsign"


class ChainConfig:
    """生效链配置类"""

    # 是否启用生效链健康检查
    HEALTH_CHECK_ENABLED = os.getenv("CHAIN_HEALTH_CHECK_ENABLED", "True").lower() in ("true", "1", "t")

    # 是否启用自动修复
    AUTO_FIX_ENABLED = os.getenv("CHAIN_AUTO_FIX_ENABLED", "True").lower() in ("true", "1", "t")


class MonitorConfig:
    """监控配置类"""

    # 签约成功率阈值
    SIGN_SUCCESS_THRESHOLD = float(os.getenv("MONITOR_SIGN_SUCCESS_THRESHOLD", "0.95"))

    # 扣款成功率阈值
    DEDUCT_SUCCESS_THRESHOLD = float(os.getenv("MONITOR_DEDUCT_SUCCESS_THRESHOLD", "0.90"))

    # 回调处理延迟阈值(秒)
    CALLBACK_LATENCY_THRESHOLD = int(os.getenv("MONITOR_CALLBACK_LATENCY_THRESHOLD", "5"))


class DeductRetryConfig:
    """扣款重试配置"""

    # 最大重试次数
    MAX_RETRY_COUNT = 3

    # 重试间隔(天)
    RETRY_INTERVALS = [1, 3, 7]

    # 错误码处理策略
    # retry: 重试
    # stop: 停止并关闭自动续费
    # retry_later: 延迟重试
    FAIL_ACTIONS = {
        # 微信错误码
        'NOTENOUGH': {'action': 'retry', 'notify_user': True, 'message': '余额不足，请充值后将自动重试'},
        'CONTRACT_NOT_EXIST': {'action': 'stop', 'notify_user': True, 'message': '自动续费协议已失效，请重新签约'},
        'ACCOUNTERROR': {'action': 'stop', 'notify_user': True, 'message': '账户异常'},
        'FREQUENCY_LIMITED': {'action': 'retry_later', 'retry_delay': 3600},
        'SYSTEMERROR': {'action': 'retry', 'notify_user': False},

        # 支付宝错误码
        'ACQ.TRADE_HAS_CLOSE': {'action': 'retry', 'notify_user': False},
        'ACQ.BUYER_BALANCE_NOT_ENOUGH': {'action': 'retry', 'notify_user': True, 'message': '余额不足'},
        'ACQ.AGREEMENT_NOT_EXIST': {'action': 'stop', 'notify_user': True, 'message': '签约协议不存在'},
        'ACQ.BUYER_NOT_EXIST': {'action': 'stop', 'notify_user': True, 'message': '用户不存在'},
    }


# 创建配置实例
subscription_config = SubscriptionConfig()
wechat_contract_config = WeChatContractConfig()
alipay_contract_config = AlipayContractConfig()
chain_config = ChainConfig()
monitor_config = MonitorConfig()
deduct_retry_config = DeductRetryConfig()

# 导出
__all__ = [
    "SubscriptionConfig",
    "WeChatContractConfig",
    "AlipayContractConfig",
    "ChainConfig",
    "MonitorConfig",
    "DeductRetryConfig",
    "subscription_config",
    "wechat_contract_config",
    "alipay_contract_config",
    "chain_config",
    "monitor_config",
    "deduct_retry_config"
]
