import React from 'react';
import { ProTable } from '@ant-design/pro-components';
import request from '../../../utils/request';

const OrderList = () => {
  const actionRef = React.useRef();

  const columns = [
    { 
      title: '订单号', 
      dataIndex: 'order_no', 
      width: 180,
    },
    { 
      title: '用户头像', 
      dataIndex: 'user_id', 
      width: 100,
      search: false,
      render: () => (
        <img 
          src="/touxiang.svg" 
          alt="用户头像" 
          style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover' }}
        />
      )
    },
    { 
      title: '用户 ID', 
      dataIndex: 'user_id', 
      width: 100,
    },
    { 
      title: '金额', 
      dataIndex: 'amount', 
      width: 100,
      search: false,
    },
    { 
      title: '类型', 
      dataIndex: 'type', 
      width: 120,
      valueType: 'select',
      valueEnum: {
        membership: { text: '会员' },
        membership_upgrade: { text: '会员升级' },
        points: { text: '积分' },
      },
    },
    { 
      title: '状态', 
      dataIndex: 'status', 
      width: 100,
      valueType: 'select',
      valueEnum: {
        paid: { text: '已支付', status: 'Success' },
        refunded: { text: '已退款', status: 'Default' },
      },
    },
    { 
      title: '支付时间', 
      dataIndex: 'payment_time', 
      width: 180,
      valueType: 'dateTime',
      search: false,
    },
    { 
      title: '创建时间', 
      dataIndex: 'created_at', 
      width: 180,
      valueType: 'dateTime',
      search: false,
    },
  ];

  return (
    <ProTable
      columns={columns}
      actionRef={actionRef}
      request={async () => {
        const res = await request.get('/order/admin/paid-orders');
        return {
          data: res || [],
          success: true,
          total: (res || []).length,
        };
      }}
      rowKey="id"
      search={false}
      pagination={false}
      dateFormatter="string"
      headerTitle="订单管理"
      toolBarRender={false}
    />
  );
};

export default OrderList;
