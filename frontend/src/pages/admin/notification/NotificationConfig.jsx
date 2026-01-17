import React, { useState } from 'react';
import { ProTable, ModalForm, ProFormText, ProFormTextArea } from '@ant-design/pro-components';
import { Button, message } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import request from '../../../utils/request';

const NotificationConfig = () => {
  const actionRef = React.useRef();
  const [modalVisible, setModalVisible] = useState(false);

  const handleSubmit = async (values) => {
    try {
      await request.post('/notification/admin/templates', values);
      message.success('模板已创建');
      setModalVisible(false);
      actionRef.current?.reload();
      return true;
    } catch (error) {
      message.error('操作失败');
      return false;
    }
  };

  const columns = [
    { 
      title: '代码', 
      dataIndex: 'code',
    },
    { 
      title: '标题模板', 
      dataIndex: 'title_template',
    },
    { 
      title: '内容模板', 
      dataIndex: 'content_template',
      ellipsis: true,
    },
  ];

  return (
    <>
      <ProTable
        columns={columns}
        actionRef={actionRef}
        request={async () => {
          const res = await request.get('/notification/admin/templates');
          return {
            data: res || [],
            success: true,
            total: (res || []).length,
          };
        }}
        rowKey="id"
        search={false}
        pagination={false}
        dateFormatter="string"
        headerTitle="通知模板配置"
        toolBarRender={() => [
          <Button
            key="create"
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => {
              setModalVisible(true);
            }}
          >
            新增模板
          </Button>,
        ]}
      />

      <ModalForm
        title="新增通知模板"
        open={modalVisible}
        onOpenChange={setModalVisible}
        onFinish={handleSubmit}
        modalProps={{
          destroyOnClose: true,
        }}
      >
        <ProFormText
          name="code"
          label="模板代码"
          rules={[{ required: true, message: '请输入模板代码' }]}
        />
        <ProFormText
          name="title_template"
          label="标题模板"
          rules={[{ required: true, message: '请输入标题模板' }]}
        />
        <ProFormTextArea
          name="content_template"
          label="内容模板"
          rules={[{ required: true, message: '请输入内容模板' }]}
        />
      </ModalForm>
    </>
  );
};

export default NotificationConfig;
