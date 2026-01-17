import React, { useState, useEffect } from 'react';
import { ProTable } from '@ant-design/pro-components';
import { Button, Tag, Popconfirm, message, Image, Tooltip } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import {
  listModelRefs,
  deleteModelRef,
  batchDeleteModelRefs,
  changeModelRefStatus,
  batchChangeModelRefStatus,
  listCategories
} from '../../../api/sysImages';

const ModelRefList = () => {
  const navigate = useNavigate();
  const actionRef = React.useRef();
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const res = await listCategories({ page: 1, page_size: 500 });
      setCategories(res.items || []);
    } catch (error) {
      console.error('获取类目失败', error);
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteModelRef(id);
      message.success('删除成功');
      actionRef.current?.reload();
    } catch (error) {
      message.error('删除失败');
    }
  };

  const handleStatusChange = async (id, status) => {
    try {
      await changeModelRefStatus(id, status);
      message.success('状态修改成功');
      actionRef.current?.reload();
    } catch (error) {
      message.error('状态修改失败');
    }
  };

  const genderLabels = {
    male: '男',
    female: '女'
  };

  const ageGroupLabels = {
    child: '儿童',
    youth: '青年',
    middle: '中年',
    senior: '老年'
  };

  const columns = [
    {
      title: 'ID',
      dataIndex: 'id',
      width: 80,
      search: false,
    },
    {
      title: '图片',
      dataIndex: 'image_url',
      width: 120,
      search: false,
      render: (url) => url ? (
        <Tooltip
          title={<Image src={url} width={300} preview={false} />}
          placement="right"
        >
          <Image
            src={url}
            width={60}
            height={60}
            style={{ objectFit: 'cover', borderRadius: 4, cursor: 'pointer' }}
            preview={false}
          />
        </Tooltip>
      ) : '-',
    },
    {
      title: '性别',
      dataIndex: 'gender',
      width: 80,
      valueType: 'select',
      valueEnum: {
        male: { text: '男' },
        female: { text: '女' },
      },
      render: (_, record) => <Tag>{genderLabels[record.gender] || record.gender}</Tag>,
    },
    {
      title: '年龄分段',
      dataIndex: 'age_group',
      width: 100,
      valueType: 'select',
      valueEnum: {
        child: { text: '儿童' },
        youth: { text: '青年' },
        middle: { text: '中年' },
        senior: { text: '老年' },
      },
      render: (_, record) => <Tag color="blue">{ageGroupLabels[record.age_group] || record.age_group}</Tag>,
    },
    {
      title: '服装类目',
      dataIndex: 'categories',
      width: 200,
      search: false,
      render: (categories) => (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          {categories?.map(cat => (
            <Tag key={cat.id} color="green">{cat.name}</Tag>
          ))}
        </div>
      ),
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
        <Tag color={record.status === 'enabled' ? 'success' : 'default'}>
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
          <Button type="link" size="small" onClick={() => navigate(`/admin/sys-images/model-refs/${record.id}/edit`)}>
            编辑
          </Button>
          <Button
            type="link"
            size="small"
            onClick={() => handleStatusChange(record.id, record.status === 'enabled' ? 'disabled' : 'enabled')}
          >
            {record.status === 'enabled' ? '禁用' : '启用'}
          </Button>
          <Popconfirm title="确认删除?" onConfirm={() => handleDelete(record.id)}>
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
        const res = await listModelRefs({
          page: params.current,
          page_size: params.pageSize,
          gender: params.gender,
          age_group: params.age_group,
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
      scroll={{ x: 1200 }}
      dateFormatter="string"
      headerTitle="模特参考图管理"
      toolBarRender={() => [
        <Button
          key="create"
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => navigate('/admin/sys-images/model-refs/new')}
        >
          新增
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
      tableAlertOptionRender={({ selectedRowKeys }) => [
        <a
          key="enable"
          onClick={async () => {
            try {
              await batchChangeModelRefStatus(selectedRowKeys, 'enabled');
              message.success('批量启用成功');
              actionRef.current?.reload();
            } catch (error) {
              message.error('批量启用失败');
            }
          }}
        >
          批量启用
        </a>,
        <a
          key="disable"
          onClick={async () => {
            try {
              await batchChangeModelRefStatus(selectedRowKeys, 'disabled');
              message.success('批量禁用成功');
              actionRef.current?.reload();
            } catch (error) {
              message.error('批量禁用失败');
            }
          }}
        >
          批量禁用
        </a>,
        <Popconfirm
          key="delete"
          title="确认批量删除?"
          onConfirm={async () => {
            try {
              await batchDeleteModelRefs(selectedRowKeys);
              message.success('批量删除成功');
              actionRef.current?.reload();
            } catch (error) {
              message.error('批量删除失败');
            }
          }}
        >
          <a style={{ color: 'red' }}>批量删除</a>
        </Popconfirm>,
      ]}
    />
  );
};

export default ModelRefList;
