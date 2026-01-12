"""
支付系统定时任务
"""
import asyncio
from datetime import datetime
from sqlalchemy.orm import Session
from backend.passport.app.db.session import SessionLocal
from backend.payment.services.order_service import OrderService
from backend.payment.services.wechat_pay_service import WeChatPayService
from backend.payment.services.alipay_service import AlipayService
from backend.payment.services.business_service import BusinessService
from backend.passport.app.core.logging import logger


async def cancel_expired_orders_task():
    """
    订单状态处理任务
    每分钟执行一次
    1. 将已支付订单迁移到order表
    2. 将过期的pending订单取消并迁移到order_history表
    """
    while True:
        try:
            db: Session = SessionLocal()
            try:
                # 1. 先处理已支付订单，迁移到order表
                paid_count = OrderService.migrate_paid_orders(db)
                if paid_count > 0:
                    logger.info(f"定时任务: 迁移了 {paid_count} 个已支付订单到order表")

                # 2. 再处理过期订单，取消并迁移到order_history表
                expired_count = OrderService.cancel_expired_orders(db)
                if expired_count > 0:
                    logger.info(f"定时任务: 取消了 {expired_count} 个过期订单")
            finally:
                db.close()
        except Exception as e:
            logger.error(f"订单状态处理任务异常: {str(e)}")

        # 等待60秒
        await asyncio.sleep(60)


async def query_pending_payments_task():
    """
    查询待支付订单状态任务
    每5分钟执行一次
    """
    while True:
        try:
            db: Session = SessionLocal()
            try:
                # 获取需要查询的订单
                pending_orders = OrderService.get_pending_orders_for_query(db, limit=50)
                
                if pending_orders:
                    logger.info(f"定时任务: 开始查询 {len(pending_orders)} 个待支付订单状态")
                    
                    for order in pending_orders:
                        try:
                            # 根据支付方式选择服务
                            if order.payment_method == "wechat":
                                payment_service = WeChatPayService()
                            elif order.payment_method == "alipay":
                                payment_service = AlipayService()
                            else:
                                continue
                            
                            # 查询订单状态（使用商户订单号）
                            query_result = await payment_service.query_order(order.order_no)
                            
                            if query_result.get("success"):
                                payment_status = query_result.get("status")
                                
                                # 如果支付成功，更新订单状态并执行业务逻辑
                                if payment_status == "paid":
                                    payment_time = query_result.get("paid_time")
                                    if payment_time:
                                        try:
                                            if isinstance(payment_time, str):
                                                payment_time = datetime.fromisoformat(payment_time.replace('Z', '+00:00'))
                                        except:
                                            payment_time = datetime.now()
                                    else:
                                        payment_time = datetime.now()
                                    
                                    OrderService.update_order_status(
                                        db=db,
                                        order_no=order.order_no,
                                        status="paid",
                                        payment_no=query_result.get("payment_no", order.payment_no),
                                        payment_time=payment_time,
                                        callback_data=query_result
                                    )
                                    
                                    # 重新获取订单对象
                                    updated_order = OrderService.get_order_by_no(db, order.order_no)
                                    if updated_order:
                                        # 执行业务逻辑
                                        success = BusinessService.process_paid_order(db, updated_order)
                                        if success:
                                            # 订单迁移由 cancel_expired_orders_task 每分钟处理
                                            logger.info(f"定时任务: 订单支付成功并处理完成 - {order.order_no}")
                                        else:
                                            logger.error(f"定时任务: 订单支付成功但业务处理失败 - {order.order_no}")
                                    
                                # 如果支付失败或取消，更新订单状态
                                elif payment_status in ["cancelled", "failed"]:
                                    OrderService.update_order_status(
                                        db=db,
                                        order_no=order.order_no,
                                        status=payment_status,
                                        callback_data=query_result
                                    )
                                    logger.info(f"定时任务: 订单状态更新为 {payment_status} - {order.order_no}")
                                
                            else:
                                # 查询失败，增加重试次数
                                OrderService.increment_retry_count(db, order.order_no)
                                logger.warning(f"定时任务: 查询订单状态失败 - {order.order_no}, 错误: {query_result.get('error')}")
                                
                        except Exception as e:
                            logger.error(f"定时任务: 处理订单 {order.order_no} 时异常: {str(e)}")
                            # 增加重试次数
                            OrderService.increment_retry_count(db, order.order_no)
                
            finally:
                db.close()
        except Exception as e:
            logger.error(f"查询待支付订单状态任务异常: {str(e)}")
        
        # 等待5分钟
        await asyncio.sleep(300)


async def start_payment_scheduled_tasks():
    """
    启动所有支付相关的定时任务
    """
    logger.info("启动支付系统定时任务...")
    
    # 启动取消过期订单任务
    asyncio.create_task(cancel_expired_orders_task())
    
    # 启动查询待支付订单状态任务
    asyncio.create_task(query_pending_payments_task())
    
    logger.info("支付系统定时任务已启动")