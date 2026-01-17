import React, { useState } from 'react';
import { ProTable, ModalForm, ProFormText, ProFormTextArea, ProFormSelect, ProFormDigit, ProFormSwitch } from '@ant-design/pro-components';
import { Button, message, Switch } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import request from '../../../utils/request';

const RuleConfig = () => {
  const actionRef = React.useRef();
  const [modalVisible, setModalVisible] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const typeMap = {
    non_member: '非会员',
    ordinary: '普通会员',
    professional: '专业会员',
    enterprise: '企业会员',
  };

  const fetchDetail = async () => {
    const res = await request.get(`/points/admin/rules/${editingId}`);
    return res;
  };

  const handleSubmit = async (values) => {
    try {
      if (editingId) {
        await request.put(`/points/admin/rules/${editingId}`, values);
        message.success('规则已更新');
      } else {
        await request.post('/points/admin/rules', values);
        message.success('规则已创建');
      }
      setModalVisible(false);
      actionRef.current?.reload();
      return true;
    } catch (error) {
      const errorMsg = error.response?.data?.detail || '操作失败';
      message.error(errorMsg);
      return false;
    }
  };

  const columns = [
    {
      title: '代码',
      dataIndex: 'code',
      width: 150,
    },
    {
      title: '名称',
      dataIndex: 'name',
      width: 150,
    },
    {
      title: '类型',
      dataIndex: 'type',
      width: 120,
      valueType: 'select',
      valueEnum: {
        non_member: { text: '非会员' },
        ordinary: { text: '普通会员' },
        professional: { text: '专业会员' },
        enterprise: { text: '企业会员' },
      },
      render: (_, record) => typeMap[record.type] || record.type,
    },
    {
      title: '数量',
      dataIndex: 'amount',
      width: 100,
      search: false,
    },
    {
      title: '规则说明',
      dataIndex: 'description',
      width: 250,
      ellipsis: true,
      search: false,
    },
    {
      title: '启用',
      dataIndex: 'is_active',
      width: 100,
      valueType: 'select',
      valueEnum: {
        true: { text: '是', status: 'Success' },
        false: { text: '否', status: 'Default' },
      },
      render: (_, record) => <Switch checked={record.is_active} disabled />,
    },
    {
      title: '操作',
      key: 'action',
      width: 120,
      fixed: 'right',
      search: false,
      render: (_, record) => (
        <Button
          type="link"
          size="small"
          onClick={() => {
            setEditingId(record.id);
            setModalVisible(true);
          }}
        >
          编辑
        </Button>
      ),
    },
  ];

  return (
    <>
      <ProTable
        columns={columns}
        actionRef={actionRef}
        request={async () => {
          const res = await request.get('/points/admin/rules');
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
        headerTitle="积分规则"
        toolBarRender={() => [
          <Button
            key="create"
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => {
              setEditingId(null);
              setModalVisible(true);
            }}
          >
            新增规则
          </Button>,
        ]}
      />

      <ModalForm
        title={editingId ? '编辑积分规则' : '新增积分规则'}
        open={modalVisible}
        onOpenChange={setModalVisible}
        onFinish={handleSubmit}
        request={editingId ? fetchDetail : undefined}
        modalProps={{
          destroyOnClose: true,
        }}
        initialValues={{
          is_active: true,
        }}
      >
        <ProFormText
          name="code"
          label="规则代码"
          placeholder="请输入规则代码"
          rules={[{ required: true, message: '请输入规则代码' }]}
        />

        <ProFormText
          name="name"
          label="规则名称"
          placeholder="请输入规则名称"
          rules={[{ required: true, message: '请输入规则名称' }]}
        />

        <ProFormSelect
          name="type"
          label="类型"
          options={[
            { label: '非会员', value: 'non_member' },
            { label: '普通会员', value: 'ordinary' },
            { label: '专业会员', value: 'professional' },
            { label: '企业会员', value: 'enterprise' },
          ]}
          rules={[{ required: true, message: '请选择类型' }]}
        />

        <ProFormDigit
          name="amount"
          label="积分数量"
          placeholder="请输入积分数量"
          min={0}
          precision={0}
          rules={[{ required: true, message: '请输入积分数量' }]}
        />

        <ProFormTextArea
          name="description"
          label="规则说明"
          placeholder="请输入规则说明"
          fieldProps={{ rows: 3 }}
        />

        <ProFormSwitch
          name="is_active"
          label="启用"
        />
      </ModalForm>
    </>
  );
};

export default RuleConfig;
