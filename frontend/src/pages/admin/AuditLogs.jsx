import React, { useRef } from 'react';
import { Tag } from 'antd';
import { ProTable } from '@ant-design/pro-components';
import request from '../../utils/request';

const AuditLogs = () => {
  const actionRef = useRef();

  const columns = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
    },
    {
      title: '用户ID',
      dataIndex: 'user_id',
      key: 'user_id',
    },
    {
      title: '事件类型',
      dataIndex: 'event_type',
      key: 'event_type',
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: status => (
        <Tag color={status === 'success' ? 'green' : 'red'}>
          {status === 'success' ? '成功' : '失败'}
        </Tag>
      ),
    },
    {
      title: 'IP地址',
      dataIndex: 'ip',
      key: 'ip',
    },
    {
      title: '详情',
      dataIndex: 'detail',
      key: 'detail',
      ellipsis: true,
    },
    {
      title: '时间',
      dataIndex: 'created_at',
      key: 'created_at',
      render: text => new Date(text).toLocaleString()
    },
  ];

  return (
    <ProTable
      columns={columns}
      actionRef={actionRef}
      request={async (params) => {
        const res = await request.get('/admin/logs', {
          params: {
            page: params.current,
            size: params.pageSize
          }
        });
        return {
          data: res.items || [],
          success: true,
          total: res.total || 0,
        };
      }}
      rowKey="id"
      pagination={{
        showSizeChanger: true,
        showTotal: (total) => `共 ${total} 条`,
      }}
      dateFormatter="string"
      headerTitle="操作日志"
      search={false}
    />
  );
};

export default AuditLogs;
