import React, { useState } from 'react';
import { ProTable, ModalForm, ProFormText, ProFormTextArea, ProFormSelect, ProFormDigit, ProFormSwitch } from '@ant-design/pro-components';
import { Button, message, Switch } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import request from '../../../utils/request';

const PointsPackageConfig = () => {
  const actionRef = React.useRef();
  const [modalVisible, setModalVisible] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const fetchDetail = async () => {
    const res = await request.get(`/points/admin/packages/${editingId}`);
    return res;
  };

  const handleSubmit = async (values) => {
    try {
      if (editingId) {
        await request.put(`/points/admin/packages/${editingId}`, values);
        message.success('积分包已更新');
      } else {
        await request.post('/points/admin/packages', values);
        message.success('积分包已创建');
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
      title: 'ID',
      dataIndex: 'id',
      width: 80,
      search: false,
    },
    {
      title: '积分包名称',
      dataIndex: 'name',
      width: 150,
    },
    {
      title: '积分数',
      dataIndex: 'points',
      width: 100,
      search: false,
    },
    {
      title: '售价',
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
      title: '消耗说明',
      dataIndex: 'description',
      width: 200,
      ellipsis: true,
      search: false,
    },
    {
      title: '有效期天数',
      dataIndex: 'validity_days',
      width: 120,
      search: false,
    },
    {
      title: '类型',
      dataIndex: 'package_type',
      width: 150,
      valueType: 'select',
      valueEnum: {
        system: { text: '系统积分包' },
        festival: { text: '节日赠积分' },
        share: { text: '分享活动奖励' },
        invite: { text: '邀请好友奖励' },
      },
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
          const res = await request.get('/points/admin/packages');
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
        headerTitle="积分包配置"
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
            新增积分包
          </Button>,
        ]}
      />

      <ModalForm
        title={editingId ? '编辑积分包' : '新增积分包'}
        open={modalVisible}
        onOpenChange={setModalVisible}
        onFinish={handleSubmit}
        request={editingId ? fetchDetail : undefined}
        modalProps={{
          destroyOnClose: true,
        }}
        initialValues={{
          validity_days: 0,
          package_type: 'system',
          is_active: true,
        }}
      >
        <ProFormText
          name="name"
          label="名称"
          placeholder="请输入积分包名称"
          rules={[{ required: true, message: '请输入积分包名称' }, { max: 50, message: '最多50个字符' }]}
        />

        <ProFormDigit
          name="points"
          label="积分数"
          placeholder="请输入积分数"
          min={0}
          precision={0}
          rules={[{ required: true, message: '请输入积分数' }]}
        />

        <ProFormDigit
          name="price"
          label="售价"
          placeholder="可为空"
          min={0}
          precision={2}
        />

        <ProFormDigit
          name="original_price"
          label="原价"
          placeholder="可为空"
          min={0}
          precision={2}
        />

        <ProFormTextArea
          name="description"
          label="消耗说明"
          placeholder="请输入消耗说明"
          fieldProps={{ rows: 3, maxLength: 100, showCount: true }}
        />

        <ProFormDigit
          name="validity_days"
          label="有效期天数"
          placeholder="0表示永久有效"
          min={0}
          precision={0}
        />

        <ProFormSelect
          name="package_type"
          label="积分包类型"
          options={[
            { label: '系统积分包', value: 'system' },
            { label: '节日赠积分', value: 'festival' },
            { label: '分享活动奖励', value: 'share' },
            { label: '邀请好友奖励', value: 'invite' },
          ]}
          rules={[{ required: true, message: '请选择积分包类型' }]}
        />

        <ProFormSwitch
          name="is_active"
          label="启用"
        />
      </ModalForm>
    </>
  );
};

export default PointsPackageConfig;
