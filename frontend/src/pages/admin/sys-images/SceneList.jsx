import React from 'react';
import { Button, Tag, Popconfirm, message, Image, Tooltip } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { ProTable } from '@ant-design/pro-components';
import {
  listScenes,
  deleteScene,
  batchDeleteScenes,
  changeSceneStatus,
  batchChangeSceneStatus
} from '../../../api/sysImages';

const SceneList = () => {
  const navigate = useNavigate();
  const actionRef = React.useRef();

  const columns = [
    {
      title: 'ID',
      dataIndex: 'id',
      width: 80,
      search: false,
    },
    {
      title: '场景图片',
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
      title: '场景名称',
      dataIndex: 'name',
    },
    {
      title: '风格',
      dataIndex: 'style',
      width: 120,
      valueType: 'select',
      valueEnum: {
        1: { text: '日常生活风', status: 'Default' },
        2: { text: '时尚杂志风', status: 'Processing' },
        3: { text: '运动活力风', status: 'Success' },
      },
      render: (_, record) => {
        const styleMap = {
          1: '日常生活风',
          2: '时尚杂志风',
          3: '运动活力风'
        };
        return styleMap[record.style] || '-';
      },
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
        <Button type="link" size="small" onClick={() => navigate(`/admin/sys-images/scenes/${record.id}/edit`)}>
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
        const res = await listScenes({
          page: params.current,
          page_size: params.pageSize,
          name: params.name,
          status: params.status,
          style: params.style,
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
      headerTitle="场景图管理"
      toolBarRender={() => [
        <Button
          key="create"
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => navigate('/admin/sys-images/scenes/new')}
        >
          新增场景图
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
              await batchChangeSceneStatus(selectedRowKeys, 'enabled');
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
              await batchChangeSceneStatus(selectedRowKeys, 'disabled');
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
              await batchDeleteScenes(selectedRowKeys);
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

export default SceneList;
