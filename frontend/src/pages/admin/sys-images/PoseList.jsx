import React from 'react';
import { Button, Tag, Popconfirm, message, Image, Tooltip } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { ProTable } from '@ant-design/pro-components';
import {
  listPoses,
  deletePose,
  batchDeletePoses,
  changePoseStatus,
  batchChangePoseStatus
} from '../../../api/sysImages';

const PoseList = () => {
  const navigate = useNavigate();
  const actionRef = React.useRef();
  const genderLabels = {
    male: '男',
    female: '女',
    all: '通用'
  };

  const columns = [
    {
      title: 'ID',
      dataIndex: 'id',
      width: 80,
      search: false,
    },
    {
      title: '性别',
      dataIndex: 'gender',
      width: 100,
      valueType: 'select',
      valueEnum: {
        male: { text: '男' },
        female: { text: '女' },
        all: { text: '通用' },
      },
      render: (_, record) => <Tag>{genderLabels[record.gender] || record.gender}</Tag>,
    },
    {
      title: '姿势图片',
      dataIndex: 'image_url',
      width: 120,
      search: false,
      render: (url) => url ? (
        <Tooltip
          title={<Image src={url} width={300} preview={false} />}
          placement="right"
        >
          <Image
            src={url}
            width={60}
            height={60}
            style={{ objectFit: 'cover', borderRadius: 4, cursor: 'pointer' }}
            preview={false}
          />
        </Tooltip>
      ) : '-',
    },
    {
      title: '骨架图',
      dataIndex: 'skeleton_url',
      width: 120,
      search: false,
      render: (url) => url ? (
        <Tooltip
          title={<Image src={url} width={300} preview={false} />}
          placement="right"
        >
          <Image
            src={url}
            width={60}
            height={60}
            style={{ objectFit: 'cover', borderRadius: 4, cursor: 'pointer' }}
            preview={false}
          />
        </Tooltip>
      ) : '-',
    },
    {
      title: '姿势名称',
      dataIndex: 'name',
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
      title: '创建时间',
      dataIndex: 'created_at',
      width: 180,
      valueType: 'dateTime',
      search: false,
    },
    {
      title: '操作',
      key: 'action',
      width: 200,
      search: false,
      render: (_, record) => (
        <Button type="link" size="small" onClick={() => navigate(`/admin/sys-images/poses/${record.id}/edit`)}>
          编辑
        </Button>
      ),
    },
  ];

  return (
    <ProTable
      columns={columns}
      actionRef={actionRef}
      request={async (params, sort, filter) => {
        const res = await listPoses({
          page: params.current,
          page_size: params.pageSize,
          name: params.name,
          gender: params.gender,
          status: params.status,
        });
        return {
          data: res.items || [],
          success: true,
          total: res.total || 0,
        };
      }}
      rowKey="id"
      search={{
        labelWidth: 'auto',
      }}
      pagination={{
        defaultPageSize: 10,
        showSizeChanger: true,
        showQuickJumper: true,
      }}
      dateFormatter="string"
      headerTitle="姿势图管理"
      toolBarRender={() => [
        <Button
          key="create"
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => navigate('/admin/sys-images/poses/new')}
        >
          新增姿势图
        </Button>,
      ]}
      tableAlertRender={({ selectedRowKeys, onCleanSelected }) => (
        <span>
          已选择 <a style={{ fontWeight: 600 }}>{selectedRowKeys.length}</a> 项
          <a style={{ marginLeft: 8 }} onClick={onCleanSelected}>
            取消选择
          </a>
        </span>
      )}
      tableAlertOptionRender={({ selectedRowKeys }) => [
        <a
          key="enable"
          onClick={async () => {
            try {
              await batchChangePoseStatus(selectedRowKeys, 'enabled');
              message.success('批量启用成功');
              actionRef.current?.reload();
            } catch (error) {
              message.error('批量启用失败');
            }
          }}
        >
          批量启用
        </a>,
        <a
          key="disable"
          onClick={async () => {
            try {
              await batchChangePoseStatus(selectedRowKeys, 'disabled');
              message.success('批量禁用成功');
              actionRef.current?.reload();
            } catch (error) {
              message.error('批量禁用失败');
            }
          }}
        >
          批量禁用
        </a>,
        <Popconfirm
          key="delete"
          title="确认批量删除?"
          onConfirm={async () => {
            try {
              await batchDeletePoses(selectedRowKeys);
              message.success('批量删除成功');
              actionRef.current?.reload();
            } catch (error) {
              message.error('批量删除失败');
            }
          }}
        >
          <a style={{ color: 'red' }}>批量删除</a>
        </Popconfirm>,
      ]}
    />
  );
};

export default PoseList;
