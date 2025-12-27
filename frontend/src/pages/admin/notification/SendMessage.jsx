import React, { useState } from 'react';
import { Card, Form, Input, Button, Select, Radio, message } from 'antd';
import { sendMessage } from '../../../api/message';

const { Option } = Select;

const SendMessage = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  const onFinish = async (values) => {
    setLoading(true);
    try {
      // If sending to all users, we might need a different API or logic
      // But for now, we assume receiver_id is provided or handle it in backend
      // The current API requires receiver_id
      
      if (values.target === 'all') {
        // TODO: Implement broadcast API
        message.warning('群发功能暂未开放，请指定用户ID');
        setLoading(false);
        return;
      }

      await sendMessage({
        title: values.title,
        content: values.content,
        receiver_id: parseInt(values.receiver_id),
        type: values.type || 'system'
      });
      
      message.success('消息发送成功');
      form.resetFields();
    } catch (error) {
      console.error(error);
      message.error('发送失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card title="发送消息" bordered={false}>
      <Form
        form={form}
        layout="vertical"
        onFinish={onFinish}
        initialValues={{ target: 'specific', type: 'system' }}
        style={{ maxWidth: 600 }}
      >
        <Form.Item name="target" label="发送对象">
          <Radio.Group>
            <Radio value="specific">指定用户</Radio>
            <Radio value="all" disabled>全站用户 (暂未开放)</Radio>
          </Radio.Group>
        </Form.Item>

        <Form.Item 
          noStyle 
          shouldUpdate={(prev, current) => prev.target !== current.target}
        >
          {({ getFieldValue }) => 
            getFieldValue('target') === 'specific' && (
              <Form.Item 
                name="receiver_id" 
                label="用户ID" 
                rules={[{ required: true, message: '请输入用户ID' }]}
              >
                <Input placeholder="请输入接收消息的用户ID" />
              </Form.Item>
            )
          }
        </Form.Item>

        <Form.Item name="type" label="消息类型" rules={[{ required: true }]}>
          <Select>
            <Option value="system">系统通知</Option>
            <Option value="business">业务消息</Option>
            <Option value="private">私信</Option>
          </Select>
        </Form.Item>

        <Form.Item name="title" label="消息标题" rules={[{ required: true, message: '请输入标题' }]}>
          <Input placeholder="请输入消息标题" />
        </Form.Item>

        <Form.Item name="content" label="消息内容" rules={[{ required: true, message: '请输入内容' }]}>
          <Input.TextArea rows={6} placeholder="请输入消息内容" showCount maxLength={500} />
        </Form.Item>

        <Form.Item>
          <Button type="primary" htmlType="submit" loading={loading} block>
            发送消息
          </Button>
        </Form.Item>
      </Form>
    </Card>
  );
};

export default SendMessage;
