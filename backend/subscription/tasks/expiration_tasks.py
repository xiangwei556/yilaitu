"""
订阅到期相关定时任务
包含到期处理、到期提醒等任务
"""
import asyncio
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import and_
import logging

from backend.passport.app.db.session import SessionLocal
from backend.passport.app.db.redis import get_redis
from backend.membership.models.subscription import Subscription, SubscriptionStatus
from backend.payment.models.contract import (
    PaymentContract,
    AutoDeductRecord,
    ContractStatus,
    DeductRecordStatus,
)
from backend.subscription.services.subscription_service import SubscriptionService
from backend.subscription.config import subscription_config
from backend.common.distributed_lock import DistributedLock

logger = logging.getLogger(__name__)


async def process_expired_subscriptions_task():
    """
    处理到期订阅
    每5分钟执行一次

    检查已到期的订阅并进行状态流转：
    1. 将到期的生效中订阅标记为已完成
    2. 激活下一个待生效订阅
    3. 更新用户会员状态
    """
    logger.info("[ExpirationTask] 开始执行到期订阅处理任务")

    db: Session = SessionLocal()
    redis_client = await get_redis()

    try:
        lock = DistributedLock(redis_client, "task:expired_subscriptions", expire=60)
        if not await lock.acquire():
            logger.debug("[ExpirationTask] 到期处理任务正在执行中，跳过")
            return

        try:
            # 查询已到期的生效中订阅
            expired_subscriptions = db.query(Subscription).filter(
                and_(
                    Subscription.status == SubscriptionStatus.ACTIVE,
                    Subscription.expiration_time <= datetime.now()
                )
            ).all()

            if not expired_subscriptions:
                logger.debug("[ExpirationTask] 没有到期的订阅")
                return

            logger.info(f"[ExpirationTask] 找到{len(expired_subscriptions)}个到期订阅")

            subscription_service = SubscriptionService(db, redis_client)
            processed_count = 0

            for sub in expired_subscriptions:
                try:
                    # 使用订阅级别的分布式锁
                    sub_lock = DistributedLock(
                        redis_client,
                        f"sub_expire:{sub.id}",
                        expire=30
                    )

                    if not await sub_lock.acquire():
                        logger.debug(f"[ExpirationTask] 订阅{sub.id}正在被处理，跳过")
                        continue

                    try:
                        success = subscription_service.process_subscription_expiration(sub.id)
                        if success:
                            processed_count += 1
                            logger.info(f"[ExpirationTask] 订阅到期处理成功: subscription_id={sub.id}")
                    finally:
                        await sub_lock.release()

                except Exception as e:
                    logger.error(f"[ExpirationTask] 处理订阅{sub.id}到期异常: {str(e)}")
                    continue

            logger.info(f"[ExpirationTask] 到期订阅处理任务完成，处理{processed_count}条")

        finally:
            await lock.release()

    except Exception as e:
        logger.error(f"[ExpirationTask] 到期订阅处理任务异常: {str(e)}")
    finally:
        db.close()


async def check_expiring_subscriptions_task():
    """
    检查即将到期的订阅
    每小时执行一次

    检查即将到期的订阅，发送自动续费和扣费提醒通知
    """
    logger.info("[ExpirationTask] 开始执行到期提醒检查任务")

    db: Session = SessionLocal()
    redis_client = await get_redis()

    try:
        lock = DistributedLock(redis_client, "task:check_expiring", expire=120)
        if not await lock.acquire():
            logger.debug("[ExpirationTask] 到期提醒检查任务正在执行中，跳过")
            return

        try:
            # 1. 处理自动续费 - 创建扣款记录（由扣款任务执行实际扣款）
            renew_before = datetime.now() + timedelta(days=1)
            auto_renew_subscriptions = db.query(Subscription).filter(
                and_(
                    Subscription.status == SubscriptionStatus.ACTIVE,
                    Subscription.expiration_time <= renew_before,
                    Subscription.expiration_time > datetime.now(),
                    Subscription.is_auto_renewal == 1,
                    Subscription.contract_id.isnot(None)
                )
            ).all()

            if auto_renew_subscriptions:
                logger.info(f"[ExpirationTask] 找到{len(auto_renew_subscriptions)}个即将到期且开启自动续费的订阅")

                for sub in auto_renew_subscriptions:
                    try:
                        # 获取签约协议
                        contract = db.query(PaymentContract).filter(
                            and_(
                                PaymentContract.id == sub.contract_id,
                                PaymentContract.status == ContractStatus.SIGNED
                            )
                        ).first()

                        if not contract:
                            logger.warning(f"[ExpirationTask] 订阅{sub.id}的签约协议不存在或已失效")
                            continue

                        # 检查是否已有扣款记录（避免重复创建）
                        existing_record = db.query(AutoDeductRecord).filter(
                            and_(
                                AutoDeductRecord.contract_id == contract.id,
                                AutoDeductRecord.subscription_id == sub.id,
                                AutoDeductRecord.status.in_([
                                    DeductRecordStatus.PENDING,
                                    DeductRecordStatus.NOTIFIED,
                                    DeductRecordStatus.DEDUCTING,
                                    DeductRecordStatus.SUCCESS
                                ])
                            )
                        ).first()

                        if existing_record:
                            logger.debug(f"[ExpirationTask] 订阅{sub.id}已有扣款记录，跳过")
                            continue

                        # 创建扣款记录，由扣款任务执行实际扣款
                        deduct_record = AutoDeductRecord(
                            contract_id=contract.id,
                            user_id=sub.user_id,
                            subscription_id=sub.id,
                            amount=contract.deduct_amount,
                            payment_method=contract.payment_method,
                            status=DeductRecordStatus.PENDING
                        )
                        db.add(deduct_record)
                        db.commit()

                        logger.info(f"[ExpirationTask] 创建扣款记录: subscription_id={sub.id}, contract_id={contract.id}")

                    except Exception as e:
                        logger.error(f"[ExpirationTask] 处理自动续费异常: subscription_id={sub.id}, error={str(e)}")
                        db.rollback()

            # 2. 查询即将到期的订阅（3天内到期且未开启自动续费）
            expire_before = datetime.now() + timedelta(days=subscription_config.AUTO_RENEWAL_NOTIFY_DAYS)

            expiring_subscriptions = db.query(Subscription).filter(
                and_(
                    Subscription.status == SubscriptionStatus.ACTIVE,
                    Subscription.expiration_time <= expire_before,
                    Subscription.expiration_time > datetime.now(),
                    Subscription.is_auto_renewal == 0  # 未开启自动续费
                )
            ).all()

            if not expiring_subscriptions:
                logger.debug("[ExpirationTask] 没有即将到期的订阅需要提醒")
                return

            logger.info(f"[ExpirationTask] 找到{len(expiring_subscriptions)}个即将到期订阅需要提醒")

            notified_count = 0

            for sub in expiring_subscriptions:
                try:
                    # 检查是否已发送过提醒（使用Redis标记）
                    remind_key = f"sub_remind:{sub.id}:{sub.expiration_time.strftime('%Y%m%d')}"
                    already_reminded = await redis_client.get(remind_key)

                    if already_reminded:
                        continue

                    # 计算剩余天数
                    remaining_days = (sub.expiration_time - datetime.now()).days

                    # 发送提醒通知
                    await send_expiration_reminder(
                        user_id=sub.user_id,
                        subscription_id=sub.id,
                        remaining_days=remaining_days
                    )

                    # 标记已提醒（有效期1天，避免重复提醒）
                    await redis_client.set(remind_key, "1", ex=86400)

                    notified_count += 1
                    logger.info(f"[ExpirationTask] 发送到期提醒: subscription_id={sub.id}, remaining_days={remaining_days}")

                except Exception as e:
                    logger.error(f"[ExpirationTask] 发送订阅{sub.id}到期提醒异常: {str(e)}")
                    continue

            logger.info(f"[ExpirationTask] 到期提醒检查任务完成，发送{notified_count}条提醒")

        finally:
            await lock.release()

    except Exception as e:
        logger.error(f"[ExpirationTask] 到期提醒检查任务异常: {str(e)}")
    finally:
        db.close()


async def send_expiration_reminder(user_id: int, subscription_id: int, remaining_days: int):
    """
    发送到期提醒

    Args:
        user_id: 用户ID
        subscription_id: 订阅ID
        remaining_days: 剩余天数
    """
    try:
        # 这里可以接入消息通知服务
        # 如：站内信、短信、微信模板消息等
        from backend.notification.services.notification_service import NotificationService

        db: Session = SessionLocal()
        try:
            notification_service = NotificationService(db)

            message_content = f"您的会员订阅将于{remaining_days}天后到期，请及时续费以继续享受会员权益。"

            # 发送站内消息
            await notification_service.send_system_message(
                user_id=user_id,
                title="会员到期提醒",
                content=message_content,
                message_type="subscription_expire",
                extra_data={"subscription_id": subscription_id, "remaining_days": remaining_days}
            )

            logger.info(f"[ExpirationTask] 到期提醒发送成功: user_id={user_id}")

        finally:
            db.close()

    except Exception as e:
        logger.error(f"[ExpirationTask] 发送到期提醒失败: user_id={user_id}, error={str(e)}")


async def activate_pending_subscriptions_task():
    """
    激活待生效订阅
    每5分钟执行一次

    检查是否有待生效的订阅应该被激活：
    1. 当前没有生效中的订阅
    2. 存在待生效的订阅
    """
    logger.info("[ExpirationTask] 开始执行待生效订阅激活任务")

    db: Session = SessionLocal()
    redis_client = await get_redis()

    try:
        lock = DistributedLock(redis_client, "task:activate_pending", expire=60)
        if not await lock.acquire():
            logger.debug("[ExpirationTask] 待生效激活任务正在执行中，跳过")
            return

        try:
            # 查询所有有待生效订阅但没有生效中订阅的用户
            from sqlalchemy import func

            # 获取有待生效订阅的用户ID
            users_with_pending = db.query(Subscription.user_id).filter(
                Subscription.status == SubscriptionStatus.PENDING
            ).distinct().all()

            user_ids = [u[0] for u in users_with_pending]

            if not user_ids:
                logger.debug("[ExpirationTask] 没有待生效的订阅")
                return

            activated_count = 0

            for user_id in user_ids:
                try:
                    # 检查该用户是否有生效中的订阅
                    active_sub = db.query(Subscription).filter(
                        and_(
                            Subscription.user_id == user_id,
                            Subscription.status == SubscriptionStatus.ACTIVE
                        )
                    ).first()

                    if active_sub:
                        continue

                    # 获取该用户优先级最高的待生效订阅
                    pending_sub = db.query(Subscription).filter(
                        and_(
                            Subscription.user_id == user_id,
                            Subscription.status == SubscriptionStatus.PENDING
                        )
                    ).order_by(
                        Subscription.level_weight.desc(),
                        Subscription.is_compensation.asc(),
                        Subscription.create_time.asc()
                    ).first()

                    if pending_sub:
                        # 使用统一激活方法（自动发放权益）
                        subscription_service = SubscriptionService(db, redis_client)
                        subscription_service.activate_subscription(pending_sub)
                        db.commit()

                        activated_count += 1
                        logger.info(f"[ExpirationTask] 激活待生效订阅: user_id={user_id}, subscription_id={pending_sub.id}")

                except Exception as e:
                    logger.error(f"[ExpirationTask] 处理用户{user_id}待生效订阅异常: {str(e)}")
                    db.rollback()
                    continue

            logger.info(f"[ExpirationTask] 待生效订阅激活任务完成，激活{activated_count}条")

        finally:
            await lock.release()

    except Exception as e:
        logger.error(f"[ExpirationTask] 待生效订阅激活任务异常: {str(e)}")
    finally:
        db.close()
