"""
支付API接口
"""
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session
from typing import Dict
from decimal import Decimal
from datetime import datetime, timedelta
import json

from backend.passport.app.api.deps import get_db, get_current_user
from backend.passport.app.models.user import User
from backend.passport.app.core.config import settings
from backend.passport.app.core.logging import logger

from backend.payment.schemas.payment import (
    PaymentOrderCreate,
    PaymentOrderResponse,
    OrderStatusResponse,
    CancelOrderRequest
)
from backend.payment.services.order_service import OrderService
from backend.payment.services.business_service import BusinessService
from backend.payment.services.wechat_pay_service import WeChatPayService
from backend.payment.services.alipay_service import AlipayService
from backend.payment.models.payment import PaymentRecord
from backend.order.models.order import Order, OrderPaid, OrderHistory
from backend.order.services.order_history_service import OrderPaidService, OrderHistoryService
from backend.membership.models.membership import MembershipPackage
from backend.points.models.points import PointsPackage
from backend.notification.services.websocket_manager import manager
import asyncio

router = APIRouter()


@router.post("/create-order", response_model=PaymentOrderResponse)
async def create_payment_order(
    order_data: PaymentOrderCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    创建支付订单
    
    流程：
    1. 验证商品信息
    2. 计算订单金额
    3. 创建预订单
    4. 调用支付平台创建支付订单
    5. 返回支付二维码
    """
    try:
        logger.info(f"开始创建支付订单: user_id={current_user.id}, product_type={order_data.product_type}, product_id={order_data.product_id}, payment_method={order_data.payment_method}")
        
        # 1. 验证商品信息并获取价格
        amount = Decimal("0.00")
        original_amount = None
        product_snapshot = {}
        
        try:
            if order_data.product_type == "membership":
                package = db.query(MembershipPackage).filter(
                    MembershipPackage.id == order_data.product_id,
                    MembershipPackage.status == "enabled"
                ).first()
                
                if not package:
                    raise HTTPException(status_code=404, detail="会员套餐不存在或已下架")
                
                amount = package.price
                original_amount = package.original_price
                
                # 如果是升级订单，需要计算差价
                if order_data.is_upgrade:
                    # 获取当前会员
                    from backend.membership.models.membership import UserMembership
                    current_membership = db.query(UserMembership).filter(
                        UserMembership.user_id == current_user.id,
                        UserMembership.status == 1,
                        UserMembership.end_time > datetime.now()
                    ).order_by(UserMembership.end_time.desc()).first()
                    
                    if current_membership:
                        current_package = db.query(MembershipPackage).filter(
                            MembershipPackage.id == current_membership.package_id
                        ).first()
                        
                        if current_package and package.price > current_package.price:
                            # 计算剩余天数
                            remaining_days = max(0, (current_membership.end_time - datetime.now()).days)
                            price_diff = package.price - current_package.price
                            amount = price_diff * Decimal(str(remaining_days / 30))
                            amount = amount.quantize(Decimal("0.01"))
                
                product_snapshot = {
                    "name": package.name,
                    "type": package.type,
                    "points": package.points,
                    "rights": package.rights
                }
                
            elif order_data.product_type == "points":
                package = db.query(PointsPackage).filter(
                    PointsPackage.id == order_data.product_id,
                    PointsPackage.is_active == True
                ).first()
                
                if not package:
                    raise HTTPException(status_code=404, detail="积分包不存在或已下架")
                
                if not package.price or package.price <= 0:
                    raise HTTPException(status_code=400, detail="积分包价格无效")
                
                amount = package.price
                original_amount = package.original_price
                
                product_snapshot = {
                    "name": package.name,
                    "points": package.points,
                    "validity_days": package.validity_days
                }
            else:
                raise HTTPException(status_code=400, detail="不支持的商品类型")
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"验证商品信息失败: {str(e)}")
            import traceback
            traceback.print_exc()
            raise HTTPException(status_code=500, detail=f"验证商品信息失败: {str(e)}")
        
        # 2. 创建预订单
        logger.info(f"创建预订单: amount={amount}, product_type={order_data.product_type}")
        order = OrderService.create_pre_order(
            db=db,
            user_id=current_user.id,
            product_type=order_data.product_type,
            product_id=order_data.product_id,
            payment_method=order_data.payment_method,
            amount=amount,
            original_amount=original_amount,
            product_snapshot=product_snapshot,
            is_upgrade=order_data.is_upgrade
        )
        logger.info(f"预订单创建成功: order_no={order.order_no}")
        
        # 3. 调用支付平台创建支付订单
        payment_service = None
        try:
            if order_data.payment_method == "wechat":
                payment_service = WeChatPayService()
                logger.info(f"初始化微信支付服务: app_id={bool(settings.WECHAT_PAY_APP_ID)}, mch_id={bool(settings.WECHAT_PAY_MCH_ID)}")
            elif order_data.payment_method == "alipay":
                payment_service = AlipayService()
                logger.info(f"初始化支付宝支付服务")
            else:
                raise HTTPException(status_code=400, detail="不支持的支付方式")
        except Exception as e:
            logger.error(f"初始化支付服务失败: {str(e)}")
            raise HTTPException(status_code=500, detail=f"初始化支付服务失败: {str(e)}")
        
        # 构建回调地址
        notify_url = settings.WECHAT_PAY_NOTIFY_URL if order_data.payment_method == 'wechat' else settings.ALIPAY_NOTIFY_URL
        if not notify_url:
            # 如果没有配置，使用默认格式
            notify_url = f"https://yilaitu.com/api/v1/payment/{order_data.payment_method}/callback"
            logger.warning(f"回调地址未配置，使用默认地址: {notify_url}")
        
        # 商品描述
        description = product_snapshot.get("name", "商品购买")
        logger.info(f"准备创建支付订单: order_no={order.order_no}, amount={amount}, description={description}")
        
        # 创建支付订单
        payment_result = None
        try:
            # 打印微信支付接口调用参数
            logger.info(f"调用微信支付接口参数: order_no={order.order_no}, amount={amount}, description={description}, notify_url={notify_url}")
            payment_result = await payment_service.create_order(
                order_no=order.order_no,
                amount=amount,
                description=description,
                notify_url=notify_url
            )
            
            if not payment_result:
                raise ValueError("支付平台返回结果为空")
            
            logger.info(f"支付平台返回结果: success={payment_result.get('success')}, error={payment_result.get('error', '')}")
        except Exception as e:
            import traceback
            error_detail = traceback.format_exc()
            logger.error(f"调用支付平台API异常: {str(e)}\n{error_detail}")
            # 删除预订单
            try:
                db.delete(order)
                db.commit()
            except:
                db.rollback()
            raise HTTPException(status_code=500, detail=f"调用支付平台失败: {str(e)}")
        
        # 处理支付结果
        if not payment_result or not payment_result.get("success"):
            # 支付订单创建失败，直接返回错误
            error_msg = payment_result.get('error', '未知错误') if payment_result else '支付平台返回结果为空'
            logger.error(f"支付订单创建失败: {error_msg}")

            # 删除预订单
            try:
                db.delete(order)
                db.commit()
            except:
                db.rollback()

            raise HTTPException(status_code=500, detail=f"支付订单创建失败: {error_msg}")

        # 获取支付结果
        qr_code_url = payment_result.get("qr_code_url", "") or payment_result.get("pay_url", "")
        payment_no = payment_result.get("payment_no", "") or order.order_no

        if not qr_code_url:
            # 如果没有二维码URL，返回错误
            logger.error(f"支付平台未返回二维码URL: payment_method={order_data.payment_method}")

            # 删除预订单
            try:
                db.delete(order)
                db.commit()
            except:
                db.rollback()

            raise HTTPException(status_code=500, detail="支付平台未返回有效的二维码URL")
        
        # 4. 更新订单的支付信息
        try:
            order = OrderService.update_order_qr_code(
                db=db,
                order_no=order.order_no,
                qr_code_url=qr_code_url,
                payment_no=payment_no
            )
        except Exception as e:
            logger.error(f"更新订单二维码信息失败: {str(e)}")
            import traceback
            traceback.print_exc()
            # 不中断流程，继续执行
        
        # 5. 记录支付操作
        try:
            payment_record = PaymentRecord(
                order_no=order.order_no,
                payment_no=payment_no,
                payment_method=order_data.payment_method,
                action_type="create",
                amount=amount,
                status="success" if payment_result and payment_result.get("success") else "failed",
                request_data=json.dumps({"order_no": order.order_no, "amount": str(amount)}, ensure_ascii=False),
                response_data=json.dumps(payment_result if payment_result else {}, ensure_ascii=False, default=str),
                error_message=None if (payment_result and payment_result.get("success")) else (payment_result.get('error') if payment_result else '未知错误')
            )
            db.add(payment_record)
            db.commit()
        except Exception as e:
            logger.error(f"记录支付操作失败: {str(e)}")
            import traceback
            traceback.print_exc()
            db.rollback()
            # 不中断流程，继续执行
        
        # 计算过期时间
        qr_code_expire_at = datetime.now() + timedelta(minutes=settings.QR_CODE_EXPIRE_MINUTES)
        expire_at = datetime.now() + timedelta(minutes=settings.ORDER_EXPIRE_MINUTES)
        
        return PaymentOrderResponse(
            order_no=order.order_no,
            amount=amount,
            qr_code_url=qr_code_url,
            qr_code_expire_at=qr_code_expire_at,
            expire_at=expire_at,
            payment_method=order_data.payment_method
        )
        
    except HTTPException as he:
        # 重新抛出HTTP异常，保持原始状态码和详情
        raise he
    except Exception as e:
        import traceback
        error_detail = traceback.format_exc()
        logger.error(f"创建支付订单异常: {str(e)}\n{error_detail}")
        
        # 提取错误信息的关键部分
        error_msg = str(e)
        if "No module named" in error_msg:
            error_msg = "模块导入错误，请检查代码"
        elif "NoneType" in error_msg:
            error_msg = "配置缺失或数据为空"
        
        raise HTTPException(
            status_code=500, 
            detail=f"创建支付订单失败: {error_msg}"
        )


@router.get("/order-status", response_model=OrderStatusResponse)
def get_order_status(
    order_no: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    查询订单状态
    只从 order_reservation 表中查询
    当检测到 paid 状态时，执行订单迁移到 order 表
    """
    # 只从预订单表(order_reservation)查询
    order = OrderService.get_order_by_no(db, order_no)

    if not order:
        raise HTTPException(status_code=404, detail="订单不存在")

    # 验证订单归属
    if order.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="无权访问此订单")

    # 如果订单状态是paid，执行订单迁移，然后返回paid状态
    if order.status == 'paid':
        # 先构造返回值
        response = OrderStatusResponse(
            order_no=order.order_no,
            status=order.status,
            amount=order.amount,
            payment_time=order.payment_time
        )

        # 执行订单迁移（迁移后order_reservation表将没有该记录）
        try:
            OrderPaidService.move_to_paid(db, order)
            logger.info(f"轮询检测到支付成功，订单迁移到order表: order_no={order_no}")
        except Exception as e:
            logger.error(f"订单迁移失败: order_no={order_no}, error={str(e)}")

        return response

    # 其他状态正常返回
    return OrderStatusResponse(
        order_no=order.order_no,
        status=order.status,
        amount=order.amount,
        payment_time=order.payment_time
    )


@router.post("/cancel-order")
def cancel_order(
    request: CancelOrderRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    取消订单
    """
    order = OrderService.get_order_by_no(db, request.order_no)
    
    if not order:
        raise HTTPException(status_code=404, detail="订单不存在")
    
    # 验证订单归属
    if order.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="无权访问此订单")
    
    try:
        order = OrderService.cancel_order(db, request.order_no)
        return {"code": 200, "msg": "订单已取消", "data": None}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/wechat/callback")
async def wechat_payment_callback(request: Request, db: Session = Depends(get_db)):
    """
    微信支付回调接口
    参考官方文档：https://pay.weixin.qq.com/doc/v3/merchant/4012071382
    """
    try:
        # 获取回调数据
        body = await request.body()
        headers = dict(request.headers)
        
        # 记录完整的回调信息用于调试
        logger.info(f"微信支付回调接收到的headers: {headers}")
        logger.info(f"微信支付回调接收到的body: {body.decode('utf-8') if body else '空'}")
        
        # 解析回调数据
        data = json.loads(body.decode('utf-8')) if body else {}
        
        # 验证签名
        wechat_service = WeChatPayService()
        is_valid = await wechat_service.verify_callback({
            "signature": headers.get("wechatpay-signature", ""),
            "timestamp": headers.get("wechatpay-timestamp", ""),
            "nonce": headers.get("wechatpay-nonce", ""),
            "body": body.decode('utf-8') if body else ""
        })
        
        if not is_valid:
            logger.warning("微信支付回调签名验证失败")
            return {"code": "FAIL", "message": "签名验证失败"}
        
        # 处理回调
        callback_result = await wechat_service.process_callback(data)
        
        if not callback_result.get("success"):
            logger.error(f"微信支付回调处理失败: {callback_result.get('error')}")
            return {"code": "FAIL", "message": "处理失败"}
        
        order_no = callback_result.get("order_no")
        payment_status = callback_result.get("status")
        
        # 获取订单
        order = OrderService.get_order_by_no(db, order_no)
        if not order:
            logger.error(f"订单不存在: order_no={order_no}")
            return {"code": "FAIL", "message": "订单不存在"}
        
        # 如果订单已经是paid状态，说明已经处理过，直接返回成功
        if order.status == "paid":
            logger.info(f"订单已处理过: order_no={order_no}")
            return {"code": "SUCCESS", "message": "处理成功"}
        
        # 更新订单状态
        if payment_status == "paid":
            payment_time = callback_result.get("paid_time")
            if payment_time:
                try:
                    payment_time = datetime.fromisoformat(payment_time.replace('Z', '+00:00'))
                except:
                    payment_time = datetime.now()
            else:
                payment_time = datetime.now()
            
            OrderService.update_order_status(
                db=db,
                order_no=order_no,
                status="paid",
                payment_no=callback_result.get("payment_no"),
                payment_time=payment_time,
                callback_data=data
            )
            
            # 执行业务逻辑
            order = OrderService.get_order_by_no(db, order_no)
            success = BusinessService.process_paid_order(db, order)
            
            if success:
                # 发送WebSocket通知
                try:
                    asyncio.create_task(manager.send_payment_success(order.user_id, order_no))
                except Exception as e:
                    logger.error(f"发送支付成功通知失败: {e}")

                # 记录支付回调
                payment_record = PaymentRecord(
                    order_no=order_no,
                    payment_no=callback_result.get("payment_no"),
                    payment_method="wechat",
                    action_type="callback",
                    amount=callback_result.get("amount", order.amount),
                    status="success",
                    request_data=json.dumps(data),
                    response_data=json.dumps(callback_result)
                )
                db.add(payment_record)
                db.commit()

                return {"code": "SUCCESS", "message": "处理成功"}
            else:
                logger.error(f"业务处理失败: order_no={order_no}")
                return {"code": "FAIL", "message": "业务处理失败"}
        else:
            # 记录回调
            payment_record = PaymentRecord(
                order_no=order_no,
                payment_no=callback_result.get("payment_no"),
                payment_method="wechat",
                action_type="callback",
                amount=callback_result.get("amount", order.amount),
                status="failed",
                request_data=json.dumps(data),
                response_data=json.dumps(callback_result),
                error_message=f"支付状态: {payment_status}"
            )
            db.add(payment_record)
            db.commit()
            
            return {"code": "SUCCESS", "message": "已记录"}
            
    except Exception as e:
        logger.error(f"微信支付回调处理异常: {str(e)}")
        return {"code": "FAIL", "message": str(e)}


@router.post("/alipay/callback")
async def alipay_payment_callback(request: Request, db: Session = Depends(get_db)):
    """
    支付宝支付回调接口
    """
    try:
        # 获取回调数据（支付宝使用form表单提交）
        form_data = await request.form()
        data = dict(form_data)
        
        # 验证签名
        alipay_service = AlipayService()
        is_valid = await alipay_service.verify_callback(data)
        
        if not is_valid:
            logger.warning("支付宝支付回调签名验证失败")
            return "failure"
        
        # 处理回调
        callback_result = await alipay_service.process_callback(data)
        
        if not callback_result.get("success"):
            logger.error(f"支付宝支付回调处理失败: {callback_result.get('error')}")
            return "failure"
        
        order_no = callback_result.get("order_no")
        payment_status = callback_result.get("status")
        
        # 获取订单
        order = OrderService.get_order_by_no(db, order_no)
        if not order:
            logger.error(f"订单不存在: order_no={order_no}")
            return "failure"
        
        # 如果订单已经是paid状态，说明已经处理过，直接返回成功
        if order.status == "paid":
            logger.info(f"订单已处理过: order_no={order_no}")
            return "success"
        
        # 更新订单状态
        if payment_status == "paid":
            payment_time = callback_result.get("paid_time")
            if payment_time:
                try:
                    payment_time = datetime.strptime(payment_time, "%Y-%m-%d %H:%M:%S")
                except:
                    payment_time = datetime.now()
            else:
                payment_time = datetime.now()
            
            OrderService.update_order_status(
                db=db,
                order_no=order_no,
                status="paid",
                payment_no=callback_result.get("payment_no"),
                payment_time=payment_time,
                callback_data=data
            )
            
            # 执行业务逻辑
            order = OrderService.get_order_by_no(db, order_no)
            success = BusinessService.process_paid_order(db, order)
            
            if success:
                # 发送WebSocket通知
                try:
                    asyncio.create_task(manager.send_payment_success(order.user_id, order_no))
                except Exception as e:
                    logger.error(f"发送支付成功通知失败: {e}")

                # 记录支付回调
                payment_record = PaymentRecord(
                    order_no=order_no,
                    payment_no=callback_result.get("payment_no"),
                    payment_method="alipay",
                    action_type="callback",
                    amount=callback_result.get("amount", order.amount),
                    status="success",
                    request_data=json.dumps(data),
                    response_data=json.dumps(callback_result)
                )
                db.add(payment_record)
                db.commit()

                return "success"
            else:
                logger.error(f"业务处理失败: order_no={order_no}")
                return "failure"
        else:
            # 记录回调
            payment_record = PaymentRecord(
                order_no=order_no,
                payment_no=callback_result.get("payment_no"),
                payment_method="alipay",
                action_type="callback",
                amount=callback_result.get("amount", order.amount),
                status="failed",
                request_data=json.dumps(data),
                response_data=json.dumps(callback_result),
                error_message=f"支付状态: {payment_status}"
            )
            db.add(payment_record)
            db.commit()
            
            return "success"
            
    except Exception as e:
        logger.error(f"支付宝支付回调处理异常: {str(e)}")
        return "failure"