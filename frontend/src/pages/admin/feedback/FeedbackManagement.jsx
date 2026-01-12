import React, { useState, useEffect } from 'react';
import { Table, Card, Button, Modal, Form, Input, Select, InputNumber, message, Space, Tag, DatePicker, Descriptions, Radio, Row, Col, Image } from 'antd';
import request from '../../../utils/request';
import ImagePreviewOverlay from '../../components/ImagePreviewOverlay';

const { Option } = Select;
const { TextArea } = Input;

const FeedbackManagement = () => {
  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selectedFeedback, setSelectedFeedback] = useState(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isDetailModalVisible, setIsDetailModalVisible] = useState(false);
  const [detailData, setDetailData] = useState(null);
  const [statusFilter, setStatusFilter] = useState(null);
  const [form] = Form.useForm();

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

  const statusOptions = [
    { label: '全部', value: null },
    { label: '未处理', value: 0 },
    { label: '已处理已返还积分', value: 1 },
    { label: '已处理不返还积分', value: 2 }
  ];

  const fetchFeedbacks = async () => {
    setLoading(true);
    try {
      const res = await request.get('/admin/feedback', {
        params: {
          page: currentPage,
          page_size: pageSize,
          status: statusFilter || undefined
        }
      });
      setFeedbacks(res.items || []);
      setTotal(res.total || 0);
    } catch (error) {
      console.error('Error fetching feedbacks:', error);
      message.error('获取反馈列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFeedbacks();
  }, [currentPage, pageSize, statusFilter]);

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
      form.setFieldsValue({
        status: 2,
        reply_content: '',
        refund_points: res.original_image_record?.cost_integral || 0
      });
      setIsModalVisible(true);
    } catch (error) {
      console.error('Error fetching feedback detail:', error);
      message.error('获取反馈详情失败');
    }
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const updateData = {
        status: values.status,
        reply_content: values.reply_content
      };

      if (values.status === 1) {
        updateData.refund_points = values.refund_points;
      }

      await request.put(`/admin/feedback/${selectedFeedback.feedback.id}`, updateData);
      message.success('反馈处理成功');
      setIsModalVisible(false);
      fetchFeedbacks();
    } catch (error) {
      console.error('Error updating feedback:', error);
      message.error('处理反馈失败');
    }
  };

  const handleStatusFilterChange = (value) => {
    setStatusFilter(value);
    setCurrentPage(1);
  };

  const columns = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 60,
      responsive: ['md']
    },
    {
      title: '用户ID',
      dataIndex: 'user_id',
      key: 'user_id',
      width: 80,
      responsive: ['lg']
    },
    {
      title: '反馈类型',
      dataIndex: 'feedback_type',
      key: 'feedback_type',
      width: 200,
      render: (type) => getFeedbackTypeNames(type)
    },
    {
      title: '反馈内容',
      dataIndex: 'content',
      key: 'content',
      width: 200,
      ellipsis: true
    },
    {
      title: '模型类型',
      dataIndex: 'model_id',
      key: 'model_id',
      width: 100,
      render: (modelId) => modelTypeMap[modelId] || '未知',
      responsive: ['lg']
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 120,
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
      key: 'create_time',
      width: 150,
      render: (text) => new Date(text).toLocaleString(),
      responsive: ['md']
    },
    {
      title: '操作',
      key: 'action',
      width: 150,
      fixed: 'right',
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
    <div>
      <Card 
        title="反馈管理" 
        extra={
          <Space>
            <span>状态：</span>
            <Radio.Group 
              value={statusFilter} 
              onChange={(e) => handleStatusFilterChange(e.target.value)}
              buttonStyle="solid"
            >
              <Radio.Button value={null}>全部</Radio.Button>
              <Radio.Button value={0}>未处理</Radio.Button>
              <Radio.Button value={1}>已处理已返还积分</Radio.Button>
              <Radio.Button value={2}>已处理不返还积分</Radio.Button>
            </Radio.Group>
          </Space>
        }
      >
        <Table
          columns={columns}
          dataSource={feedbacks}
          rowKey="id"
          loading={loading}
          pagination={{
            current: currentPage,
            pageSize: pageSize,
            total: total,
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 条`,
            onChange: (page, pageSize) => {
              setCurrentPage(page);
              setPageSize(pageSize);
            }
          }}
        />
      </Card>

      <Modal
        title="反馈详情"
        visible={isDetailModalVisible}
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

      <Modal
        title="处理反馈"
        visible={isModalVisible}
        onOk={handleSubmit}
        onCancel={() => setIsModalVisible(false)}
        width={1200}
        style={{ top: 20 }}
        bodyStyle={{ padding: '16px', overflowX: 'hidden' }}
      >
        {selectedFeedback && (
          <div style={{ maxHeight: 'calc(100vh - 200px)', overflowY: 'auto', overflowX: 'hidden' }}>
            <Form form={form} layout="vertical">
                <Row gutter={16} style={{ overflowX: 'hidden' }}>
                  <Col span={12}>
                    <Form.Item label="反馈类型" style={{ marginBottom: '12px' }}>
                      <div style={{ padding: '8px 12px', background: '#f5f5f5', borderRadius: '6px' }}>
                        {getFeedbackTypeNames(selectedFeedback.feedback.feedback_type)}
                      </div>
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item label="生图记录消耗积分" style={{ marginBottom: '12px' }}>
                      <div style={{ padding: '8px 12px', background: '#e6f7ff', borderRadius: '6px', color: '#1890ff', fontWeight: 'bold', fontSize: '14px' }}>
                        {selectedFeedback.original_image_record?.cost_integral || 0} 积分
                      </div>
                    </Form.Item>
                  </Col>
                </Row>

              <Form.Item label="反馈内容" style={{ marginBottom: '12px' }}>
                <div style={{ padding: '8px 12px', background: '#f5f5f5', borderRadius: '6px', fontSize: '14px' }}>
                  {selectedFeedback.feedback.content}
                </div>
              </Form.Item>

              {selectedFeedback.original_image_record && (
                <Form.Item label="原图和生成图" style={{ marginBottom: '12px' }}>
                  <Row gutter={16} style={{ overflowX: 'hidden' }}>
                    <Col span={6}>
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
                    </Col>
                    <Col span={18}>
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
                    </Col>
                  </Row>
                </Form.Item>
              )}

              <Row gutter={16} style={{ overflowX: 'hidden' }}>
                <Col span={12}>
                  <Form.Item
                    label="处理状态"
                    name="status"
                    rules={[{ required: true, message: '请选择处理状态' }]}
                    style={{ marginBottom: '12px' }}
                  >
                    <Select>
                      <Option value={2}>已处理不返还积分</Option>
                      <Option value={1}>已处理已返还积分</Option>
                    </Select>
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    noStyle
                    shouldUpdate={(prevValues, currentValues) => prevValues.status !== currentValues.status}
                  >
                    {({ getFieldValue }) =>
                      getFieldValue('status') === 1 ? (
                        <Form.Item
                          label="返还积分"
                          name="refund_points"
                          rules={[
                            { required: true, message: '请输入返还积分' },
                            { type: 'number', min: 0, message: '返还积分不能为负数' }
                          ]}
                          tooltip={`最大可返还积分：${(selectedFeedback.original_image_record?.cost_integral || 0) * 2}`}
                          style={{ marginBottom: '12px' }}
                        >
                          <InputNumber
                            min={0}
                            max={(selectedFeedback.original_image_record?.cost_integral || 0) * 2}
                            style={{ width: '100%' }}
                          />
                        </Form.Item>
                      ) : null
                    }
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item
                label="回复内容"
                name="reply_content"
                style={{ marginBottom: '0' }}
              >
                <TextArea 
                  rows={3} 
                  placeholder="请输入处理回复内容" 
                  style={{ resize: 'none' }}
                />
              </Form.Item>
            </Form>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default FeedbackManagement;
