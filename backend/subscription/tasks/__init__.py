"""
订阅系统定时任务模块
包含扣款、到期处理、健康检查等定时任务
"""
from backend.subscription.tasks.deduct_tasks import (
    send_wechat_pre_notify_task,
    process_wechat_deduct_task,
    process_alipay_deduct_task,
    retry_failed_deduct_task,
)
from backend.subscription.tasks.expiration_tasks import (
    process_expired_subscriptions_task,
    check_expiring_subscriptions_task,
    activate_pending_subscriptions_task,
)
from backend.subscription.tasks.health_check_tasks import (
    chain_health_check_task,
    sync_contract_status_task,
    cleanup_expired_records_task,
    monitor_deduct_success_rate_task,
)

__all__ = [
    # 扣款任务
    'send_wechat_pre_notify_task',
    'process_wechat_deduct_task',
    'process_alipay_deduct_task',
    'retry_failed_deduct_task',
    # 到期任务
    'process_expired_subscriptions_task',
    'check_expiring_subscriptions_task',
    'activate_pending_subscriptions_task',
    # 健康检查任务
    'chain_health_check_task',
    'sync_contract_status_task',
    'cleanup_expired_records_task',
    'monitor_deduct_success_rate_task',
]
