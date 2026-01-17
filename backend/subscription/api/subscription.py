"""
订阅API接口
提供订阅查询、生效链查询、取消订阅、开关自动续费等功能
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import and_
from typing import Optional
from datetime import datetime
import logging

from backend.passport.app.api.deps import get_db, get_current_user
from backend.passport.app.models.user import User

from backend.subscription.schemas.subscription import (
    SubscriptionResponse,
    SubscriptionChainResponse,
    SubscriptionChainItem,
    CurrentSubscriptionResponse,
    ToggleAutoRenewalRequest,
    ToggleAutoRenewalResponse,
    CancelSubscriptionRequest,
    CancelSubscriptionResponse,
    SubscriptionListResponse,
    get_status_desc,
    get_type_desc,
)
from backend.subscription.services import ChainManager
from backend.membership.models.subscription import (
    Subscription,
    SubscriptionStatus,
)
from backend.payment.models.contract import PaymentContract, ContractStatus

logger = logging.getLogger(__name__)

router = APIRouter()


def subscription_to_response(sub: Subscription) -> SubscriptionResponse:
    """将订阅对象转换为响应对象"""
    return SubscriptionResponse(
        id=sub.id,
        subscription_sn=sub.subscription_sn,
        user_id=sub.user_id,
        order_id=sub.order_id,
        type=sub.type,
        type_desc=get_type_desc(sub.type),
        level_code=sub.level_code,
        level_weight=sub.level_weight,
        points_amount=sub.points_amount,
        status=sub.status,
        status_desc=get_status_desc(sub.status),
        expiration_time=sub.expiration_time,
        cycle_days=sub.cycle_days,
        is_compensation=sub.is_compensation,
        subscription_source=sub.subscription_source,
        is_auto_renewal=sub.is_auto_renewal,
        contract_id=sub.contract_id,
        cancel_reason=sub.cancel_reason,
        cancel_time=sub.cancel_time,
        create_time=sub.create_time,
        update_time=sub.update_time
    )


def subscription_to_chain_item(sub: Subscription) -> SubscriptionChainItem:
    """将订阅对象转换为生效链项"""
    return SubscriptionChainItem(
        id=sub.id,
        subscription_sn=sub.subscription_sn,
        type=sub.type,
        type_desc=get_type_desc(sub.type),
        level_code=sub.level_code,
        level_weight=sub.level_weight,
        points_amount=sub.points_amount,
        status=sub.status,
        status_desc=get_status_desc(sub.status),
        expiration_time=sub.expiration_time,
        cycle_days=sub.cycle_days,
        is_compensation=sub.is_compensation,
        is_auto_renewal=sub.is_auto_renewal,
        order_in_queue=sub.order_in_queue,
        previous_subscription_id=sub.previous_subscription_id,
        next_subscription_id=sub.next_subscription_id,
        create_time=sub.create_time
    )


@router.get("/current", response_model=CurrentSubscriptionResponse)
async def get_current_subscription(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    查询当前生效订阅
    """
    # 查询当前生效的订阅
    active_sub = db.query(Subscription).filter(
        and_(
            Subscription.user_id == current_user.id,
            Subscription.status == SubscriptionStatus.ACTIVE
        )
    ).first()

    # 查询待生效的订阅数量
    pending_count = db.query(Subscription).filter(
        and_(
            Subscription.user_id == current_user.id,
            Subscription.status == SubscriptionStatus.PENDING
        )
    ).count()

    if not active_sub:
        return CurrentSubscriptionResponse(
            has_active=False,
            subscription=None,
            remaining_days=0,
            is_auto_renewal=False,
            has_pending=pending_count > 0,
            pending_count=pending_count
        )

    # 计算剩余天数
    remaining_days = max(0, (active_sub.expiration_time - datetime.now()).days)

    return CurrentSubscriptionResponse(
        has_active=True,
        subscription=subscription_to_response(active_sub),
        remaining_days=remaining_days,
        is_auto_renewal=active_sub.is_auto_renewal == 1,
        has_pending=pending_count > 0,
        pending_count=pending_count
    )


@router.get("/chain", response_model=SubscriptionChainResponse)
async def get_subscription_chain(
    include_visualization: bool = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    查询用户生效链

    返回用户的完整订阅生效链，包括：
    - 当前生效的订阅
    - 待生效的订阅列表（按优先级排序）
    - 已暂停的订阅列表
    """
    chain_manager = ChainManager(db)
    user_chain = chain_manager.get_user_chain(current_user.id)

    # 转换为响应对象
    active_item = None
    if user_chain.active_subscription:
        active_item = subscription_to_chain_item(user_chain.active_subscription)

    pending_items = [
        subscription_to_chain_item(sub) for sub in user_chain.pending_subscriptions
    ]

    paused_items = [
        subscription_to_chain_item(sub) for sub in user_chain.paused_subscriptions
    ]

    # 获取可视化（调试用）
    visualization = None
    if include_visualization:
        visualization = chain_manager.get_chain_visualization(current_user.id)

    return SubscriptionChainResponse(
        user_id=current_user.id,
        active_subscription=active_item,
        pending_subscriptions=pending_items,
        paused_subscriptions=paused_items,
        total_pending=len(pending_items),
        chain_visualization=visualization
    )


@router.get("/list", response_model=SubscriptionListResponse)
async def list_subscriptions(
    status: Optional[int] = None,
    page: int = 1,
    page_size: int = 20,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    查询订阅列表
    """
    query = db.query(Subscription).filter(
        Subscription.user_id == current_user.id
    )

    if status is not None:
        query = query.filter(Subscription.status == status)

    # 获取总数
    total = query.count()

    # 分页查询
    subscriptions = query.order_by(Subscription.create_time.desc())\
        .offset((page - 1) * page_size)\
        .limit(page_size)\
        .all()

    items = [subscription_to_response(sub) for sub in subscriptions]

    return SubscriptionListResponse(total=total, items=items)


@router.get("/{subscription_id}", response_model=SubscriptionResponse)
async def get_subscription(
    subscription_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    查询订阅详情
    """
    subscription = db.query(Subscription).filter(
        Subscription.id == subscription_id
    ).first()

    if not subscription:
        raise HTTPException(status_code=404, detail="订阅不存在")

    # 验证归属
    if subscription.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="无权访问此订阅")

    return subscription_to_response(subscription)


@router.post("/toggle-auto-renewal", response_model=ToggleAutoRenewalResponse)
async def toggle_auto_renewal(
    request: ToggleAutoRenewalRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    开关自动续费

    开启自动续费需要已有有效签约协议
    """
    subscription = db.query(Subscription).filter(
        Subscription.id == request.subscription_id
    ).first()

    if not subscription:
        raise HTTPException(status_code=404, detail="订阅不存在")

    # 验证归属
    if subscription.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="无权操作此订阅")

    # 验证状态（只有生效中或待生效的订阅可以开关自动续费）
    if subscription.status not in [SubscriptionStatus.ACTIVE, SubscriptionStatus.PENDING]:
        raise HTTPException(status_code=400, detail="当前订阅状态不允许修改自动续费设置")

    if request.enable:
        # 开启自动续费 - 检查是否有有效签约
        contract = db.query(PaymentContract).filter(
            and_(
                PaymentContract.user_id == current_user.id,
                PaymentContract.status == ContractStatus.SIGNED
            )
        ).first()

        if not contract:
            raise HTTPException(
                status_code=400,
                detail="开启自动续费需要先完成签约，请前往签约页面"
            )

        subscription.is_auto_renewal = 1
        subscription.contract_id = contract.id
        logger.info(f"[Subscription] 开启自动续费: subscription_id={subscription.id}, contract_id={contract.id}")
    else:
        # 关闭自动续费
        subscription.is_auto_renewal = 0
        logger.info(f"[Subscription] 关闭自动续费: subscription_id={subscription.id}")

    db.commit()
    db.refresh(subscription)

    return ToggleAutoRenewalResponse(
        success=True,
        is_auto_renewal=subscription.is_auto_renewal == 1,
        message="自动续费已开启" if request.enable else "自动续费已关闭"
    )


@router.post("/cancel", response_model=CancelSubscriptionResponse)
async def cancel_subscription(
    request: CancelSubscriptionRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    取消订阅

    只能取消待生效状态的订阅
    """
    subscription = db.query(Subscription).filter(
        Subscription.id == request.subscription_id
    ).first()

    if not subscription:
        raise HTTPException(status_code=404, detail="订阅不存在")

    # 验证归属
    if subscription.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="无权操作此订阅")

    # 验证状态（只能取消待生效的订阅）
    if subscription.status != SubscriptionStatus.PENDING:
        raise HTTPException(status_code=400, detail="只能取消待生效状态的订阅")

    # 使用链管理器移除订阅
    chain_manager = ChainManager(db)
    success = chain_manager.remove_from_chain(subscription.id)

    if not success:
        raise HTTPException(status_code=500, detail="取消订阅失败，请稍后重试")

    # 更新订阅状态
    subscription.status = SubscriptionStatus.CANCELLED
    subscription.cancel_reason = request.reason
    subscription.cancel_time = datetime.now()
    subscription.is_auto_renewal = 0

    db.commit()

    logger.info(f"[Subscription] 取消订阅成功: subscription_id={subscription.id}, reason={request.reason}")

    return CancelSubscriptionResponse(
        success=True,
        message="订阅已取消"
    )


@router.get("/chain/health-check")
async def chain_health_check(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    生效链健康检查

    检查用户的订阅生效链是否存在问题，如：
    - 链路断裂
    - 时间不连续
    - 状态异常
    """
    chain_manager = ChainManager(db)
    health_result = chain_manager.health_check(current_user.id)

    return {
        "user_id": current_user.id,
        "is_healthy": health_result.get('is_healthy', False),
        "issues": health_result.get('issues', []),
        "check_time": datetime.now().isoformat()
    }


@router.post("/chain/auto-fix")
async def chain_auto_fix(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    自动修复生效链

    尝试自动修复生效链中的问题
    """
    chain_manager = ChainManager(db)

    # 先检查健康状态
    health_result = chain_manager.health_check(current_user.id)

    if health_result.get('is_healthy', True):
        return {
            "success": True,
            "message": "生效链状态正常，无需修复",
            "fixed_issues": []
        }

    # 尝试自动修复
    fix_result = chain_manager.auto_fix_chain(current_user.id)

    return {
        "success": fix_result.get('success', False),
        "message": "修复完成" if fix_result.get('success') else "部分问题无法自动修复",
        "fixed_issues": fix_result.get('fixed_issues', []),
        "remaining_issues": fix_result.get('remaining_issues', [])
    }
