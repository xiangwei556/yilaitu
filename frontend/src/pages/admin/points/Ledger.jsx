import React from 'react';
import { ProTable } from '@ant-design/pro-components';
import request from '../../../utils/request';

const Ledger = () => {
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
      title: '类型',
      dataIndex: 'type',
      width: 100,
      valueType: 'select',
      valueEnum: {
        earn: { text: '获得' },
        consume: { text: '消耗' },
      },
    },
    {
      title: '数量',
      dataIndex: 'amount',
      width: 100,
      search: false,
    },
    {
      title: '变动后余额',
      dataIndex: 'balance_after',
      width: 120,
      search: false,
    },
    {
      title: '来源',
      dataIndex: 'source_type',
      width: 150,
    },
    {
      title: '备注',
      dataIndex: 'remark',
      width: 200,
      ellipsis: true,
      search: false,
    },
    {
      title: '时间',
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
        const res = await request.get('/points/admin/ledger');
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
      headerTitle="积分台账"
      toolBarRender={false}
    />
  );
};

export default Ledger;
