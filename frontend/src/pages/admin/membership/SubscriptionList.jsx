import React from 'react';
import { ProTable } from '@ant-design/pro-components';
import { Tag } from 'antd';
import request from '../../../utils/request';

const SubscriptionList = () => {
  const actionRef = React.useRef();

  const columns = [
    {
      title: 'ID',
      dataIndex: 'id',
      width: 80,
      search: false,
    },
    {
      title: '用户 ID',
      dataIndex: 'user_id',
      width: 120,
    },
    {
      title: '套餐 ID',
      dataIndex: 'package_id',
      width: 120,
    },
    {
      title: '开始时间',
      dataIndex: 'start_time',
      width: 180,
      valueType: 'dateTime',
      search: false,
    },
    {
      title: '结束时间',
      dataIndex: 'end_time',
      width: 180,
      valueType: 'dateTime',
      search: false,
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 100,
      valueType: 'select',
      valueEnum: {
        1: { text: '生效中', status: 'Success' },
        0: { text: '已失效', status: 'Default' },
      },
      render: (_, record) => (
        <Tag color={record.status === 1 ? 'green' : 'red'}>
          {record.status === 1 ? '生效中' : '已失效'}
        </Tag>
      ),
    },
  ];

  return (
    <ProTable
      columns={columns}
      actionRef={actionRef}
      request={async () => {
        return {
          data: [],
          success: true,
          total: 0,
        };
      }}
      rowKey="id"
      search={false}
      pagination={false}
      dateFormatter="string"
      headerTitle="订阅列表"
      toolBarRender={false}
    />
  );
};

export default SubscriptionList;
