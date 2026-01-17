import React, { useRef } from 'react';
import { Button, Space, Tag, Popconfirm, message, Image, Tooltip } from 'antd';
import { PlusOutlined, ReloadOutlined } from '@ant-design/icons';
import {
  listModels,
  deleteModel,
  batchDeleteModels,
  changeModelStatus,
  batchChangeModelStatus,
  createModel,
  uploadModelImage
} from '../../../api/yilaitumodel';
import { useNavigate } from 'react-router-dom';
import { ProTable } from '@ant-design/pro-components';

const filters = {
  genders: [
    { label: '男', value: 'male' }, { label: '女', value: 'female' }
  ],
  age_groups: [
    { label: '儿童', value: 'child' }, { label: '青年', value: 'youth' }, { label: '中年', value: 'middle' }, { label: '老年', value: 'senior' }
  ],
  body_types: [
    { label: '标准', value: 'standard' }, { label: '微胖', value: 'chubby' }, { label: '偏瘦', value: 'thin' }
  ],
  styles: [
    { label: '欧美', value: 'euro' }, { label: '韩系', value: 'korean' }, { label: '日系', value: 'japanese' }
  ],
  status: [
    { label: '启用', value: 'enabled' }, { label: '禁用', value: 'disabled' }
  ]
};

const ModelList = () => {
  const actionRef = useRef();
  const [selectedRowKeys, setSelectedRowKeys] = React.useState([]);
  const navigate = useNavigate();

  const columns = [
    { 
      title: '模特ID', 
      dataIndex: 'id', 
      width: 90,
      fixed: 'left',
      ellipsis: true,
      render: (text) => <span style={{ fontWeight: '500', color: '#262626' }}>{text}</span>
    },
    {
      title: '模特图片',
      dataIndex: 'images',
      render: (images) => {
        if (!images || images.length === 0) {
          return <Tag color="default" style={{ borderRadius: 4, padding: '2px 8px' }}>未上传</Tag>;
        }
        return (
          <Tooltip
            title={<Image src={images[0].file_path} alt="模特图片" style={{ width: 250, maxHeight: 250, objectFit: 'contain', borderRadius: 4 }} />}
            placement="top"
            arrowPointAtCenter
          >
            <img 
              src={images[0].file_path} 
              alt="模特图片" 
              style={{ 
                width: 70, 
                height: 70, 
                objectFit: 'cover', 
                borderRadius: 4, 
                cursor: 'pointer',
                border: '2px solid #e8e8e8',
                transition: 'all 0.3s ease',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
              }} 
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'scale(1.1)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.1)';
              }}
            />
          </Tooltip>
        );
      },
      width: 100,
      fixed: 'left'
    },
    {
      title: '性别', 
      dataIndex: 'gender', 
      render: v => (
        <span style={{ 
          padding: '4px 12px', 
          borderRadius: 16, 
          backgroundColor: v === 'male' ? '#e6f7ff' : '#fff2f0',
          color: v === 'male' ? '#1890ff' : '#ff4d4f',
          fontSize: '13px',
          fontWeight: '500'
        }}>
          {v === 'male' ? '男' : '女'}
        </span>
      ), 
      width: 100
    },
    {
      title: '年龄分段', 
      dataIndex: 'age_group', 
      render: v => (
        <span style={{ 
          padding: '4px 12px', 
          borderRadius: 16, 
          backgroundColor: '#f6ffed',
          color: '#52c41a',
          fontSize: '13px',
          fontWeight: '500'
        }}>
          {{child:'儿童',youth:'青年',middle:'中年',senior:'老年'}[v] || v}
        </span>
      ),
      width: 120
    },
    {
      title: '体型', 
      dataIndex: 'body_type', 
      render: v => (
        <span style={{ 
          padding: '4px 12px', 
          borderRadius: 16, 
          backgroundColor: '#fff7e6',
          color: '#fa8c16',
          fontSize: '13px',
          fontWeight: '500'
        }}>
          {{standard:'标准',chubby:'微胖',thin:'偏瘦'}[v] || v}
        </span>
      ), 
      width: 120
    },
    {
      title: '风格', 
      dataIndex: 'style', 
      render: v => (
        <span style={{ 
          padding: '4px 12px', 
          borderRadius: 16, 
          backgroundColor: '#f9f0ff',
          color: '#722ed1',
          fontSize: '13px',
          fontWeight: '500'
        }}>
          {{euro:'欧美',korean:'韩系',japanese:'日系'}[v] || v}
        </span>
      ), 
      width: 120
    },
    { title: '状态', 
      dataIndex: 'status', 
      render: v => v === 'enabled' ? (
        <Tag color="success" style={{ borderRadius: 16, padding: '4px 16px', fontSize: '13px', fontWeight: '500' }}>启用</Tag>
      ) : (
        <Tag color="error" style={{ borderRadius: 16, padding: '4px 16px', fontSize: '13px', fontWeight: '500' }}>禁用</Tag>
      ), 
      width: 120
    },
    { 
      title: '创建时间', 
      dataIndex: 'created_at',
      ellipsis: true,
      render: (text) => <span style={{ color: '#8c8c8c', fontSize: '13px' }}>{text}</span>
    },
    {
      title: '操作',
      width: 220,
      fixed: 'right',
      render: (_, record) => (
        <Space size="middle">
          <Button 
            type="link" 
            onClick={() => navigate(`/admin/yilaitumodel/models/${record.id}/edit`)} 
            style={{ color: '#1890ff', fontWeight: '500' }}
          >
            编辑
          </Button>
          {record.status === 'enabled' ? (
            <Button 
              type="link" 
              onClick={async () => { await changeModelStatus(record.id, 'disabled'); message.success('已禁用'); actionRef.current?.reload(); }} 
              style={{ color: '#faad14', fontWeight: '500' }}
            >
              禁用
            </Button>
          ) : (
            <Button 
              type="link" 
              onClick={async () => { await changeModelStatus(record.id, 'enabled'); message.success('已启用'); actionRef.current?.reload(); }} 
              style={{ color: '#52c41a', fontWeight: '500' }}
            >
              启用
            </Button>
          )}
          <Popconfirm 
            title="确定删除该模特？删除后不可恢复" 
            onConfirm={async () => { await deleteModel(record.id); message.success('已删除'); actionRef.current?.reload(); }}
            placement="topRight"
          >
            <Button type="link" danger style={{ fontWeight: '500' }}>删除</Button>
          </Popconfirm>
        </Space>
      )
    }
  ];

  const rowSelection = {
    selectedRowKeys,
    onChange: setSelectedRowKeys,
  };

  const onBatchDelete = async () => {
    if (selectedRowKeys.length === 0) return;
    await batchDeleteModels(selectedRowKeys);
    message.success(`已删除 ${selectedRowKeys.length} 个模特`);
    setSelectedRowKeys([]);
    actionRef.current?.reload();
  };

  const onBatchDisable = async () => {
    if (selectedRowKeys.length === 0) return;
    await batchChangeModelStatus(selectedRowKeys, 'disabled');
    message.success(`已禁用 ${selectedRowKeys.length} 个模特`);
    setSelectedRowKeys([]);
    actionRef.current?.reload();
  };

  const onBatchEnable = async () => {
    if (selectedRowKeys.length === 0) return;
    await batchChangeModelStatus(selectedRowKeys, 'enabled');
    message.success(`已启用 ${selectedRowKeys.length} 个模特`);
    setSelectedRowKeys([]);
    actionRef.current?.reload();
  };

  const onCreate = async (values) => {
    const res = await createModel(values);
    message.success('新增成功');
    actionRef.current?.reload();
    return res;
  };

  return (
    <ProTable
      columns={columns}
      actionRef={actionRef}
      request={async (params) => {
        const res = await listModels({
          page: params.current,
          page_size: params.pageSize,
          gender: params.gender,
          age_group: params.age_group,
          body_type: params.body_type,
          style: params.style,
          status: params.status,
        });
        return {
          data: res.items || [],
          success: true,
          total: res.total || 0,
        };
      }}
      rowKey="id"
      rowSelection={rowSelection}
      search={{
        filterType: 'light',
      }}
      form={{
        syncToUrl: (values, type) => {
          if (type === 'get') {
            return {
              ...values,
              current: 1,
            };
          }
          return values;
        },
      }}
      pagination={{
        showSizeChanger: true,
        showTotal: (total) => `共 ${total} 条记录`,
      }}
      dateFormatter="string"
      headerTitle="模特人像管理"
      toolBarRender={() => [
        <Button
          key="create"
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => navigate('/admin/yilaitumodel/models/new')}
        >
          新增模特
        </Button>,
        <Button
          key="batchEnable"
          onClick={onBatchEnable}
          disabled={selectedRowKeys.length === 0}
        >
          批量启用
        </Button>,
        <Button
          key="batchDisable"
          onClick={onBatchDisable}
          disabled={selectedRowKeys.length === 0}
        >
          批量禁用
        </Button>,
        <Popconfirm
          key="batchDelete"
          title="确定批量删除所选模特？删除后不可恢复"
          onConfirm={onBatchDelete}
        >
          <Button
            danger
            disabled={selectedRowKeys.length === 0}
          >
            批量删除
          </Button>
        </Popconfirm>,
        <Button
          key="refresh"
          icon={<ReloadOutlined />}
          onClick={() => actionRef.current?.reload()}
        >
          刷新数据
        </Button>,
      ]}
      columnsState={{
        persistenceKey: 'model-list-columns',
        persistenceType: 'localStorage',
      }}
    />
  );
};

export default ModelList;

