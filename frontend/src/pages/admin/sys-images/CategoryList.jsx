import React from 'react';
import { ProTable } from '@ant-design/pro-components';
import { Button, Tag, Popconfirm, message } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import {
  listCategories,
  deleteCategory,
  batchDeleteCategories,
  changeCategoryStatus,
  batchChangeCategoryStatus
} from '../../../api/sysImages';

const CategoryList = () => {
  const navigate = useNavigate();
  const actionRef = React.useRef();

  const handleDelete = async (id) => {
    try {
      await deleteCategory(id);
      message.success('删除成功');
      actionRef.current?.reload();
    } catch (error) {
      message.error('删除失败');
    }
  };

  const handleStatusChange = async (id, status) => {
    try {
      await changeCategoryStatus(id, status);
      message.success('状态修改成功');
      actionRef.current?.reload();
    } catch (error) {
      message.error('状态修改失败');
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
      title: '类目名称',
      dataIndex: 'name',
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 100,
      valueType: 'select',
      valueEnum: {
        enabled: { text: '启用', status: 'Success' },
        disabled: { text: '禁用', status: 'Default' },
      },
      render: (_, record) => (
        <Tag color={record.status === 'enabled' ? 'green' : 'red'}>
          {record.status === 'enabled' ? '启用' : '禁用'}
        </Tag>
      ),
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      width: 180,
      valueType: 'dateTime',
      search: false,
      render: (_, record) => record.created_at ? new Date(record.created_at).toLocaleString() : '-',
    },
    {
      title: '操作',
      key: 'action',
      width: 200,
      fixed: 'right',
      search: false,
      render: (_, record) => (
        <>
          <Button type="link" size="small" onClick={() => navigate(`/admin/sys-images/categories/${record.id}/edit`)}>
            编辑
          </Button>
          <Button
            type="link"
            size="small"
            onClick={() => handleStatusChange(record.id, record.status === 'enabled' ? 'disabled' : 'enabled')}
          >
            {record.status === 'enabled' ? '禁用' : '启用'}
          </Button>
          <Popconfirm title="确定删除吗？" onConfirm={() => handleDelete(record.id)}>
            <Button type="link" size="small" danger>
              删除
            </Button>
          </Popconfirm>
        </>
      ),
    },
  ];

  return (
    <ProTable
      columns={columns}
      actionRef={actionRef}
      request={async (params, sort, filter) => {
        const res = await listCategories({
          page: params.current,
          page_size: params.pageSize,
          name: params.name,
          status: params.status,
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
      headerTitle="类目管理"
      toolBarRender={() => [
        <Button
          key="create"
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => navigate('/admin/sys-images/categories/new')}
        >
          新增类目
        </Button>,
      ]}
      rowSelection={{
        onChange: (_, selectedRows) => {
          console.log(selectedRows);
        },
      }}
      tableAlertRender={({ selectedRowKeys, onCleanSelected }) => (
        <span>
          已选择 <a style={{ fontWeight: 600 }}>{selectedRowKeys.length}</a> 项
          <a style={{ marginLeft: 8 }} onClick={onCleanSelected}>
            取消选择
          </a>
        </span>
      )}
      tableAlertOptionRender={({ selectedRowKeys }) => (
        <Popconfirm
          title="确定批量删除吗？"
          onConfirm={async () => {
            try {
              await batchDeleteCategories(selectedRowKeys);
              message.success('批量删除成功');
              actionRef.current?.reload();
            } catch (error) {
              message.error('批量删除失败');
            }
          }}
        >
          <a style={{ color: 'red' }}>批量删除</a>
        </Popconfirm>
      )}
    />
  );
};

export default CategoryList;
