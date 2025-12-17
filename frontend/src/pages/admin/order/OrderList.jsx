import React, { useState, useEffect } from 'react';
import { Table, Card, message } from 'antd';
import request from '../../../utils/request';

const OrderList = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res = await request.get('/order/admin/orders');
      setOrders(res);
    } catch (error) {
      message.error('Failed to fetch orders');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const columns = [
    { title: '订单号', dataIndex: 'order_no', key: 'order_no' },
    { title: '用户 ID', dataIndex: 'user_id', key: 'user_id' },
    { title: '金额', dataIndex: 'amount', key: 'amount' },
    { title: '类型', dataIndex: 'type', key: 'type' },
    { title: '状态', dataIndex: 'status', key: 'status' },
    { title: '创建时间', dataIndex: 'created_at', key: 'created_at' },
  ];

  return (
    <Card title="订单管理">
      <Table columns={columns} dataSource={orders} rowKey="id" loading={loading} />
    </Card>
  );
};

export default OrderList;
