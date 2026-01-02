import request from '../utils/request';

export interface Order {
  id: number;
  order_no: string;
  amount: number;
  type: string;
  status: string;
  created_at: string;
}

export interface PointsTransaction {
  id: number;
  type: string;
  amount: number;
  balance_after: number;
  source_type: string;
  created_at: string;
}

export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
}

export const getMyOrders = (page: number, pageSize: number) => {
  return request.get('/user-purchase/orders', {
    params: { page, page_size: pageSize },
  }) as any as Promise<Page<Order>>;
};

export const getMyPointsTransactions = (page: number, pageSize: number) => {
  return request.get('/user-purchase/points-transactions', {
    params: { page, page_size: pageSize },
  }) as any as Promise<Page<PointsTransaction>>;
};
