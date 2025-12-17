import React, { useState, useEffect } from 'react';
import { Table, Card, Button, Modal, Form, Input, message } from 'antd';
import request from '../../../utils/request';

const NotificationConfig = () => {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [form] = Form.useForm();

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const res = await request.get('/notification/admin/templates');
      setTemplates(res);
    } catch (error) {
      message.error('Failed to fetch templates');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const handleAdd = () => {
    form.resetFields();
    setIsModalVisible(true);
  };

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      await request.post('/notification/admin/templates', values);
      message.success('模板已创建');
      setIsModalVisible(false);
      fetchTemplates();
    } catch (error) {
      message.error('操作失败');
    }
  };

  const columns = [
    { title: '代码', dataIndex: 'code', key: 'code' },
    { title: '标题模板', dataIndex: 'title_template', key: 'title_template' },
    { title: '内容模板', dataIndex: 'content_template', key: 'content_template' },
  ];

  return (
    <Card title="通知模板配置">
       <div style={{ marginBottom: 16 }}>
        <Button type="primary" onClick={handleAdd}>新增模板</Button>
      </div>
      <Table columns={columns} dataSource={templates} rowKey="id" loading={loading} />
      <Modal title="新增通知模板" open={isModalVisible} onOk={handleOk} onCancel={() => setIsModalVisible(false)}>
        <Form form={form} layout="vertical">
          <Form.Item name="code" label="模板代码" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="title_template" label="标题模板" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="content_template" label="内容模板" rules={[{ required: true }]}>
            <Input.TextArea />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
};

export default NotificationConfig;
