import React, { useState, useEffect } from 'react';
import { Table, Card, Button, Modal, Form, Input, message } from 'antd';
import request from '../../../utils/request';

const SystemConfig = () => {
  const [configs, setConfigs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [form] = Form.useForm();

  const fetchConfigs = async () => {
    setLoading(true);
    try {
      const res = await request.get('/config/admin/configs');
      setConfigs(res);
    } catch (error) {
      message.error('Failed to fetch configs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfigs();
  }, []);

  const handleAdd = () => {
    form.resetFields();
    setIsModalVisible(true);
  };

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      await request.post('/config/admin/configs', values);
      message.success('配置已创建');
      setIsModalVisible(false);
      fetchConfigs();
    } catch (error) {
      message.error('操作失败');
    }
  };

  const columns = [
    { title: '键', dataIndex: 'key', key: 'key' },
    { title: '值', dataIndex: 'value', key: 'value' },
    { title: '描述', dataIndex: 'description', key: 'description' },
  ];

  return (
    <Card title="系统配置">
       <div style={{ marginBottom: 16 }}>
        <Button type="primary" onClick={handleAdd}>新增配置</Button>
      </div>
      <Table columns={columns} dataSource={configs} rowKey="id" loading={loading} />
      <Modal title="新增系统配置" open={isModalVisible} onOk={handleOk} onCancel={() => setIsModalVisible(false)}>
        <Form form={form} layout="vertical">
          <Form.Item name="key" label="键" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="value" label="值">
            <Input.TextArea />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <Input />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
};

export default SystemConfig;
