import request from '../utils/request';

export interface PaymentOrderCreate {
  product_type: 'membership' | 'points';
  product_id: number;
  payment_method: 'wechat' | 'alipay';
  is_upgrade?: boolean;
}

export interface PaymentOrderResponse {
  order_no: string;
  amount: number;
  qr_code_url: string;
  qr_code_expire_at: string;
  expire_at: string;
  payment_method: 'wechat' | 'alipay';
}

export interface OrderStatusResponse {
  order_no: string;
  status: 'pending' | 'paid' | 'cancelled' | 'refunded';
  amount: number;
  payment_time?: string;
}

/**
 * 创建支付订单
 */
export async function createPaymentOrder(data: PaymentOrderCreate): Promise<PaymentOrderResponse> {
  const response = await request.post('/payment/create-order', data);
  return response;
}

/**
 * 查询订单状态
 */
export async function getOrderStatus(orderNo: string): Promise<OrderStatusResponse> {
  const response = await request.get(`/payment/order-status?order_no=${orderNo}`);
  return response;
}

/**
 * 取消订单
 */
export async function cancelOrder(orderNo: string): Promise<void> {
  await request.post('/payment/cancel-order', { order_no: orderNo });
}