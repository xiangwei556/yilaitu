"""
签约协议API接口
提供签约、解约、查询签约状态等功能
"""
from fastapi import APIRouter, Depends, HTTPException, Request, Response
from sqlalchemy.orm import Session
from sqlalchemy import and_
from typing import Dict, Optional
from datetime import datetime
import json
import secrets
import logging

from backend.passport.app.api.deps import get_db, get_current_user
from backend.passport.app.models.user import User
from backend.passport.app.core.config import settings

from backend.subscription.schemas.contract import (
    ContractCreateRequest,
    ContractCreateResponse,
    ContractQueryResponse,
    ContractCancelRequest,
    ContractCancelResponse,
    ContractListItem,
    ContractListResponse,
    DeductRecordResponse,
    DeductRecordListResponse,
)
from backend.subscription.services import (
    WeChatContractService,
    AlipayContractService,
)
from backend.payment.models.contract import (
    PaymentContract,
    AutoDeductRecord,
    ContractStatus,
    DeductRecordStatus,
)
from backend.membership.models.membership import MembershipPackage
from backend.points.models.points import PointsPackage
from backend.common.idempotent import IdempotentChecker, get_redis_client

logger = logging.getLogger(__name__)

router = APIRouter()


# 状态描述映射
CONTRACT_STATUS_DESC = {
    ContractStatus.SIGNING: "签约中",
    ContractStatus.SIGNED: "已签约",
    ContractStatus.UNSIGNED: "已解约",
    ContractStatus.SIGN_FAILED: "签约失败",
}

DEDUCT_STATUS_DESC = {
    DeductRecordStatus.PENDING: "待扣款",
    DeductRecordStatus.NOTIFIED: "预通知已发",
    DeductRecordStatus.DEDUCTING: "扣款中",
    DeductRecordStatus.SUCCESS: "扣款成功",
    DeductRecordStatus.FAILED: "扣款失败",
}


def generate_contract_sn() -> str:
    """生成协议流水号"""
    timestamp = datetime.now().strftime('%Y%m%d%H%M%S')
    random_str = secrets.token_hex(4).upper()
    return f"CT{timestamp}{random_str}"


@router.post("/create", response_model=ContractCreateResponse)
async def create_contract(
    request: ContractCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    创建签约申请

    流程：
    1. 验证商品信息
    2. 检查是否已有有效签约
    3. 创建签约记录
    4. 调用支付平台生成签约URL
    5. 返回签约链接
    """
    try:
        logger.info(f"[Contract] 创建签约: user_id={current_user.id}, payment_method={request.payment_method}")

        # 1. 验证支付方式
        if request.payment_method not in ['wechat', 'alipay']:
            raise HTTPException(status_code=400, detail="不支持的支付方式")

        # 2. 验证商品信息
        deduct_amount = None
        if request.product_type == 'membership':
            package = db.query(MembershipPackage).filter(
                MembershipPackage.id == request.product_id,
                MembershipPackage.status == "enabled"
            ).first()
            if not package:
                raise HTTPException(status_code=404, detail="会员套餐不存在或已下架")
            deduct_amount = package.price
        elif request.product_type == 'points':
            package = db.query(PointsPackage).filter(
                PointsPackage.id == request.product_id,
                PointsPackage.is_active == True
            ).first()
            if not package:
                raise HTTPException(status_code=404, detail="积分包不存在或已下架")
            deduct_amount = package.price
        else:
            raise HTTPException(status_code=400, detail="不支持的商品类型")

        # 3. 检查是否已有有效签约（同一支付方式、同一商品类型）
        existing_contract = db.query(PaymentContract).filter(
            and_(
                PaymentContract.user_id == current_user.id,
                PaymentContract.payment_method == request.payment_method,
                PaymentContract.product_type == request.product_type,
                PaymentContract.status == ContractStatus.SIGNED
            )
        ).first()

        if existing_contract:
            raise HTTPException(
                status_code=400,
                detail="已存在有效的签约协议，请先解约后再重新签约"
            )

        # 4. 生成协议流水号
        contract_sn = generate_contract_sn()

        # 5. 调用支付平台生成签约URL
        sign_result = None
        display_account = request.display_account or current_user.phone

        if request.payment_method == 'wechat':
            wechat_service = WeChatContractService()
            sign_result = wechat_service.generate_sign_url(
                contract_code=contract_sn,
                display_account=display_account,
                request_serial=contract_sn
            )
        else:  # alipay
            alipay_service = AlipayContractService()
            sign_result = alipay_service.generate_sign_url(
                external_agreement_no=contract_sn,
                external_logon_id=display_account,
                return_url=request.return_url
            )

        if not sign_result or not sign_result.get('success'):
            error_msg = sign_result.get('error', '未知错误') if sign_result else '生成签约URL失败'
            logger.error(f"[Contract] 生成签约URL失败: {error_msg}")
            raise HTTPException(status_code=500, detail=f"生成签约URL失败: {error_msg}")

        sign_url = sign_result.get('sign_url')
        if not sign_url:
            raise HTTPException(status_code=500, detail="支付平台未返回签约URL")

        # 6. 创建签约记录
        contract = PaymentContract(
            contract_sn=contract_sn,
            user_id=current_user.id,
            payment_method=request.payment_method,
            contract_code=contract_sn,  # 商户侧协议号
            status=ContractStatus.SIGNING,
            product_type=request.product_type,
            product_id=request.product_id,
            display_account=display_account,
            deduct_amount=deduct_amount,
            deduct_cycle=30,  # 默认30天周期
        )
        db.add(contract)
        db.commit()
        db.refresh(contract)

        logger.info(f"[Contract] 签约记录创建成功: contract_sn={contract_sn}, sign_url已生成")

        return ContractCreateResponse(
            success=True,
            contract_sn=contract_sn,
            sign_url=sign_url,
            message="请跳转至签约页面完成签约"
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[Contract] 创建签约异常: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"创建签约失败: {str(e)}")


@router.get("/status", response_model=ContractQueryResponse)
async def query_contract_status(
    contract_sn: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    查询签约状态
    """
    contract = db.query(PaymentContract).filter(
        PaymentContract.contract_sn == contract_sn
    ).first()

    if not contract:
        raise HTTPException(status_code=404, detail="签约协议不存在")

    # 验证归属
    if contract.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="无权访问此签约协议")

    # 如果状态是签约中，尝试主动查询支付平台
    if contract.status == ContractStatus.SIGNING:
        try:
            if contract.payment_method == 'wechat':
                wechat_service = WeChatContractService()
                query_result = await wechat_service.query_contract(
                    contract_code=contract.contract_code
                )
            else:
                alipay_service = AlipayContractService()
                query_result = await alipay_service.query_agreement(
                    external_agreement_no=contract.contract_code
                )

            # 根据查询结果更新状态
            if query_result and query_result.get('success'):
                state = query_result.get('state', '')
                if state == 'signed':
                    contract.status = ContractStatus.SIGNED
                    contract.contract_id = query_result.get('agreement_no') or query_result.get('contract_id')
                    contract.signed_time = datetime.now()
                    db.commit()
                    db.refresh(contract)
        except Exception as e:
            logger.warning(f"[Contract] 主动查询签约状态失败: {str(e)}")

    return ContractQueryResponse(
        contract_sn=contract.contract_sn,
        user_id=contract.user_id,
        payment_method=contract.payment_method,
        status=contract.status,
        status_desc=CONTRACT_STATUS_DESC.get(contract.status, "未知"),
        contract_id=contract.contract_id,
        product_type=contract.product_type,
        product_id=contract.product_id,
        deduct_amount=contract.deduct_amount,
        deduct_cycle=contract.deduct_cycle,
        next_deduct_date=contract.next_deduct_date.strftime('%Y-%m-%d') if contract.next_deduct_date else None,
        signed_time=contract.signed_time,
        unsigned_time=contract.unsigned_time,
        unsigned_reason=contract.unsigned_reason,
        create_time=contract.create_time
    )


@router.post("/cancel", response_model=ContractCancelResponse)
async def cancel_contract(
    request: ContractCancelRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    解除签约协议
    """
    contract = db.query(PaymentContract).filter(
        PaymentContract.contract_sn == request.contract_sn
    ).first()

    if not contract:
        raise HTTPException(status_code=404, detail="签约协议不存在")

    # 验证归属
    if contract.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="无权操作此签约协议")

    # 检查状态
    if contract.status != ContractStatus.SIGNED:
        raise HTTPException(status_code=400, detail="签约协议状态不允许解约")

    try:
        # 调用支付平台解约
        cancel_result = None
        if contract.payment_method == 'wechat':
            wechat_service = WeChatContractService()
            cancel_result = await wechat_service.cancel_contract(
                contract_id=contract.contract_id,
                contract_code=contract.contract_code,
                reason=request.reason
            )
        else:
            alipay_service = AlipayContractService()
            cancel_result = await alipay_service.cancel_agreement(
                agreement_no=contract.contract_id,
                external_agreement_no=contract.contract_code,
                reason=request.reason
            )

        if not cancel_result or not cancel_result.get('success'):
            error_msg = cancel_result.get('error', '解约失败') if cancel_result else '解约请求失败'
            logger.error(f"[Contract] 解约失败: {error_msg}")
            raise HTTPException(status_code=500, detail=f"解约失败: {error_msg}")

        # 更新本地状态
        contract.status = ContractStatus.UNSIGNED
        contract.unsigned_time = datetime.now()
        contract.unsigned_reason = request.reason
        db.commit()

        logger.info(f"[Contract] 解约成功: contract_sn={contract.contract_sn}")

        return ContractCancelResponse(
            success=True,
            message="解约成功"
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[Contract] 解约异常: {str(e)}")
        raise HTTPException(status_code=500, detail=f"解约失败: {str(e)}")


@router.get("/list", response_model=ContractListResponse)
async def list_contracts(
    payment_method: Optional[str] = None,
    status: Optional[int] = None,
    page: int = 1,
    page_size: int = 20,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    查询用户签约列表
    """
    query = db.query(PaymentContract).filter(
        PaymentContract.user_id == current_user.id
    )

    if payment_method:
        query = query.filter(PaymentContract.payment_method == payment_method)
    if status is not None:
        query = query.filter(PaymentContract.status == status)

    # 获取总数
    total = query.count()

    # 分页查询
    contracts = query.order_by(PaymentContract.create_time.desc())\
        .offset((page - 1) * page_size)\
        .limit(page_size)\
        .all()

    items = [
        ContractListItem(
            contract_sn=c.contract_sn,
            payment_method=c.payment_method,
            status=c.status,
            status_desc=CONTRACT_STATUS_DESC.get(c.status, "未知"),
            product_type=c.product_type,
            deduct_amount=c.deduct_amount,
            deduct_cycle=c.deduct_cycle,
            next_deduct_date=c.next_deduct_date.strftime('%Y-%m-%d') if c.next_deduct_date else None,
            signed_time=c.signed_time,
            create_time=c.create_time
        )
        for c in contracts
    ]

    return ContractListResponse(total=total, items=items)


@router.post("/wechat/callback")
async def wechat_contract_callback(request: Request, db: Session = Depends(get_db)):
    """
    微信签约结果回调
    """
    try:
        # 获取回调数据
        body = await request.body()
        data = json.loads(body.decode('utf-8')) if body else {}

        logger.info(f"[Contract] 微信签约回调: {data}")

        # 处理回调
        wechat_service = WeChatContractService()
        callback_result = wechat_service.process_sign_callback(data)

        if not callback_result.get('success'):
            logger.error(f"[Contract] 微信签约回调处理失败: {callback_result.get('error')}")
            return {"return_code": "FAIL", "return_msg": callback_result.get('error')}

        contract_code = callback_result.get('contract_code')
        change_type = callback_result.get('change_type')

        # 查找签约记录
        contract = db.query(PaymentContract).filter(
            PaymentContract.contract_code == contract_code
        ).first()

        if not contract:
            logger.error(f"[Contract] 签约记录不存在: contract_code={contract_code}")
            return {"return_code": "SUCCESS", "return_msg": "OK"}

        # 幂等性检查
        redis_client = await get_redis_client()
        idempotent_checker = IdempotentChecker(redis_client)
        business_id = f"wechat_contract_{contract_code}_{change_type}"

        if await idempotent_checker.is_processed('contract_callback', business_id):
            logger.info(f"[Contract] 回调已处理过: {business_id}")
            return {"return_code": "SUCCESS", "return_msg": "OK"}

        if not await idempotent_checker.mark_processing('contract_callback', business_id):
            logger.info(f"[Contract] 回调正在处理中: {business_id}")
            return {"return_code": "SUCCESS", "return_msg": "OK"}

        try:
            # 根据变更类型更新状态
            if change_type == 'ADD':
                # 签约成功
                contract.status = ContractStatus.SIGNED
                contract.contract_id = callback_result.get('contract_id')
                contract.signed_time = datetime.now()
                contract.openid = callback_result.get('openid')
                logger.info(f"[Contract] 微信签约成功: contract_sn={contract.contract_sn}")
            elif change_type == 'DELETE':
                # 解约
                contract.status = ContractStatus.UNSIGNED
                contract.unsigned_time = datetime.now()
                contract.unsigned_reason = "用户在微信端解约"
                logger.info(f"[Contract] 微信解约: contract_sn={contract.contract_sn}")

            db.commit()
            await idempotent_checker.mark_completed('contract_callback', business_id, callback_result)

        except Exception as e:
            await idempotent_checker.mark_failed('contract_callback', business_id, str(e))
            raise

        return {"return_code": "SUCCESS", "return_msg": "OK"}

    except Exception as e:
        logger.error(f"[Contract] 微信签约回调异常: {str(e)}")
        return {"return_code": "FAIL", "return_msg": str(e)}


@router.post("/alipay/callback")
async def alipay_contract_callback(request: Request, db: Session = Depends(get_db)):
    """
    支付宝签约结果回调
    """
    try:
        # 获取回调数据（支付宝使用form表单提交）
        form_data = await request.form()
        data = dict(form_data)

        logger.info(f"[Contract] 支付宝签约回调: {data}")

        # 处理回调
        alipay_service = AlipayContractService()
        callback_result = alipay_service.process_sign_callback(data)

        if not callback_result.get('success'):
            logger.error(f"[Contract] 支付宝签约回调处理失败: {callback_result.get('error')}")
            return "failure"

        external_agreement_no = callback_result.get('external_agreement_no')
        change_type = callback_result.get('change_type')

        # 查找签约记录
        contract = db.query(PaymentContract).filter(
            PaymentContract.contract_code == external_agreement_no
        ).first()

        if not contract:
            logger.error(f"[Contract] 签约记录不存在: external_agreement_no={external_agreement_no}")
            return "success"

        # 幂等性检查
        redis_client = await get_redis_client()
        idempotent_checker = IdempotentChecker(redis_client)
        business_id = f"alipay_contract_{external_agreement_no}_{change_type}"

        if await idempotent_checker.is_processed('contract_callback', business_id):
            logger.info(f"[Contract] 回调已处理过: {business_id}")
            return "success"

        if not await idempotent_checker.mark_processing('contract_callback', business_id):
            logger.info(f"[Contract] 回调正在处理中: {business_id}")
            return "success"

        try:
            # 根据变更类型更新状态
            if change_type == 'ADD':
                # 签约成功
                contract.status = ContractStatus.SIGNED
                contract.contract_id = callback_result.get('agreement_no')
                contract.signed_time = datetime.now()
                contract.alipay_user_id = callback_result.get('alipay_user_id')
                logger.info(f"[Contract] 支付宝签约成功: contract_sn={contract.contract_sn}")
            elif change_type == 'DELETE':
                # 解约
                contract.status = ContractStatus.UNSIGNED
                contract.unsigned_time = datetime.now()
                contract.unsigned_reason = "用户在支付宝端解约"
                logger.info(f"[Contract] 支付宝解约: contract_sn={contract.contract_sn}")

            db.commit()
            await idempotent_checker.mark_completed('contract_callback', business_id, callback_result)

        except Exception as e:
            await idempotent_checker.mark_failed('contract_callback', business_id, str(e))
            raise

        return "success"

    except Exception as e:
        logger.error(f"[Contract] 支付宝签约回调异常: {str(e)}")
        return "failure"


@router.get("/deduct-records", response_model=DeductRecordListResponse)
async def list_deduct_records(
    contract_sn: Optional[str] = None,
    status: Optional[int] = None,
    page: int = 1,
    page_size: int = 20,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    查询扣款记录
    """
    query = db.query(AutoDeductRecord).filter(
        AutoDeductRecord.user_id == current_user.id
    )

    if contract_sn:
        # 根据协议流水号查找协议ID
        contract = db.query(PaymentContract).filter(
            PaymentContract.contract_sn == contract_sn,
            PaymentContract.user_id == current_user.id
        ).first()
        if contract:
            query = query.filter(AutoDeductRecord.contract_id == contract.id)
        else:
            # 如果协议不存在，返回空列表
            return DeductRecordListResponse(total=0, items=[])

    if status is not None:
        query = query.filter(AutoDeductRecord.status == status)

    # 获取总数
    total = query.count()

    # 分页查询
    records = query.order_by(AutoDeductRecord.create_time.desc())\
        .offset((page - 1) * page_size)\
        .limit(page_size)\
        .all()

    items = [
        DeductRecordResponse(
            record_sn=r.record_sn,
            contract_id=r.contract_id,
            user_id=r.user_id,
            subscription_id=r.subscription_id,
            order_id=r.order_id,
            amount=r.amount,
            payment_method=r.payment_method,
            out_trade_no=r.out_trade_no,
            transaction_id=r.transaction_id,
            status=r.status,
            status_desc=DEDUCT_STATUS_DESC.get(r.status, "未知"),
            notify_time=r.notify_time,
            deduct_time=r.deduct_time,
            complete_time=r.complete_time,
            fail_reason=r.fail_reason,
            retry_count=r.retry_count,
            create_time=r.create_time
        )
        for r in records
    ]

    return DeductRecordListResponse(total=total, items=items)
