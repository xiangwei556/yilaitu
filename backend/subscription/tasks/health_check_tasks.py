"""
健康检查相关定时任务
包含生效链健康检查、签约状态同步等任务
"""
import asyncio
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_
import logging

from backend.passport.app.db.session import SessionLocal
from backend.passport.app.db.redis import get_redis
from backend.payment.models.contract import PaymentContract, ContractStatus
from backend.membership.models.subscription import Subscription, SubscriptionStatus
from backend.subscription.services.chain_manager import ChainManager
from backend.subscription.services.wechat_contract_service import WeChatContractService
from backend.subscription.services.alipay_contract_service import AlipayContractService
from backend.subscription.config import chain_config
from backend.common.distributed_lock import DistributedLock

logger = logging.getLogger(__name__)


async def chain_health_check_task():
    """
    生效链健康检查
    每天凌晨4点执行

    检查所有用户的生效链是否存在问题：
    1. 链路断裂
    2. 时间不连续
    3. 状态异常
    """
    if not chain_config.HEALTH_CHECK_ENABLED:
        logger.info("[HealthCheckTask] 生效链健康检查已禁用")
        return

    logger.info("[HealthCheckTask] 开始执行生效链健康检查任务")

    db: Session = SessionLocal()
    redis_client = await get_redis()

    try:
        lock = DistributedLock(redis_client, "task:chain_health_check", expire=600)
        if not await lock.acquire():
            logger.info("[HealthCheckTask] 健康检查任务正在执行中，跳过")
            return

        try:
            # 获取所有有订阅的用户
            user_ids = db.query(Subscription.user_id).filter(
                Subscription.status.in_([
                    SubscriptionStatus.ACTIVE,
                    SubscriptionStatus.PENDING,
                    SubscriptionStatus.PAUSED
                ])
            ).distinct().all()

            user_ids = [u[0] for u in user_ids]

            logger.info(f"[HealthCheckTask] 需要检查{len(user_ids)}个用户的生效链")

            chain_manager = ChainManager(db)
            issues_found = 0
            fixed_count = 0

            for user_id in user_ids:
                try:
                    # 健康检查
                    health_result = chain_manager.health_check(user_id)

                    if not health_result.get('is_healthy', True):
                        issues = health_result.get('issues', [])
                        issues_found += len(issues)

                        logger.warning(f"[HealthCheckTask] 用户{user_id}生效链存在问题: {issues}")

                        # 自动修复
                        if chain_config.AUTO_FIX_ENABLED:
                            fix_result = chain_manager.auto_fix_chain(user_id)
                            if fix_result.get('success'):
                                fixed_count += len(fix_result.get('fixed_issues', []))
                                logger.info(f"[HealthCheckTask] 用户{user_id}生效链已修复")
                            else:
                                logger.error(f"[HealthCheckTask] 用户{user_id}生效链修复失败: {fix_result.get('remaining_issues')}")

                except Exception as e:
                    logger.error(f"[HealthCheckTask] 检查用户{user_id}生效链异常: {str(e)}")
                    continue

            logger.info(f"[HealthCheckTask] 健康检查任务完成，发现{issues_found}个问题，修复{fixed_count}个")

        finally:
            await lock.release()

    except Exception as e:
        logger.error(f"[HealthCheckTask] 健康检查任务异常: {str(e)}")
    finally:
        db.close()


async def sync_contract_status_task():
    """
    同步签约状态
    每天凌晨3点执行

    主动查询支付平台，同步签约状态（防止回调丢失）
    """
    logger.info("[HealthCheckTask] 开始执行签约状态同步任务")

    db: Session = SessionLocal()
    redis_client = await get_redis()

    try:
        lock = DistributedLock(redis_client, "task:sync_contract", expire=300)
        if not await lock.acquire():
            logger.info("[HealthCheckTask] 签约状态同步任务正在执行中，跳过")
            return

        try:
            # 查询需要同步的签约记录
            # 1. 签约中状态且超过1小时
            # 2. 已签约状态（定期验证）
            one_hour_ago = datetime.now() - timedelta(hours=1)
            one_day_ago = datetime.now() - timedelta(days=1)

            contracts_to_sync = db.query(PaymentContract).filter(
                or_(
                    # 签约中且超过1小时
                    and_(
                        PaymentContract.status == ContractStatus.SIGNING,
                        PaymentContract.create_time <= one_hour_ago
                    ),
                    # 已签约且超过1天未同步
                    and_(
                        PaymentContract.status == ContractStatus.SIGNED,
                        PaymentContract.update_time <= one_day_ago
                    )
                )
            ).all()

            logger.info(f"[HealthCheckTask] 需要同步{len(contracts_to_sync)}个签约状态")

            wechat_service = WeChatContractService()
            alipay_service = AlipayContractService()

            synced_count = 0
            status_changed_count = 0

            for contract in contracts_to_sync:
                try:
                    # 根据支付方式调用不同的查询接口
                    if contract.payment_method == 'wechat':
                        query_result = await wechat_service.query_contract(
                            contract_code=contract.contract_code
                        )
                    else:
                        query_result = await alipay_service.query_agreement(
                            external_agreement_no=contract.contract_code
                        )

                    if not query_result or not query_result.get('success'):
                        logger.warning(f"[HealthCheckTask] 查询签约状态失败: contract_id={contract.id}")
                        continue

                    synced_count += 1

                    # 根据查询结果更新状态
                    state = query_result.get('state', '')
                    old_status = contract.status

                    if state == 'signed' and contract.status == ContractStatus.SIGNING:
                        contract.status = ContractStatus.SIGNED
                        contract.contract_id = query_result.get('agreement_no') or query_result.get('contract_id')
                        contract.signed_time = datetime.now()
                        status_changed_count += 1
                        logger.info(f"[HealthCheckTask] 签约状态更新: contract_id={contract.id}, SIGNING -> SIGNED")

                    elif state == 'unsigned' and contract.status == ContractStatus.SIGNED:
                        contract.status = ContractStatus.UNSIGNED
                        contract.unsigned_time = datetime.now()
                        contract.unsigned_reason = "支付平台同步：用户已解约"
                        status_changed_count += 1
                        logger.info(f"[HealthCheckTask] 签约状态更新: contract_id={contract.id}, SIGNED -> UNSIGNED")

                    # 更新同步时间
                    contract.update_time = datetime.now()
                    db.commit()

                except Exception as e:
                    logger.error(f"[HealthCheckTask] 同步签约{contract.id}状态异常: {str(e)}")
                    continue

            logger.info(f"[HealthCheckTask] 签约状态同步任务完成，同步{synced_count}条，状态变更{status_changed_count}条")

        finally:
            await lock.release()

    except Exception as e:
        logger.error(f"[HealthCheckTask] 签约状态同步任务异常: {str(e)}")
    finally:
        db.close()


async def cleanup_expired_records_task():
    """
    清理过期记录
    每周执行一次

    清理历史数据，保持数据库整洁
    """
    logger.info("[HealthCheckTask] 开始执行过期记录清理任务")

    db: Session = SessionLocal()
    redis_client = await get_redis()

    try:
        lock = DistributedLock(redis_client, "task:cleanup_records", expire=600)
        if not await lock.acquire():
            logger.info("[HealthCheckTask] 清理任务正在执行中，跳过")
            return

        try:
            # 清理超过90天的签约失败记录
            ninety_days_ago = datetime.now() - timedelta(days=90)

            deleted_contracts = db.query(PaymentContract).filter(
                and_(
                    PaymentContract.status == ContractStatus.SIGN_FAILED,
                    PaymentContract.create_time <= ninety_days_ago
                )
            ).delete()

            logger.info(f"[HealthCheckTask] 清理签约失败记录: {deleted_contracts}条")

            # 清理超过180天的已完成订阅的关联数据（保留订阅记录本身）
            # 这里可以根据业务需求决定是否清理

            db.commit()

            logger.info("[HealthCheckTask] 过期记录清理任务完成")

        finally:
            await lock.release()

    except Exception as e:
        logger.error(f"[HealthCheckTask] 过期记录清理任务异常: {str(e)}")
        db.rollback()
    finally:
        db.close()


async def monitor_deduct_success_rate_task():
    """
    监控扣款成功率
    每小时执行一次

    监控扣款成功率，如果低于阈值则发送告警
    """
    logger.info("[HealthCheckTask] 开始执行扣款成功率监控任务")

    db: Session = SessionLocal()
    redis_client = await get_redis()

    try:
        from backend.payment.models.contract import AutoDeductRecord, DeductRecordStatus
        from backend.subscription.config import monitor_config

        # 统计最近24小时的扣款情况
        one_day_ago = datetime.now() - timedelta(days=1)

        total_records = db.query(AutoDeductRecord).filter(
            AutoDeductRecord.create_time >= one_day_ago
        ).count()

        success_records = db.query(AutoDeductRecord).filter(
            and_(
                AutoDeductRecord.create_time >= one_day_ago,
                AutoDeductRecord.status == DeductRecordStatus.SUCCESS
            )
        ).count()

        if total_records > 0:
            success_rate = success_records / total_records

            logger.info(f"[HealthCheckTask] 扣款成功率监控: 总计{total_records}条，成功{success_records}条，成功率{success_rate:.2%}")

            if success_rate < monitor_config.DEDUCT_SUCCESS_THRESHOLD:
                # 发送告警
                logger.warning(f"[HealthCheckTask] 扣款成功率低于阈值! 当前: {success_rate:.2%}, 阈值: {monitor_config.DEDUCT_SUCCESS_THRESHOLD:.2%}")

                # 可以接入告警系统发送通知
                await send_alert(
                    alert_type="deduct_success_rate_low",
                    message=f"扣款成功率低于阈值: {success_rate:.2%}",
                    data={
                        "total": total_records,
                        "success": success_records,
                        "rate": success_rate,
                        "threshold": monitor_config.DEDUCT_SUCCESS_THRESHOLD
                    }
                )

    except Exception as e:
        logger.error(f"[HealthCheckTask] 扣款成功率监控异常: {str(e)}")
    finally:
        db.close()


async def send_alert(alert_type: str, message: str, data: dict = None):
    """
    发送告警

    Args:
        alert_type: 告警类型
        message: 告警消息
        data: 额外数据
    """
    try:
        logger.error(f"[ALERT] {alert_type}: {message}, data={data}")

        # 这里可以接入告警系统，如：
        # - 发送邮件
        # - 发送钉钉/飞书消息
        # - 发送短信
        # - 写入监控系统

    except Exception as e:
        logger.error(f"[HealthCheckTask] 发送告警失败: {str(e)}")
