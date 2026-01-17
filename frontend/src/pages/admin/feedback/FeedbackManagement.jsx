import React, { useState, useRef } from 'react';
import { ProTable, ModalForm, ProFormSelect, ProFormTextArea, ProFormDigit } from '@ant-design/pro-components';
import { Button, Modal, message, Space, Tag, Descriptions, Image } from 'antd';
import request from '../../../utils/request';
import ImagePreviewOverlay from '../../components/ImagePreviewOverlay';

const FeedbackManagement = () => {
  const actionRef = useRef();
  const [selectedFeedback, setSelectedFeedback] = useState(null);
  const [isDetailModalVisible, setIsDetailModalVisible] = useState(false);
  const [detailData, setDetailData] = useState(null);

  const feedbackTypeMap = {
    1: '背景不符',
    2: '人物变形',
    3: '服装失真',
    4: '色彩偏差',
    5: '细节模糊',
    6: '其他问题'
  };

  const getFeedbackTypeNames = (type) => {
    if (!type) return '未知';
    if (type.includes(',')) {
      return type.split(',').map(t => feedbackTypeMap[t.trim()] || '未知').join(', ');
    }
    return feedbackTypeMap[type] || '未知';
  };

  const modelTypeMap = {
    1: '模特图生成',
    2: '白底图生成'
  };

  const statusMap = {
    0: '未处理',
    1: '已处理已返还积分',
    2: '已处理不返还积分'
  };

  const handleViewDetail = async (id) => {
    try {
      const res = await request.get(`/admin/feedback/${id}`);
      setDetailData(res);
      setIsDetailModalVisible(true);
    } catch (error) {
      console.error('Error fetching feedback detail:', error);
      message.error('获取反馈详情失败');
    }
  };

  const handleProcess = async (record) => {
    try {
      const res = await request.get(`/admin/feedback/${record.id}`);
      setSelectedFeedback(res);
    } catch (error) {
      console.error('Error fetching feedback detail:', error);
      message.error('获取反馈详情失败');
    }
  };

  const handleSubmit = async (values) => {
    try {
      const updateData = {
        status: values.status,
        reply_content: values.reply_content
      };

      if (values.status === 1) {
        updateData.refund_points = values.refund_points;
      }

      await request.put(`/admin/feedback/${selectedFeedback.feedback.id}`, updateData);
      message.success('反馈处理成功');
      actionRef.current?.reload();
      return true;
    } catch (error) {
      console.error('Error updating feedback:', error);
      message.error('处理反馈失败');
      return false;
    }
  };

  const columns = [
    {
      title: 'ID',
      dataIndex: 'id',
      width: 60,
      search: false,
    },
    {
      title: '用户ID',
      dataIndex: 'user_id',
      width: 80,
    },
    {
      title: '反馈类型',
      dataIndex: 'feedback_type',
      width: 200,
      search: false,
      render: (type) => getFeedbackTypeNames(type)
    },
    {
      title: '反馈内容',
      dataIndex: 'content',
      width: 200,
      ellipsis: true,
      search: false,
    },
    {
      title: '模型类型',
      dataIndex: 'model_id',
      width: 100,
      valueType: 'select',
      valueEnum: {
        1: { text: '模特图生成' },
        2: { text: '白底图生成' },
      },
      render: (modelId) => modelTypeMap[modelId] || '未知',
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 120,
      valueType: 'select',
      valueEnum: {
        0: { text: '未处理', status: 'Warning' },
        1: { text: '已处理已返还积分', status: 'Success' },
        2: { text: '已处理不返还积分', status: 'Default' },
      },
      render: (status) => {
        let color = 'default';
        if (status === 0) color = 'orange';
        else if (status === 1) color = 'green';
        else if (status === 2) color = 'blue';
        return <Tag color={color}>{statusMap[status] || '未知'}</Tag>;
      }
    },
    {
      title: '创建时间',
      dataIndex: 'create_time',
      width: 150,
      valueType: 'dateTime',
      search: false,
    },
    {
      title: '操作',
      key: 'action',
      width: 150,
      fixed: 'right',
      search: false,
      render: (_, record) => (
        <Space size="small">
          <Button type="link" size="small" onClick={() => handleViewDetail(record.id)}>
            查看详情
          </Button>
          {record.status === 0 && (
            <Button type="primary" size="small" onClick={() => handleProcess(record)}>
              处理
            </Button>
          )}
        </Space>
      ),
    },
  ];

  return (
    <>
      <ProTable
        columns={columns}
        actionRef={actionRef}
        request={async (params) => {
          const res = await request.get('/admin/feedback', {
            params: {
              page: params.current,
              page_size: params.pageSize,
              status: params.status,
            }
          });
          return {
            data: res.items || [],
            success: true,
            total: res.total || 0,
          };
        }}
        rowKey="id"
        pagination={{
          showSizeChanger: true,
          showTotal: (total) => `共 ${total} 条`,
        }}
        dateFormatter="string"
        headerTitle="反馈管理"
        toolBarRender={false}
      />

      <Modal
        title="反馈详情"
        open={isDetailModalVisible}
        onCancel={() => setIsDetailModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setIsDetailModalVisible(false)}>
            关闭
          </Button>
        ]}
        width={1400}
        style={{ top: 20 }}
      >
        {detailData && (
          <div style={{ maxHeight: 'calc(100vh - 200px)', overflowY: 'auto' }}>
            <Descriptions bordered column={3} size="small">
              <Descriptions.Item label="反馈ID">{detailData.feedback.id}</Descriptions.Item>
              <Descriptions.Item label="用户ID">{detailData.feedback.user_id}</Descriptions.Item>
              <Descriptions.Item label="反馈类型">
                {getFeedbackTypeNames(detailData.feedback.feedback_type)}
              </Descriptions.Item>
              <Descriptions.Item label="模型类型">
                {modelTypeMap[detailData.feedback.model_id]}
              </Descriptions.Item>
              <Descriptions.Item label="状态" span={2}>
                <Tag color={
                  detailData.feedback.status === 0 ? 'orange' :
                  detailData.feedback.status === 1 ? 'green' : 'blue'
                }>
                  {statusMap[detailData.feedback.status]}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="反馈内容" span={3}>
                {detailData.feedback.content}
              </Descriptions.Item>
              <Descriptions.Item label="创建时间" span={3}>
                {new Date(detailData.feedback.create_time).toLocaleString()}
              </Descriptions.Item>
              {detailData.feedback.reply_content && (
                <>
                  <Descriptions.Item label="回复内容" span={3}>
                    {detailData.feedback.reply_content}
                  </Descriptions.Item>
                  <Descriptions.Item label="回复时间" span={3}>
                    {detailData.feedback.reply_time && new Date(detailData.feedback.reply_time).toLocaleString()}
                  </Descriptions.Item>
                </>
              )}
              {detailData.original_image_record && (
                <>
                  <Descriptions.Item label="生图记录ID" span={3}>
                    {detailData.original_image_record.id}
                  </Descriptions.Item>
                  <Descriptions.Item label="消耗积分" span={3}>
                    <span style={{ fontSize: '16px', fontWeight: 'bold', color: '#1890ff' }}>
                      {detailData.original_image_record.cost_integral} 积分
                    </span>
                  </Descriptions.Item>
                  <Descriptions.Item label="原图" span={1}>
                    {detailData.original_image_record.params?.uploaded_image ? (
                      <div style={{ display: 'flex', justifyContent: 'center', padding: '10px', background: '#f5f5f5', borderRadius: '8px' }}>
                        <ImagePreviewOverlay 
                          src={detailData.original_image_record.params.uploaded_image} 
                          alt="原图"
                          overlayWidth={500}
                          overlayHeight={500}
                        >
                          <Image 
                            src={detailData.original_image_record.params.uploaded_image} 
                            alt="原图" 
                            style={{ width: '180px', height: '180px', objectFit: 'cover', borderRadius: '8px', border: '2px solid #e8e8e8', cursor: 'pointer' }}
                            preview={false}
                          />
                        </ImagePreviewOverlay>
                      </div>
                    ) : (
                      <span style={{ color: '#999' }}>暂无原图</span>
                    )}
                  </Descriptions.Item>
                  <Descriptions.Item label="生成图" span={2}>
                    {detailData.original_image_record.images && Array.isArray(detailData.original_image_record.images) && detailData.original_image_record.images.length > 0 ? (
                      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'flex-start', padding: '10px', background: '#f5f5f5', borderRadius: '8px' }}>
                        {detailData.original_image_record.images.map((img, index) => (
                          <div key={index} style={{ position: 'relative' }}>
                            <ImagePreviewOverlay 
                              src={img.file_path || img.url || img} 
                              alt={`生成图${index + 1}`}
                              overlayWidth={500}
                              overlayHeight={500}
                            >
                              <Image 
                                src={img.file_path || img.url || img} 
                                alt={`生成图${index + 1}`} 
                                style={{ width: '180px', height: '180px', objectFit: 'cover', borderRadius: '8px', border: '2px solid #e8e8e8', cursor: 'pointer' }}
                                preview={false}
                              />
                              <div style={{ 
                                position: 'absolute', 
                                bottom: '4px', 
                                right: '4px', 
                                background: 'rgba(0,0,0,0.6)', 
                                color: 'white', 
                                padding: '2px 8px', 
                                borderRadius: '4px', 
                                fontSize: '12px',
                                fontWeight: 'bold'
                              }}>
                                #{index + 1}
                              </div>
                            </ImagePreviewOverlay>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span style={{ color: '#999' }}>暂无生成图</span>
                    )}
                  </Descriptions.Item>
                </>
              )}
              {detailData.feedback.points_transactions_id && (
                <Descriptions.Item label="返还积分ID" span={3}>
                  {detailData.feedback.points_transactions_id}
                </Descriptions.Item>
              )}
            </Descriptions>
          </div>
        )}
      </Modal>

      <ModalForm
        title="处理反馈"
        open={!!selectedFeedback}
        onOpenChange={(open) => {
          if (!open) setSelectedFeedback(null);
        }}
        onFinish={handleSubmit}
        width={1200}
        style={{ top: 20 }}
        modalProps={{
          bodyStyle: { padding: '16px', overflowX: 'hidden' },
        }}
        initialValues={{
          status: 2,
          reply_content: '',
          refund_points: selectedFeedback?.original_image_record?.cost_integral || 0,
        }}
      >
        {selectedFeedback && (
          <div style={{ maxHeight: 'calc(100vh - 200px)', overflowY: 'auto', overflowX: 'hidden' }}>
            <div style={{ marginBottom: '12px' }}>
              <div style={{ marginBottom: '8px', fontWeight: 500 }}>反馈类型</div>
              <div style={{ padding: '8px 12px', background: '#f5f5f5', borderRadius: '6px' }}>
                {getFeedbackTypeNames(selectedFeedback.feedback.feedback_type)}
              </div>
            </div>

            <div style={{ marginBottom: '12px' }}>
              <div style={{ marginBottom: '8px', fontWeight: 500 }}>生图记录消耗积分</div>
              <div style={{ padding: '8px 12px', background: '#e6f7ff', borderRadius: '6px', color: '#1890ff', fontWeight: 'bold', fontSize: '14px' }}>
                {selectedFeedback.original_image_record?.cost_integral || 0} 积分
              </div>
            </div>

            <div style={{ marginBottom: '12px' }}>
              <div style={{ marginBottom: '8px', fontWeight: 500 }}>反馈内容</div>
              <div style={{ padding: '8px 12px', background: '#f5f5f5', borderRadius: '6px', fontSize: '14px' }}>
                {selectedFeedback.feedback.content}
              </div>
            </div>

            {selectedFeedback.original_image_record && (
              <div style={{ marginBottom: '12px' }}>
                <div style={{ marginBottom: '8px', fontWeight: 500 }}>原图和生成图</div>
                <div style={{ display: 'flex', gap: '16px' }}>
                  <div style={{ flex: '0 0 140px' }}>
                    {selectedFeedback.original_image_record.params?.uploaded_image ? (
                      <div style={{ display: 'flex', justifyContent: 'center', padding: '8px', background: '#f5f5f5', borderRadius: '6px' }}>
                        <ImagePreviewOverlay 
                          src={selectedFeedback.original_image_record.params.uploaded_image} 
                          alt="原图"
                          overlayWidth={500}
                          overlayHeight={500}
                        >
                          <Image 
                            src={selectedFeedback.original_image_record.params.uploaded_image} 
                            alt="原图" 
                            style={{ width: '140px', height: '140px', objectFit: 'cover', borderRadius: '6px', border: '2px solid #e8e8e8', cursor: 'pointer' }}
                            preview={false}
                          />
                        </ImagePreviewOverlay>
                      </div>
                    ) : (
                      <span style={{ color: '#999' }}>暂无原图</span>
                    )}
                  </div>
                  <div style={{ flex: 1 }}>
                    {selectedFeedback.original_image_record.images && Array.isArray(selectedFeedback.original_image_record.images) && selectedFeedback.original_image_record.images.length > 0 ? (
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'flex-start', padding: '8px', background: '#f5f5f5', borderRadius: '6px', overflowX: 'hidden' }}>
                        {selectedFeedback.original_image_record.images.map((img, index) => (
                          <div key={index} style={{ position: 'relative' }}>
                            <ImagePreviewOverlay 
                              src={img.file_path || img.url || img} 
                              alt={`生成图${index + 1}`}
                              overlayWidth={500}
                              overlayHeight={500}
                            >
                              <Image 
                                src={img.file_path || img.url || img} 
                                alt={`生成图${index + 1}`} 
                                style={{ width: '140px', height: '140px', objectFit: 'cover', borderRadius: '6px', border: '2px solid #e8e8e8', cursor: 'pointer' }}
                                preview={false}
                              />
                              <div style={{ 
                                position: 'absolute', 
                                bottom: '4px', 
                                right: '4px', 
                                background: 'rgba(0,0,0,0.6)', 
                                color: 'white', 
                                padding: '2px 6px', 
                                borderRadius: '4px', 
                                fontSize: '11px',
                                fontWeight: 'bold'
                              }}>
                                #{index + 1}
                              </div>
                            </ImagePreviewOverlay>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span style={{ color: '#999' }}>暂无生成图</span>
                    )}
                  </div>
                </div>
              </div>
            )}

            <ProFormSelect
              name="status"
              label="处理状态"
              options={[
                { label: '已处理不返还积分', value: 2 },
                { label: '已处理已返还积分', value: 1 },
              ]}
              rules={[{ required: true, message: '请选择处理状态' }]}
            />

            <ProFormDigit
              name="refund_points"
              label="返还积分"
              placeholder={`最大可返还积分：${(selectedFeedback.original_image_record?.cost_integral || 0) * 2}`}
              min={0}
              max={(selectedFeedback.original_image_record?.cost_integral || 0) * 2}
              precision={0}
              rules={[
                { required: true, message: '请输入返还积分' },
              ]}
              dependencies={['status']}
              hidden={(values) => values.status !== 1}
            />

            <ProFormTextArea
              name="reply_content"
              label="回复内容"
              placeholder="请输入处理回复内容"
              fieldProps={{ rows: 3 }}
            />
          </div>
        )}
      </ModalForm>
    </>
  );
};

export default FeedbackManagement;
