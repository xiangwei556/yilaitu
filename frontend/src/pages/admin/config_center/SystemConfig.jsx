import React, { useRef } from 'react';
import { Button, message } from 'antd';
import { ProTable, ModalForm, ProFormText, ProFormTextArea } from '@ant-design/pro-components';
import request from '../../../utils/request';

const SystemConfig = () => {
  const actionRef = useRef();

  const columns = [
    { title: '键', dataIndex: 'key', key: 'key' },
    { title: '值', dataIndex: 'value', key: 'value' },
    { title: '描述', dataIndex: 'description', key: 'description' },
  ];

  return (
    <ProTable
      columns={columns}
      actionRef={actionRef}
      request={async () => {
        const res = await request.get('/config/admin/configs');
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
      headerTitle="系统配置"
      toolBarRender={() => [
        <ModalForm
          key="create"
          title="新增系统配置"
          trigger={
            <Button type="primary">
              新增配置
            </Button>
          }
          onFinish={async (values) => {
            await request.post('/config/admin/configs', values);
            message.success('配置已创建');
            actionRef.current?.reload();
            return true;
          }}
          modalProps={{
            destroyOnClose: true,
          }}
        >
          <ProFormText
            name="key"
            label="键"
            rules={[{ required: true, message: '请输入键' }]}
          />
          <ProFormTextArea
            name="value"
            label="值"
          />
          <ProFormText
            name="description"
            label="描述"
          />
        </ModalForm>,
      ]}
    />
  );
};

export default SystemConfig;
