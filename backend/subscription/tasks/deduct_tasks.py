"""
扣款相关定时任务
包含预通知、扣款执行、失败重试等任务
"""
import asyncio
from datetime import datetime, timedelta
from typing import List
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_
import logging

from backend.passport.app.db.session import SessionLocal
from backend.passport.app.db.redis import get_redis
from backend.payment.models.contract import (
    PaymentContract,
    AutoDeductRecord,
    ContractStatus,
    DeductRecordStatus,
)
from backend.membership.models.subscription import Subscription, SubscriptionStatus
from backend.subscription.services.wechat_deduct_service import WeChatDeductService
from backend.subscription.services.alipay_deduct_service import AlipayDeductService
from backend.subscription.services.subscription_service import SubscriptionService
from backend.subscription.config import subscription_config, wechat_contract_config, deduct_retry_config
from backend.common.distributed_lock import DistributedLock

logger = logging.getLogger(__name__)


async def send_wechat_pre_notify_task():
    """
    发送微信预扣款通知
    每天凌晨2点执行

    微信委托代扣要求在扣款前发送预通知：
    - 预通知发送后需等待扣款窗口期（3-9天）才能扣款
    - 需要提前N天发送预通知
    """
    logger.info("[DeductTask] 开始执行微信预扣款通知任务")

    db: Session = SessionLocal()
    redis_client = await get_redis()

    try:
        # 使用分布式锁防止并发执行
        lock = DistributedLock(redis_client, "task:wechat_pre_notify", expire=300)
        if not await lock.acquire():
            logger.info("[DeductTask] 微信预通知任务正在执行中，跳过")
            return

        try:
            # 查询需要发送预通知的签约协议
            # 条件：已签约、微信支付、有即将到期的自动续费订阅
            notify_days = subscription_config.AUTO_RENEWAL_NOTIFY_DAYS + wechat_contract_config.DEDUCT_DURATION
            expire_before = datetime.now() + timedelta(days=notify_days)

            # 查询即将到期且需要预通知的订阅
            subscriptions = db.query(Subscription).filter(
                and_(
                    Subscription.status == SubscriptionStatus.ACTIVE,
                    Subscription.is_auto_renewal == 1,
                    Subscription.expiration_time <= expire_before,
                    Subscription.expiration_time > datetime.now(),
                    Subscription.contract_id.isnot(None)
                )
            ).all()

            logger.info(f"[DeductTask] 找到{len(subscriptions)}个需要预通知的订阅")

            wechat_service = WeChatDeductService()
            notified_count = 0

            for sub in subscriptions:
                try:
                    # 获取签约协议
                    contract = db.query(PaymentContract).filter(
                        and_(
                            PaymentContract.id == sub.contract_id,
                            PaymentContract.status == ContractStatus.SIGNED,
                            PaymentContract.payment_method == 'wechat'
                        )
                    ).first()

                    if not contract:
                        continue

                    # 检查是否已发送过预通知
                    existing_record = db.query(AutoDeductRecord).filter(
                        and_(
                            AutoDeductRecord.contract_id == contract.id,
                            AutoDeductRecord.subscription_id == sub.id,
                            AutoDeductRecord.status.in_([
                                DeductRecordStatus.NOTIFIED,
                                DeductRecordStatus.DEDUCTING,
                                DeductRecordStatus.SUCCESS
                            ])
                        )
                    ).first()

                    if existing_record:
                        logger.debug(f"[DeductTask] 订阅{sub.id}已发送过预通知，跳过")
                        continue

                    # 发送预通知
                    amount = int(contract.deduct_amount * 100)  # 转换为分
                    result = await wechat_service.send_pre_notify(
                        contract_id=contract.contract_id,
                        amount=amount,
                        deduct_duration=wechat_contract_config.DEDUCT_DURATION
                    )

                    if result.get('success'):
                        # 创建扣款记录
                        from backend.subscription.services.subscription_service import generate_record_sn
                        record = AutoDeductRecord(
                            record_sn=generate_record_sn(),
                            contract_id=contract.id,
                            user_id=contract.user_id,
                            subscription_id=sub.id,
                            amount=contract.deduct_amount,
                            payment_method='wechat',
                            status=DeductRecordStatus.NOTIFIED,
                            notify_time=datetime.now(),
                        )
                        db.add(record)
                        db.commit()

                        notified_count += 1
                        logger.info(f"[DeductTask] 预通知发送成功: subscription_id={sub.id}, contract_id={contract.id}")
                    else:
                        logger.error(f"[DeductTask] 预通知发送失败: {result.get('error')}")

                except Exception as e:
                    logger.error(f"[DeductTask] 处理订阅{sub.id}预通知异常: {str(e)}")
                    continue

            logger.info(f"[DeductTask] 微信预通知任务完成，成功发送{notified_count}条")

        finally:
            await lock.release()

    except Exception as e:
        logger.error(f"[DeductTask] 微信预通知任务异常: {str(e)}")
    finally:
        db.close()


async def process_wechat_deduct_task():
    """
    处理微信扣款
    每天上午10点执行

    在预通知发送后的扣款窗口期内执行扣款
    """
    logger.info("[DeductTask] 开始执行微信扣款任务")

    db: Session = SessionLocal()
    redis_client = await get_redis()

    try:
        lock = DistributedLock(redis_client, "task:wechat_deduct", expire=600)
        if not await lock.acquire():
            logger.info("[DeductTask] 微信扣款任务正在执行中，跳过")
            return

        try:
            # 查询可以扣款的记录
            # 条件：已发送预通知、预通知发送时间超过扣款周期
            min_notify_time = datetime.now() - timedelta(days=wechat_contract_config.DEDUCT_DURATION)

            records = db.query(AutoDeductRecord).filter(
                and_(
                    AutoDeductRecord.payment_method == 'wechat',
                    AutoDeductRecord.status == DeductRecordStatus.NOTIFIED,
                    AutoDeductRecord.notify_time <= min_notify_time
                )
            ).all()

            logger.info(f"[DeductTask] 找到{len(records)}条待扣款记录")

            subscription_service = SubscriptionService(db, redis_client)
            success_count = 0
            fail_count = 0

            for record in records:
                try:
                    # 获取签约协议
                    contract = db.query(PaymentContract).filter(
                        PaymentContract.id == record.contract_id
                    ).first()

                    if not contract or contract.status != ContractStatus.SIGNED:
                        logger.warning(f"[DeductTask] 签约协议无效: record_id={record.id}")
                        record.status = DeductRecordStatus.FAILED
                        record.fail_reason = "签约协议已失效"
                        db.commit()
                        continue

                    # 执行扣款
                    result = await subscription_service._do_deduct(contract, record)

                    if result.get('success') and result.get('status') == 'paid':
                        success_count += 1
                    else:
                        fail_count += 1

                except Exception as e:
                    logger.error(f"[DeductTask] 处理记录{record.id}扣款异常: {str(e)}")
                    fail_count += 1
                    continue

            logger.info(f"[DeductTask] 微信扣款任务完成，成功{success_count}条，失败{fail_count}条")

        finally:
            await lock.release()

    except Exception as e:
        logger.error(f"[DeductTask] 微信扣款任务异常: {str(e)}")
    finally:
        db.close()


async def process_alipay_deduct_task():
    """
    处理支付宝扣款
    每天凌晨2:30执行

    支付宝不需要预通知，可以直接扣款
    """
    logger.info("[DeductTask] 开始执行支付宝扣款任务")

    db: Session = SessionLocal()
    redis_client = await get_redis()

    try:
        lock = DistributedLock(redis_client, "task:alipay_deduct", expire=600)
        if not await lock.acquire():
            logger.info("[DeductTask] 支付宝扣款任务正在执行中，跳过")
            return

        try:
            # 查询即将到期的支付宝自动续费订阅
            expire_before = datetime.now() + timedelta(days=subscription_config.AUTO_RENEWAL_NOTIFY_DAYS)

            subscriptions = db.query(Subscription).filter(
                and_(
                    Subscription.status == SubscriptionStatus.ACTIVE,
                    Subscription.is_auto_renewal == 1,
                    Subscription.expiration_time <= expire_before,
                    Subscription.expiration_time > datetime.now(),
                    Subscription.contract_id.isnot(None)
                )
            ).all()

            logger.info(f"[DeductTask] 找到{len(subscriptions)}个需要扣款的订阅")

            subscription_service = SubscriptionService(db, redis_client)
            success_count = 0
            fail_count = 0

            for sub in subscriptions:
                try:
                    # 获取签约协议（仅支付宝）
                    contract = db.query(PaymentContract).filter(
                        and_(
                            PaymentContract.id == sub.contract_id,
                            PaymentContract.status == ContractStatus.SIGNED,
                            PaymentContract.payment_method == 'alipay'
                        )
                    ).first()

                    if not contract:
                        continue

                    # 检查是否已处理过
                    existing_record = db.query(AutoDeductRecord).filter(
                        and_(
                            AutoDeductRecord.contract_id == contract.id,
                            AutoDeductRecord.subscription_id == sub.id,
                            AutoDeductRecord.status.in_([
                                DeductRecordStatus.DEDUCTING,
                                DeductRecordStatus.SUCCESS
                            ])
                        )
                    ).first()

                    if existing_record:
                        continue

                    # 创建扣款记录
                    from backend.subscription.services.subscription_service import generate_record_sn
                    record = AutoDeductRecord(
                        record_sn=generate_record_sn(),
                        contract_id=contract.id,
                        user_id=contract.user_id,
                        subscription_id=sub.id,
                        amount=contract.deduct_amount,
                        payment_method='alipay',
                        status=DeductRecordStatus.PENDING,
                    )
                    db.add(record)
                    db.commit()
                    db.refresh(record)

                    # 执行扣款
                    result = await subscription_service._do_deduct(contract, record)

                    if result.get('success') and result.get('status') == 'paid':
                        success_count += 1
                    else:
                        fail_count += 1

                except Exception as e:
                    logger.error(f"[DeductTask] 处理订阅{sub.id}扣款异常: {str(e)}")
                    fail_count += 1
                    continue

            logger.info(f"[DeductTask] 支付宝扣款任务完成，成功{success_count}条，失败{fail_count}条")

        finally:
            await lock.release()

    except Exception as e:
        logger.error(f"[DeductTask] 支付宝扣款任务异常: {str(e)}")
    finally:
        db.close()


async def retry_failed_deduct_task():
    """
    重试失败的扣款
    每天上午11点执行
    """
    logger.info("[DeductTask] 开始执行扣款重试任务")

    db: Session = SessionLocal()
    redis_client = await get_redis()

    try:
        lock = DistributedLock(redis_client, "task:retry_deduct", expire=300)
        if not await lock.acquire():
            logger.info("[DeductTask] 扣款重试任务正在执行中，跳过")
            return

        try:
            # 查询需要重试的扣款记录
            records = db.query(AutoDeductRecord).filter(
                and_(
                    AutoDeductRecord.status == DeductRecordStatus.FAILED,
                    AutoDeductRecord.retry_count < deduct_retry_config.MAX_RETRY_COUNT
                )
            ).all()

            logger.info(f"[DeductTask] 找到{len(records)}条需要重试的记录")

            subscription_service = SubscriptionService(db, redis_client)
            retry_count = 0

            for record in records:
                try:
                    # 检查重试间隔
                    if record.retry_count < len(deduct_retry_config.RETRY_INTERVALS):
                        retry_interval = deduct_retry_config.RETRY_INTERVALS[record.retry_count]
                        retry_after = record.update_time + timedelta(days=retry_interval)
                        if datetime.now() < retry_after:
                            continue

                    # 获取签约协议
                    contract = db.query(PaymentContract).filter(
                        PaymentContract.id == record.contract_id
                    ).first()

                    if not contract or contract.status != ContractStatus.SIGNED:
                        record.fail_reason = "签约协议已失效"
                        db.commit()
                        continue

                    # 重置状态
                    record.status = DeductRecordStatus.PENDING
                    db.commit()

                    # 重新扣款
                    result = await subscription_service._do_deduct(contract, record)
                    retry_count += 1

                    if result.get('success') and result.get('status') == 'paid':
                        logger.info(f"[DeductTask] 重试扣款成功: record_id={record.id}")
                    else:
                        logger.info(f"[DeductTask] 重试扣款失败: record_id={record.id}, error={result.get('error')}")

                except Exception as e:
                    logger.error(f"[DeductTask] 重试记录{record.id}异常: {str(e)}")
                    continue

            logger.info(f"[DeductTask] 扣款重试任务完成，重试{retry_count}条")

        finally:
            await lock.release()

    except Exception as e:
        logger.error(f"[DeductTask] 扣款重试任务异常: {str(e)}")
    finally:
        db.close()
