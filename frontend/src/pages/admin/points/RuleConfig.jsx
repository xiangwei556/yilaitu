import React, { useState, useEffect } from 'react';
import { Table, Button, Modal, Form, Input, Select, InputNumber, Switch, message, Space } from 'antd';
import request from '../../../utils/request';

const RuleConfig = () => {
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [form] = Form.useForm();
  const [editingId, setEditingId] = useState(null);
  
  // 类型映射，与会员管理模块保持一致
  const typeMap = {
    'non_member': '非会员',
    'ordinary': '普通会员',
    'professional': '专业会员',
    'enterprise': '企业会员'
  };

  const fetchRules = async () => {
    setLoading(true);
    try {
      const res = await request.get('/points/admin/rules');
      setRules(res);
    } catch (error) {
      message.error('获取规则失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRules();
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
      console.log('Form values:', values);
      let response;
      if (editingId) {
        console.log('Sending PUT request to /points/admin/rules/' + editingId);
        response = await request.put(`/points/admin/rules/${editingId}`, values);
        console.log('PUT response:', response);
        message.success('规则已更新');
      } else {
        console.log('Sending POST request to /points/admin/rules');
        response = await request.post('/points/admin/rules', values);
        console.log('POST response:', response);
        message.success('规则已创建');
      }
      setIsModalVisible(false);
      setEditingId(null);
      fetchRules();
    } catch (error) {
      // 显示后端返回的详细错误信息
      console.log('Error:', error);
      console.log('Error response:', error.response);
      const errorMsg = error.response?.data?.detail || '操作失败';
      message.error(errorMsg);
    }
  };

  const columns = [
    { title: '代码', dataIndex: 'code', key: 'code' },
    { title: '名称', dataIndex: 'name', key: 'name' },
    { 
      title: '类型', 
      dataIndex: 'type', 
      key: 'type',
      render: (type) => typeMap[type] || type
    },
    { title: '数量', dataIndex: 'amount', key: 'amount' },
    { 
      title: '规则说明', 
      dataIndex: 'description', 
      key: 'description',
      ellipsis: true,
      tooltip: (text) => text
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
        <Button type="primary" onClick={handleAdd}>新增规则</Button>
      </div>
      <Table columns={columns} dataSource={rules} rowKey="id" loading={loading} />
      
      <Modal title={editingId ? "编辑积分规则" : "新增积分规则"} open={isModalVisible} onOk={handleOk} onCancel={() => setIsModalVisible(false)}>
        <Form form={form} layout="vertical">
          <Form.Item name="code" label="规则代码" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="name" label="规则名称" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="type" label="类型" rules={[{ required: true }]}>
            <Select>
                <Select.Option value="non_member">非会员</Select.Option>
                <Select.Option value="ordinary">普通会员</Select.Option>
                <Select.Option value="professional">专业会员</Select.Option>
                <Select.Option value="enterprise">企业会员</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item name="amount" label="积分数量" rules={[{ required: true }]}>
            <InputNumber style={{ width: '100%' }} precision={0} />
          </Form.Item>
          <Form.Item name="description" label="规则说明">
            <Input.TextArea rows={3} placeholder="请输入规则说明" />
          </Form.Item>
          <Form.Item name="is_active" label="启用" valuePropName="checked" initialValue={true}>
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default RuleConfig;
