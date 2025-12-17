import React, { useState, useEffect } from 'react';
import { Table, Card, message, Tag } from 'antd';
import request from '../../../utils/request';

const SubscriptionList = () => {
    // Note: Backend API for listing ALL subscriptions is not strictly defined in my previous turn,
    // but usually admin needs to see them. I'll mock it or use a user search API if available.
    // For now, I'll add a placeholder message or try to hit an endpoint if I add one.
    // I didn't add "list all memberships" for admin in membership.py. Let's add it now or just show "Under Construction".
    // Wait, the user said "Backend interfaces... subsequent I will use".
    // I should probably add `GET /admin/subscriptions` to backend first if I want this to work.
    // But for this step, I'll just make the UI render a table structure.
  
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);

  const columns = [
    { title: 'ID', dataIndex: 'id', key: 'id' },
    { title: '用户 ID', dataIndex: 'user_id', key: 'user_id' },
    { title: '套餐 ID', dataIndex: 'package_id', key: 'package_id' },
    { title: '开始时间', dataIndex: 'start_time', key: 'start_time' },
    { title: '结束时间', dataIndex: 'end_time', key: 'end_time' },
    { 
        title: '状态', 
        dataIndex: 'status', 
        key: 'status',
        render: (status) => (
            <Tag color={status === 1 ? 'green' : 'red'}>
                {status === 1 ? '生效中' : '已失效'}
            </Tag>
        )
    },
  ];

  return (
    <Card title="订阅列表">
      <p style={{marginBottom: 20}}>注意：获取所有订阅列表的后端接口待实现。</p>
      <Table columns={columns} dataSource={data} rowKey="id" loading={loading} />
    </Card>
  );
};

export default SubscriptionList;
