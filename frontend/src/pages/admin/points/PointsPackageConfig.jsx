import React, { useState, useEffect } from 'react';
import { Table, Button, Modal, Form, Input, InputNumber, Switch, message, Space, Select } from 'antd';
import request from '../../../utils/request';

const PointsPackageConfig = () => {
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form] = Form.useForm();

  const fetchPackages = async () => {
    setLoading(true);
    try {
      const res = await request.get('/points/admin/packages');
      setPackages(res);
    } catch (error) {
      message.error('获取积分包失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPackages();
  }, []);

  const handleAdd = () => {
    form.resetFields();
    setEditingId(null);
    setIsModalVisible(true);
  };

  const handleEdit = (record) => {
    setEditingId(record.id);
    form.setFieldsValue(record);
    setIsModalVisible(true);
  };

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      if (editingId) {
        await request.put(`/points/admin/packages/${editingId}`, values);
        message.success('积分包已更新');
      } else {
        await request.post('/points/admin/packages', values);
        message.success('积分包已创建');
      }
      setIsModalVisible(false);
      setEditingId(null);
      fetchPackages();
    } catch (error) {
      // 显示后端返回的详细错误信息
      const errorMsg = error.response?.data?.detail || '操作失败';
      message.error(errorMsg);
    }
  };

  const columns = [
    { title: 'ID', dataIndex: 'id', key: 'id' },
    { title: '积分包名称', dataIndex: 'name', key: 'name' },
    { title: '积分数', dataIndex: 'points', key: 'points' },
    { title: '售价', dataIndex: 'price', key: 'price' },
    { title: '原价', dataIndex: 'original_price', key: 'original_price' },
    { title: '消耗说明', dataIndex: 'description', key: 'description' },
    { title: '有效期天数', dataIndex: 'validity_days', key: 'validity_days' },
    { 
      title: '类型', 
      dataIndex: 'package_type', 
      key: 'package_type',
      render: (type) => {
        const typeMap = {
          system: '系统积分包',
          festival: '节日赠积分',
          share: '分享活动奖励',
          invite: '邀请好友奖励'
        };
        return typeMap[type] || type;
      }
    },
    { 
      title: '启用', 
      dataIndex: 'is_active', 
      key: 'is_active',
      render: (active) => <Switch checked={active} disabled />
    },
    { 
      title: '操作', 
      key: 'action',
      render: (_, record) => (
        <Space size="middle">
          <Button type="primary" onClick={() => handleEdit(record)}>编辑</Button>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <Button type="primary" onClick={handleAdd}>新增积分包</Button>
      </div>
      <Table columns={columns} dataSource={packages} rowKey="id" loading={loading} />
      
      <Modal title={editingId ? "编辑积分包" : "新增积分包"} open={isModalVisible} onOk={handleOk} onCancel={() => setIsModalVisible(false)}>
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="名称" rules={[{ required: true }, { max: 50 }]}>
            <Input style={{ width: '100%' }} placeholder="请输入积分包名称" />
          </Form.Item>
          <Form.Item name="points" label="积分数" rules={[{ required: true }]}>
            <InputNumber style={{ width: '100%' }} precision={0} />
          </Form.Item>
          <Form.Item name="price" label="售价">
            <InputNumber style={{ width: '100%' }} precision={2} placeholder="可为空" />
          </Form.Item>
          <Form.Item name="original_price" label="原价">
            <InputNumber style={{ width: '100%' }} precision={2} placeholder="可为空" />
          </Form.Item>
          <Form.Item name="description" label="消耗说明" rules={[{ max: 100 }]}>
            <Input.TextArea style={{ width: '100%' }} rows={3} placeholder="请输入消耗说明" />
          </Form.Item>
          <Form.Item name="validity_days" label="有效期天数" initialValue={0}>
            <InputNumber style={{ width: '100%' }} precision={0} placeholder="0表示永久有效" />
          </Form.Item>
          <Form.Item name="package_type" label="积分包类型" initialValue="system">
            <Select style={{ width: '100%' }}>
              <Select.Option value="system">系统积分包</Select.Option>
              <Select.Option value="festival">节日赠积分</Select.Option>
              <Select.Option value="share">分享活动奖励</Select.Option>
              <Select.Option value="invite">邀请好友奖励</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item name="is_active" label="启用" valuePropName="checked" initialValue={true}>
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default PointsPackageConfig;
