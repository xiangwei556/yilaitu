import React, { useState, useEffect } from 'react';
import { Table, Button, Modal, Form, Input, InputNumber, Switch, message, Space, Select } from 'antd';
import request from '../../../utils/request';

const PackageConfig = () => {
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [form] = Form.useForm();
  const [editingId, setEditingId] = useState(null);

  const fetchPackages = async () => {
    setLoading(true);
    try {
      const res = await request.get('/membership/admin/packages');
      setPackages(res);
    } catch (error) {
      message.error('Failed to fetch packages');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPackages();
  }, []);

  const handleEdit = (record) => {
    setEditingId(record.id);
    form.setFieldsValue(record);
    setIsModalVisible(true);
  };

  const handleAdd = () => {
    setEditingId(null);
    form.resetFields();
    setIsModalVisible(true);
  };

  const handleDelete = async (id) => {
      // Implement delete logic (soft delete usually)
      message.info("Delete not implemented yet");
  }

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      if (editingId) {
        await request.put(`/membership/admin/packages/${editingId}`, values);
        message.success('套餐已更新');
      } else {
        await request.post('/membership/admin/packages', values);
        message.success('套餐已创建');
      }
      setIsModalVisible(false);
      fetchPackages();
    } catch (error) {
      message.error('操作失败');
    }
  };

  const columns = [
    { title: 'ID', dataIndex: 'id', key: 'id', width: 80 },
    { title: '套餐名称', dataIndex: 'name', key: 'name', width: 120 },
    { title: '类型', dataIndex: 'type', key: 'type', width: 100, render: (type) => {
      const typeMap = { 'ordinary': '普通会员', 'professional': '专业会员', 'enterprise': '企业会员' };
      return typeMap[type] || type;
    }},
    { title: '套餐说明', dataIndex: 'description', key: 'description', width: 200, ellipsis: true, tooltip: (text) => text },
    { title: '月度定价', dataIndex: 'price', key: 'price', width: 100 },
    { title: '原价', dataIndex: 'original_price', key: 'original_price', width: 100 },
    { title: '每月赠送积分', dataIndex: 'points', key: 'points', width: 120 },
    { title: '权益列表', dataIndex: 'rights', key: 'rights', width: 250, ellipsis: true, tooltip: (text) => text },
    { title: '状态', dataIndex: 'status', key: 'status', width: 80, render: (status) => {
      return status === 'enabled' ? '启动' : '禁止';
    }},
    {
      title: '操作',
      key: 'action',
      width: 100,
      render: (_, record) => (
        <Space size="middle">
          <a onClick={() => handleEdit(record)}>编辑</a>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <Button type="primary" onClick={handleAdd}>新增套餐</Button>
      </div>
      <Table columns={columns} dataSource={packages} rowKey="id" loading={loading} />
      
      <Modal title={editingId ? "编辑套餐" : "新增套餐"} open={isModalVisible} onOk={handleOk} onCancel={() => setIsModalVisible(false)} width={600}>
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="套餐名称" rules={[{ required: true }]}>
            <Input placeholder="请输入套餐名称" />
          </Form.Item>
          <Form.Item name="description" label="套餐说明">
            <Input.TextArea placeholder="请输入套餐说明" rows={2} />
          </Form.Item>
          <Form.Item name="price" label="月度定价" rules={[{ required: true }]}>
            <InputNumber style={{ width: '100%' }} precision={2} placeholder="请输入月度定价" />
          </Form.Item>
          <Form.Item name="original_price" label="原价">
            <InputNumber style={{ width: '100%' }} precision={2} placeholder="请输入原价" />
          </Form.Item>
          <Form.Item name="rights" label="权益列表">
            <Input.TextArea placeholder="请输入权益列表（最多500字）" rows={4} maxLength={500} showCount />
          </Form.Item>

          <Form.Item name="status" label="状态" rules={[{ required: true }]}>
            <Select placeholder="请选择状态">
              <Select.Option value="enabled">启动</Select.Option>
              <Select.Option value="disabled">禁止</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item name="type" label="类型" rules={[{ required: true }]}>
            <Select placeholder="请选择类型">
              <Select.Option value="ordinary">普通会员</Select.Option>
              <Select.Option value="professional">专业会员</Select.Option>
              <Select.Option value="enterprise">企业会员</Select.Option>
            </Select>
          </Form.Item>
          
          <Form.Item name="points" label="每月赠送积分" rules={[{ required: true, type: 'integer', min: 0 }]}>
            <InputNumber style={{ width: '100%' }} precision={0} placeholder="请输入每月赠送积分" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default PackageConfig;
