import React, { useEffect, useState } from 'react';
import { Table, Button, Space, Tag, Popconfirm, message, Form, Select, Input, Upload, Image, Tooltip, Card } from 'antd';
import { PlusOutlined, UploadOutlined, FilterOutlined, ReloadOutlined } from '@ant-design/icons';
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
  const [form] = Form.useForm();
  const [data, setData] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = { page, page_size: pageSize, ...form.getFieldsValue() };
      const res = await listModels(params);
      setData(res.items);
      setTotal(res.total);
    } catch (e) {
      message.error('加载失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [page, pageSize]);

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
              onClick={async () => { await changeModelStatus(record.id, 'disabled'); message.success('已禁用'); fetchData(); }} 
              style={{ color: '#faad14', fontWeight: '500' }}
            >
              禁用
            </Button>
          ) : (
            <Button 
              type="link" 
              onClick={async () => { await changeModelStatus(record.id, 'enabled'); message.success('已启用'); fetchData(); }} 
              style={{ color: '#52c41a', fontWeight: '500' }}
            >
              启用
            </Button>
          )}
          <Popconfirm 
            title="确定删除该模特？删除后不可恢复" 
            onConfirm={async () => { await deleteModel(record.id); message.success('已删除'); fetchData(); }}
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
    fetchData();
  };

  const onBatchDisable = async () => {
    if (selectedRowKeys.length === 0) return;
    await batchChangeModelStatus(selectedRowKeys, 'disabled');
    message.success(`已禁用 ${selectedRowKeys.length} 个模特`);
    setSelectedRowKeys([]);
    fetchData();
  };

  const onBatchEnable = async () => {
    if (selectedRowKeys.length === 0) return;
    await batchChangeModelStatus(selectedRowKeys, 'enabled');
    message.success(`已启用 ${selectedRowKeys.length} 个模特`);
    setSelectedRowKeys([]);
    fetchData();
  };

  const onCreate = async (values) => {
    const res = await createModel(values);
    message.success('新增成功');
    fetchData();
    return res;
  };

  return (
    <div style={{ padding: '0px 0px', minHeight: '100vh', backgroundColor: '#f5f5f5' }}>

        {/* 批量操作区域 */}
        <div style={{ 
          marginBottom: 4, 
          padding: '2px 0', 
          backgroundColor: 'transparent', 
          borderRadius: 0,
          border: 'none',
          transition: 'all 0.3s ease'
        }}>
          <Space wrap size="middle">
            <Button 
              type="primary" 
              icon={<PlusOutlined />} 
              onClick={() => navigate('/admin/yilaitumodel/models/new')} 
              size="large"
              style={{ boxShadow: '0 2px 8px rgba(24, 144, 255, 0.2)', transition: 'all 0.3s ease' }}
              onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 4px 12px rgba(24, 144, 255, 0.3)'}
              onMouseLeave={(e) => e.currentTarget.style.boxShadow = '0 2px 8px rgba(24, 144, 255, 0.2)'}
            >
              新增模特
            </Button>
            <Button 
              onClick={onBatchEnable} 
              size="large" 
              disabled={selectedRowKeys.length === 0}
              style={{ transition: 'all 0.3s ease' }}
            >
              批量启用
            </Button>
            <Button 
              onClick={onBatchDisable} 
              size="large" 
              disabled={selectedRowKeys.length === 0}
              style={{ transition: 'all 0.3s ease' }}
            >
              批量禁用
            </Button>
            <Popconfirm title="确定批量删除所选模特？删除后不可恢复" onConfirm={onBatchDelete}>
              <Button 
                danger 
                size="large" 
                disabled={selectedRowKeys.length === 0}
                style={{ transition: 'all 0.3s ease' }}
              >
                批量删除
              </Button>
            </Popconfirm>
            <Button 
              onClick={() => { form.resetFields(); setPage(1); fetchData(); }} 
              icon={<ReloadOutlined />} 
              size="large"
              style={{ transition: 'all 0.3s ease' }}
            >
              刷新数据
            </Button>
            {selectedRowKeys.length > 0 && (
              <span style={{ 
                color: '#1890ff', 
                fontWeight: '500',
                fontSize: '14px',
                padding: '8px 12px',
                backgroundColor: '#e6f7ff',
                borderRadius: 4
              }}>
                已选择 {selectedRowKeys.length} 个模特
              </span>
            )}
          </Space>
        </div>

        {/* 筛选表单区域 */}
        <Card type="inner" title={<span><FilterOutlined /> 筛选条件</span>} size="small" style={{ marginBottom: 16, transition: 'all 0.3s ease', border: 'none', boxShadow: 'none' }}>
          <Form form={form} layout="inline" onFinish={() => { setPage(1); fetchData(); }} style={{ display: 'flex', alignItems: 'flex-end', flexWrap: 'wrap', gap: '16px' }}>
            <Form.Item name="gender" label="性别" style={{ marginBottom: 16 }}>
              <Select allowClear style={{ width: 120, transition: 'all 0.3s ease' }} options={filters.genders} />
            </Form.Item>
            <Form.Item name="age_group" label="年龄" style={{ marginBottom: 16 }}>
              <Select allowClear style={{ width: 140, transition: 'all 0.3s ease' }} options={filters.age_groups} />
            </Form.Item>
            <Form.Item name="body_type" label="体型" style={{ marginBottom: 16 }}>
              <Select allowClear style={{ width: 120, transition: 'all 0.3s ease' }} options={filters.body_types} />
            </Form.Item>
            <Form.Item name="style" label="风格" style={{ marginBottom: 16 }}>
              <Select allowClear style={{ width: 140, transition: 'all 0.3s ease' }} options={filters.styles} />
            </Form.Item>
            <Form.Item name="status" label="状态" style={{ marginBottom: 16 }}>
              <Select allowClear style={{ width: 120, transition: 'all 0.3s ease' }} options={filters.status} />
            </Form.Item>
            <Form.Item style={{ marginBottom: 16, marginLeft: 'auto' }}>
              <Space size="middle">
                <Button 
                  type="primary" 
                  htmlType="submit" 
                  size="middle"
                  style={{ transition: 'all 0.3s ease', boxShadow: '0 2px 8px rgba(24, 144, 255, 0.2)' }}
                  onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 4px 12px rgba(24, 144, 255, 0.3)'}
                  onMouseLeave={(e) => e.currentTarget.style.boxShadow = '0 2px 8px rgba(24, 144, 255, 0.2)'}
                >
                  筛选
                </Button>
                <Button 
                  onClick={() => { form.resetFields(); setPage(1); fetchData(); }} 
                  size="middle"
                  style={{ transition: 'all 0.3s ease' }}
                >
                  重置
                </Button>
              </Space>
            </Form.Item>
          </Form>
  

        {/* 表格区域 */}
        <div style={{ marginBottom: 16 }}>
          <Table
            rowKey="id"
            columns={columns}
            dataSource={data}
            loading={loading}
            rowSelection={rowSelection}
            pagination={{
              current: page,
              pageSize,
              total,
              onChange: setPage,
              onShowSizeChange: (_, size) => setPageSize(size),
              showTotal: (total) => `共 ${total} 条记录`,
              size: 'middle'
            }}
            style={{ 
              width: '100%'
            }}
            bordered={false}
            rowClassName={(record, index) => index % 2 === 0 ? 'even-row' : 'odd-row'}
            rowStyle={{
              transition: 'all 0.3s ease',
              cursor: 'pointer'
            }}
            onRow={(record) => ({
              onMouseEnter: (e) => {
                e.currentTarget.style.backgroundColor = '#f5f7fa';
              },
              onMouseLeave: (e) => {
                e.currentTarget.style.backgroundColor = '';
              }
            })}
          />
        </div>
      </Card>
    </div>
  );
};

export default ModelList;

