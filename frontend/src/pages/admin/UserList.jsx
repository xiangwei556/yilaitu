import React, { useEffect, useState } from 'react';
import { Table, Tag, Space, Button, message, Input, Modal } from 'antd';
import request from '../../utils/request';

const { Search } = Input;

const UserList = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0
  });
  const [keyword, setKeyword] = useState('');

  const fetchUsers = async (page = 1, size = 10, search = '') => {
    setLoading(true);
    try {
      const res = await request.get('/admin/users', {
        params: {
          page,
          size,
          keyword: search
        }
      });
      setData(res.items);
      setPagination({
        ...pagination,
        current: page,
        total: res.total
      });
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleTableChange = (pagination) => {
    fetchUsers(pagination.current, pagination.pageSize, keyword);
  };

  const handleSearch = (value) => {
    setKeyword(value);
    fetchUsers(1, pagination.pageSize, value);
  };

  const handleStatusChange = async (userId, status) => {
      try {
          await request.patch(`/admin/users/${userId}/status?status=${status}`);
          message.success('状态已更新');
          fetchUsers(pagination.current, pagination.pageSize, keyword);
      } catch (error) {
          // error handled
      }
  };

  const columns = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
    },
    {
      title: '用户名',
      dataIndex: 'username',
      key: 'username',
    },
    {
      title: '昵称',
      dataIndex: 'nickname',
      key: 'nickname',
    },
    {
      title: '角色',
      dataIndex: 'role',
      key: 'role',
      render: role => <Tag color={role === 'admin' ? 'red' : 'blue'}>{role === 'admin' ? '管理员' : '普通用户'}</Tag>
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: status => (
        <Tag color={status === 1 ? 'green' : 'volcano'}>
          {status === 1 ? '启用' : '禁用'}
        </Tag>
      ),
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      render: text => new Date(text).toLocaleString()
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <Space size="middle">
          {record.status === 1 ? (
              <Button type="link" danger onClick={() => handleStatusChange(record.id, 0)}>禁用</Button>
          ) : (
              <Button type="link" onClick={() => handleStatusChange(record.id, 1)}>启用</Button>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <Search placeholder="搜索用户" onSearch={handleSearch} style={{ width: 200 }} />
      </div>
      <Table 
        columns={columns} 
        dataSource={data} 
        rowKey="id"
        pagination={pagination}
        loading={loading}
        onChange={handleTableChange}
      />
    </div>
  );
};

export default UserList;
