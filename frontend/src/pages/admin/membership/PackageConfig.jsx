import React, { useState } from 'react';
import { ProTable, ModalForm, ProFormText, ProFormTextArea, ProFormSelect, ProFormDigit } from '@ant-design/pro-components';
import { Button, message, Tag } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import request from '../../../utils/request';

const PackageConfig = () => {
  const actionRef = React.useRef();
  const [modalVisible, setModalVisible] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const fetchDetail = async () => {
    const res = await request.get(`/membership/admin/packages/${editingId}`);
    return res;
  };

  const handleSubmit = async (values) => {
    try {
      if (editingId) {
        await request.put(`/membership/admin/packages/${editingId}`, values);
        message.success('套餐已更新');
      } else {
        await request.post('/membership/admin/packages', values);
        message.success('套餐已创建');
      }
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
      title: 'ID',
      dataIndex: 'id',
      width: 80,
      search: false,
    },
    {
      title: '套餐名称',
      dataIndex: 'name',
      width: 120,
    },
    {
      title: '类型',
      dataIndex: 'type',
      width: 120,
      valueType: 'select',
      valueEnum: {
        ordinary: { text: '普通会员' },
        professional: { text: '专业会员' },
        enterprise: { text: '企业会员' },
      },
    },
    {
      title: '套餐说明',
      dataIndex: 'description',
      width: 200,
      ellipsis: true,
      search: false,
    },
    {
      title: '月度定价',
      dataIndex: 'price',
      width: 100,
      search: false,
    },
    {
      title: '原价',
      dataIndex: 'original_price',
      width: 100,
      search: false,
    },
    {
      title: '每月赠送积分',
      dataIndex: 'points',
      width: 120,
      search: false,
    },
    {
      title: '有效期(天)',
      dataIndex: 'duration_days',
      width: 100,
      search: false,
    },
    {
      title: '权益列表',
      dataIndex: 'rights',
      width: 250,
      ellipsis: true,
      search: false,
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 100,
      valueType: 'select',
      valueEnum: {
        enabled: { text: '启用', status: 'Success' },
        disabled: { text: '禁用', status: 'Default' },
      },
      render: (_, record) => (
        <Tag color={record.status === 'enabled' ? 'green' : 'red'}>
          {record.status === 'enabled' ? '启用' : '禁用'}
        </Tag>
      ),
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
          const res = await request.get('/membership/admin/packages');
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
        headerTitle="套餐配置"
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
            新增套餐
          </Button>,
        ]}
      />

      <ModalForm
        title={editingId ? '编辑套餐' : '新增套餐'}
        open={modalVisible}
        onOpenChange={setModalVisible}
        onFinish={handleSubmit}
        request={editingId ? fetchDetail : undefined}
        modalProps={{
          destroyOnClose: true,
          width: 600,
        }}
        initialValues={{
          status: 'enabled',
          type: 'ordinary',
          duration_days: 30,
        }}
      >
        <ProFormText
          name="name"
          label="套餐名称"
          placeholder="请输入套餐名称"
          rules={[{ required: true, message: '请输入套餐名称' }]}
        />

        <ProFormTextArea
          name="description"
          label="套餐说明"
          placeholder="请输入套餐说明"
          fieldProps={{ rows: 2 }}
        />

        <ProFormDigit
          name="price"
          label="月度定价"
          placeholder="请输入月度定价"
          min={0}
          precision={2}
          rules={[{ required: true, message: '请输入月度定价' }]}
        />

        <ProFormDigit
          name="original_price"
          label="原价"
          placeholder="请输入原价"
          min={0}
          precision={2}
        />

        <ProFormDigit
          name="points"
          label="每月赠送积分"
          placeholder="请输入每月赠送积分"
          min={0}
          precision={0}
          rules={[{ required: true, message: '请输入每月赠送积分' }]}
        />

        <ProFormDigit
          name="duration_days"
          label="有效期(天)"
          placeholder="请输入套餐有效期天数"
          min={1}
          precision={0}
          rules={[{ required: true, message: '请输入有效期天数' }]}
        />

        <ProFormTextArea
          name="rights"
          label="权益列表"
          placeholder="请输入权益列表（最多500字）"
          fieldProps={{ rows: 4, maxLength: 500, showCount: true }}
        />

        <ProFormSelect
          name="status"
          label="状态"
          options={[
            { label: '启用', value: 'enabled' },
            { label: '禁用', value: 'disabled' },
          ]}
          rules={[{ required: true, message: '请选择状态' }]}
        />

        <ProFormSelect
          name="type"
          label="类型"
          options={[
            { label: '普通会员', value: 'ordinary' },
            { label: '专业会员', value: 'professional' },
            { label: '企业会员', value: 'enterprise' },
          ]}
          rules={[{ required: true, message: '请选择类型' }]}
        />
      </ModalForm>
    </>
  );
};

export default PackageConfig;
