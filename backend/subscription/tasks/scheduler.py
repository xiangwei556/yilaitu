"""
定时任务调度器配置
使用APScheduler实现定时任务调度
"""
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from apscheduler.triggers.interval import IntervalTrigger
import logging

from backend.subscription.tasks import (
    # 扣款任务
    send_wechat_pre_notify_task,
    process_wechat_deduct_task,
    process_alipay_deduct_task,
    retry_failed_deduct_task,
    # 到期任务
    process_expired_subscriptions_task,
    check_expiring_subscriptions_task,
    activate_pending_subscriptions_task,
    # 健康检查任务
    chain_health_check_task,
    sync_contract_status_task,
    cleanup_expired_records_task,
    monitor_deduct_success_rate_task,
)

logger = logging.getLogger(__name__)

# 全局调度器实例
scheduler = AsyncIOScheduler()


def setup_scheduler():
    """
    配置定时任务调度器

    任务执行时间表：
    - 02:00 微信预扣款通知
    - 02:30 支付宝扣款
    - 03:00 签约状态同步
    - 04:00 生效链健康检查
    - 10:00 微信扣款执行
    - 11:00 扣款重试
    - 每5分钟 到期订阅处理
    - 每5分钟 待生效订阅激活
    - 每小时 到期提醒检查
    - 每小时 扣款成功率监控
    - 每周日04:00 过期记录清理
    """

    # 扣款相关任务
    scheduler.add_job(
        send_wechat_pre_notify_task,
        CronTrigger(hour=2, minute=0),
        id='send_wechat_pre_notify',
        name='微信预扣款通知',
        replace_existing=True
    )

    scheduler.add_job(
        process_alipay_deduct_task,
        CronTrigger(hour=2, minute=30),
        id='process_alipay_deduct',
        name='支付宝扣款',
        replace_existing=True
    )

    scheduler.add_job(
        process_wechat_deduct_task,
        CronTrigger(hour=10, minute=0),
        id='process_wechat_deduct',
        name='微信扣款执行',
        replace_existing=True
    )

    scheduler.add_job(
        retry_failed_deduct_task,
        CronTrigger(hour=11, minute=0),
        id='retry_failed_deduct',
        name='扣款重试',
        replace_existing=True
    )

    # 到期处理任务，上线后改为5分钟
    scheduler.add_job(
        process_expired_subscriptions_task,
        IntervalTrigger(minutes=2),
        id='process_expired_subscriptions',
        name='到期订阅处理',
        replace_existing=True
    )

    scheduler.add_job(
        activate_pending_subscriptions_task,
        IntervalTrigger(minutes=2),
        id='activate_pending_subscriptions',
        name='待生效订阅激活',
        replace_existing=True
    )

    scheduler.add_job(
        check_expiring_subscriptions_task,
        #IntervalTrigger(hours=1),
        IntervalTrigger(minutes=2),
        id='check_expiring_subscriptions',
        name='到期提醒检查',
        replace_existing=True
    )

    # 健康检查任务
    scheduler.add_job(
        sync_contract_status_task,
        CronTrigger(hour=3, minute=0),
        id='sync_contract_status',
        name='签约状态同步',
        replace_existing=True
    )

    scheduler.add_job(
        chain_health_check_task,
        CronTrigger(hour=4, minute=0),
        id='chain_health_check',
        name='生效链健康检查',
        replace_existing=True
    )

    scheduler.add_job(
        cleanup_expired_records_task,
        CronTrigger(day_of_week='sun', hour=4, minute=0),
        id='cleanup_expired_records',
        name='过期记录清理',
        replace_existing=True
    )

    scheduler.add_job(
        monitor_deduct_success_rate_task,
        IntervalTrigger(hours=1),
        id='monitor_deduct_success_rate',
        name='扣款成功率监控',
        replace_existing=True
    )

    logger.info("[Scheduler] 定时任务调度器配置完成")


def start_scheduler():
    """启动调度器"""
    if not scheduler.running:
        setup_scheduler()
        scheduler.start()
        logger.info("[Scheduler] 定时任务调度器已启动")


def shutdown_scheduler():
    """关闭调度器"""
    if scheduler.running:
        scheduler.shutdown()
        logger.info("[Scheduler] 定时任务调度器已关闭")


def get_scheduler_jobs():
    """获取所有已注册的任务"""
    return [
        {
            'id': job.id,
            'name': job.name,
            'next_run_time': job.next_run_time.isoformat() if job.next_run_time else None,
            'trigger': str(job.trigger)
        }
        for job in scheduler.get_jobs()
    ]
