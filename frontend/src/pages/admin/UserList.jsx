import React from 'react';
import { ProTable } from '@ant-design/pro-components';
import { Tag, Button } from 'antd';
import request from '../../utils/request';

const UserList = () => {
  const actionRef = React.useRef();

  const handleStatusChange = async (userId, status) => {
    try {
      await request.patch(`/admin/users/${userId}/status?status=${status}`);
      actionRef.current?.reload();
    } catch (error) {
      console.error(error);
    }
  };

  const columns = [
    {
      title: 'ID',
      dataIndex: 'id',
      width: 80,
      search: false,
    },
    {
      title: '用户名',
      dataIndex: 'username',
    },
    {
      title: '昵称',
      dataIndex: 'nickname',
    },
    {
      title: '角色',
      dataIndex: 'role',
      valueType: 'select',
      valueEnum: {
        admin: { text: '管理员', status: 'Error' },
        user: { text: '普通用户', status: 'Default' },
      },
      render: (_, record) => (
        <Tag color={record.role === 'admin' ? 'red' : 'blue'}>
          {record.role === 'admin' ? '管理员' : '普通用户'}
        </Tag>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 100,
      valueType: 'select',
      valueEnum: {
        1: { text: '启用', status: 'Success' },
        0: { text: '禁用', status: 'Default' },
      },
      render: (_, record) => (
        <Tag color={record.status === 1 ? 'green' : 'volcano'}>
          {record.status === 1 ? '启用' : '禁用'}
        </Tag>
      ),
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      width: 180,
      valueType: 'dateTime',
      search: false,
    },
    {
      title: '操作',
      key: 'action',
      width: 120,
      fixed: 'right',
      search: false,
      render: (_, record) => (
        record.status === 1 ? (
          <Button type="link" size="small" danger onClick={() => handleStatusChange(record.id, 0)}>
            禁用
          </Button>
        ) : (
          <Button type="link" size="small" onClick={() => handleStatusChange(record.id, 1)}>
            启用
          </Button>
        )
      ),
    },
  ];

  return (
    <ProTable
      columns={columns}
      actionRef={actionRef}
      request={async (params, sort, filter) => {
        const res = await request.get('/admin/users', {
          params: {
            page: params.current,
            size: params.pageSize,
            keyword: params.username,
          },
        });
        return {
          data: res.items || [],
          success: true,
          total: res.total || 0,
        };
      }}
      rowKey="id"
      search={{
        labelWidth: 'auto',
      }}
      pagination={{
        defaultPageSize: 10,
        showSizeChanger: true,
        showQuickJumper: true,
      }}
      dateFormatter="string"
      headerTitle="用户管理"
    />
  );
};

export default UserList;
