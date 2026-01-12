import React, { useState, useEffect } from 'react';
import { Table, Card, message } from 'antd';
import request from '../../../utils/request';

const OrderList = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res = await request.get('/order/admin/paid-orders');
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

  const typeMap = {
    'membership': '会员',
    'membership_upgrade': '会员升级',
    'points': '积分'
  };

  const statusMap = {
    'paid': '已支付',
    'refunded': '已退款'
  };

  const columns = [
    { title: '订单号', dataIndex: 'order_no', key: 'order_no' },
    { 
      title: '用户头像', 
      dataIndex: 'user_id', 
      key: 'avatar',
      render: () => (
        <img 
          src="/touxiang.svg" 
          alt="用户头像" 
          style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover' }}
        />
      )
    },
    { title: '用户 ID', dataIndex: 'user_id', key: 'user_id' },
    { title: '金额', dataIndex: 'amount', key: 'amount' },
    { 
      title: '类型', 
      dataIndex: 'type', 
      key: 'type',
      render: (type) => typeMap[type] || type
    },
    { 
      title: '状态', 
      dataIndex: 'status', 
      key: 'status',
      render: (status) => statusMap[status] || status
    },
    { title: '支付时间', dataIndex: 'payment_time', key: 'payment_time' },
    { title: '创建时间', dataIndex: 'created_at', key: 'created_at' },
  ];

  return (
    <Card title="订单管理">
      <Table columns={columns} dataSource={orders} rowKey="id" loading={loading} />
    </Card>
  );
};

export default OrderList;
