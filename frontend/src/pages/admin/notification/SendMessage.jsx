import React, { useState } from 'react';
import { Card, Button, Radio, message } from 'antd';
import { ProForm, ProFormText, ProFormTextArea, ProFormSelect } from '@ant-design/pro-components';
import { sendMessage } from '../../../api/message';

const SendMessage = () => {
  const [form] = ProForm.useForm();
  const [loading, setLoading] = useState(false);

  const onFinish = async (values) => {
    setLoading(true);
    try {
      if (values.target === 'all') {
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
      <ProForm
        form={form}
        onFinish={onFinish}
        initialValues={{ target: 'specific', type: 'system' }}
        submitter={{
          render: (_, dom) => (
            <Button type="primary" htmlType="submit" loading={loading} block>
              发送消息
            </Button>
          ),
        }}
      >
        <ProFormSelect
          name="target"
          label="发送对象"
          options={[
            { label: '指定用户', value: 'specific' },
            { label: '全站用户 (暂未开放)', value: 'all', disabled: true },
          ]}
          rules={[{ required: true, message: '请选择发送对象' }]}
        />

        <ProFormText
          name="receiver_id"
          label="用户ID"
          placeholder="请输入接收消息的用户ID"
          rules={[{ required: true, message: '请输入用户ID' }]}
          dependencies={['target']}
          hidden={(values) => values.target !== 'specific'}
        />

        <ProFormSelect
          name="type"
          label="消息类型"
          options={[
            { label: '系统通知', value: 'system' },
            { label: '业务消息', value: 'business' },
            { label: '私信', value: 'private' },
          ]}
          rules={[{ required: true, message: '请选择消息类型' }]}
        />

        <ProFormText
          name="title"
          label="消息标题"
          placeholder="请输入消息标题"
          rules={[{ required: true, message: '请输入标题' }]}
        />

        <ProFormTextArea
          name="content"
          label="消息内容"
          placeholder="请输入消息内容"
          fieldProps={{ rows: 6, showCount: true, maxLength: 500 }}
          rules={[{ required: true, message: '请输入内容' }]}
        />
      </ProForm>
    </Card>
  );
};

export default SendMessage;
