import React, { useState, useEffect } from 'react';
import { Table, DatePicker, Select, Button, Tag, Modal, Form, Input, message } from 'antd';
import { PlusOutlined, SearchOutlined, FilterOutlined, DownloadOutlined } from '@ant-design/icons';
import type { ColumnType } from 'antd/es/table';
import type { RangePickerProps } from 'antd/es/date-picker';
import { useAuthStore } from '../stores/useAuthStore';
import './PointsRecord.css';

const { RangePicker } = DatePicker;
const { Option } = Select;

interface PointRecord {
  key: string;
  id: number;
  type: 'earn' | 'consume';
  reason: string;
  points: number;
  balance: number;
  createTime: string;
  status: 'success' | 'pending' | 'failed';
  relatedOrder?: string;
}

const PointsRecord: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [pointsRecords, setPointsRecords] = useState<PointRecord[]>([]);
  const [totalPoints, setTotalPoints] = useState<number>(0);
  const [filters, setFilters] = useState({
    dateRange: null as RangePickerProps['value'],
    type: undefined as string | undefined,
    status: undefined as string | undefined,
  });
  const [showAddModal, setShowAddModal] = useState(false);
  const [form] = Form.useForm();
  const { user } = useAuthStore();

  // Mock data generation
  const generateMockData = (): PointRecord[] => {
    const records: PointRecord[] = [];
    const reasons = {
      earn: ['每日登录奖励', '完成图片编辑任务', '分享作品奖励', '邀请好友奖励', 'VIP专属奖励'],
      consume: ['使用高级滤镜', '批量处理图片', '下载高清图片', '移除水印', 'AI增强功能']
    };
    const statuses: Array<'success' | 'pending' | 'failed'> = ['success', 'pending', 'failed'];
    
    // Generate 20 mock records
    for (let i = 1; i <= 20; i++) {
      const isEarn = Math.random() > 0.4;
      const points = isEarn ? Math.floor(Math.random() * 100) + 10 : Math.floor(Math.random() * 200) + 50;
      const balance = Math.floor(Math.random() * 5000) + 1000;
      const date = new Date();
      date.setDate(date.getDate() - Math.floor(Math.random() * 30));
      date.setHours(Math.floor(Math.random() * 24));
      date.setMinutes(Math.floor(Math.random() * 60));
      
      records.push({
        key: String(i),
        id: i,
        type: isEarn ? 'earn' : 'consume',
        reason: isEarn ? reasons.earn[Math.floor(Math.random() * reasons.earn.length)] : reasons.consume[Math.floor(Math.random() * reasons.consume.length)],
        points: isEarn ? points : -points,
        balance,
        createTime: date.toISOString(),
        status: statuses[Math.floor(Math.random() * statuses.length)],
        relatedOrder: isEarn ? undefined : `ORDER${Date.now() + i}`
      });
    }
    
    // Sort by date descending
    return records.sort((a, b) => new Date(b.createTime).getTime() - new Date(a.createTime).getTime());
  };

  useEffect(() => {
    loadPointsRecords();
  }, [filters]);

  const loadPointsRecords = () => {
    setLoading(true);
    
    // Simulate API call
    setTimeout(() => {
      const mockData = generateMockData();
      setPointsRecords(mockData);
      setTotalPoints(3500); // Mock total points
      setLoading(false);
    }, 1000);
  };

  const handleDateRangeChange = (dates: RangePickerProps['value']) => {
    setFilters(prev => ({ ...prev, dateRange: dates }));
  };

  const handleTypeChange = (value: string | undefined) => {
    setFilters(prev => ({ ...prev, type: value }));
  };

  const handleStatusChange = (value: string | undefined) => {
    setFilters(prev => ({ ...prev, status: value }));
  };

  const handleResetFilters = () => {
    setFilters({
      dateRange: null,
      type: undefined,
      status: undefined,
    });
  };

  const handleAddPointRecord = () => {
    setShowAddModal(true);
  };

  const handleModalOk = () => {
    form.validateFields()
      .then(values => {
        // In a real app, this would be an API call
        console.log('Add record:', values);
        message.success('积分记录添加成功');
        setShowAddModal(false);
        form.resetFields();
        loadPointsRecords();
      })
      .catch(info => {
        console.log('Validation failed:', info);
      });
  };

  const handleModalCancel = () => {
    setShowAddModal(false);
    form.resetFields();
  };

  const handleDownload = () => {
    // In a real app, this would generate and download an Excel file
    message.info('导出功能开发中...');
  };

  const columns: ColumnType<PointRecord>[] = [
    {
      title: '记录ID',
      dataIndex: 'id',
      key: 'id',
      width: 100,
      sorter: (a, b) => a.id - b.id,
    },
    {
      title: '交易类型',
      dataIndex: 'type',
      key: 'type',
      width: 120,
      render: (type) => (
        <Tag color={type === 'earn' ? 'green' : 'red'}>
          {type === 'earn' ? '收入' : '支出'}
        </Tag>
      ),
      filters: [
        { text: '收入', value: 'earn' },
        { text: '支出', value: 'consume' },
      ],
      onFilter: (value, record) => record.type === value,
    },
    {
      title: '积分变动',
      dataIndex: 'points',
      key: 'points',
      width: 120,
      render: (points) => (
        <span style={{ color: points > 0 ? '#52c41a' : '#ff4d4f' }}>
          {points > 0 ? `+${points}` : points}
        </span>
      ),
      sorter: (a, b) => a.points - b.points,
    },
    {
      title: '变动原因',
      dataIndex: 'reason',
      key: 'reason',
      ellipsis: true,
    },
    {
      title: '当前余额',
      dataIndex: 'balance',
      key: 'balance',
      width: 120,
      sorter: (a, b) => a.balance - b.balance,
    },
    {
      title: '交易时间',
      dataIndex: 'createTime',
      key: 'createTime',
      width: 180,
      render: (time) => new Date(time).toLocaleString(),
      sorter: (a, b) => new Date(a.createTime).getTime() - new Date(b.createTime).getTime(),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status) => {
        const statusConfig = {
          success: { color: 'green', text: '成功' },
          pending: { color: 'orange', text: '处理中' },
          failed: { color: 'red', text: '失败' },
        };
        const config = statusConfig[status];
        return <Tag color={config.color}>{config.text}</Tag>;
      },
      filters: [
        { text: '成功', value: 'success' },
        { text: '处理中', value: 'pending' },
        { text: '失败', value: 'failed' },
      ],
      onFilter: (value, record) => record.status === value,
    },
    {
      title: '关联订单',
      dataIndex: 'relatedOrder',
      key: 'relatedOrder',
      width: 150,
      render: (order) => order || '-',
    },
    {
      title: '操作',
      key: 'action',
      width: 120,
      render: (_, record) => (
        <Button type="text" size="small">查看详情</Button>
      ),
    },
  ];

  return (
    <div className="points-record-container">
      <div className="points-header">
        <div className="points-info">
          <h2>积分管理</h2>
          <div className="total-points">
            <span className="points-label">当前总积分：</span>
            <span className="points-value">{totalPoints}</span>
            <Button type="primary" shape="circle" icon={<PlusOutlined />} size="small" className="add-points-btn" onClick={handleAddPointRecord} />
          </div>
        </div>
        <div className="points-actions">
          <Button icon={<DownloadOutlined />} onClick={handleDownload}>导出记录</Button>
        </div>
      </div>

      <div className="points-filters">
        <div className="filter-group">
          <label className="filter-label">日期范围：</label>
          <RangePicker onChange={handleDateRangeChange} value={filters.dateRange} />
        </div>
        <div className="filter-group">
          <label className="filter-label">交易类型：</label>
          <Select
            style={{ width: 120 }}
            placeholder="选择类型"
            onChange={handleTypeChange}
            value={filters.type}
          >
            <Option value="earn">收入</Option>
            <Option value="consume">支出</Option>
          </Select>
        </div>
        <div className="filter-group">
          <label className="filter-label">状态：</label>
          <Select
            style={{ width: 120 }}
            placeholder="选择状态"
            onChange={handleStatusChange}
            value={filters.status}
          >
            <Option value="success">成功</Option>
            <Option value="pending">处理中</Option>
            <Option value="failed">失败</Option>
          </Select>
        </div>
        <div className="filter-actions">
          <Button type="primary" icon={<SearchOutlined />} onClick={loadPointsRecords} loading={loading}>查询</Button>
          <Button onClick={handleResetFilters} style={{ marginLeft: 8 }}>重置</Button>
        </div>
      </div>

      <div className="points-table">
        <Table
          columns={columns}
          dataSource={pointsRecords}
          loading={loading}
          rowKey="key"
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 条记录`,
          }}
        />
      </div>

      {/* Add Point Record Modal */}
      <Modal
        title="添加积分记录"
        open={showAddModal}
        onOk={handleModalOk}
        onCancel={handleModalCancel}
        width={600}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="type"
            label="交易类型"
            rules={[{ required: true, message: '请选择交易类型' }]}
          >
            <Select placeholder="选择交易类型">
              <Option value="earn">收入</Option>
              <Option value="consume">支出</Option>
            </Select>
          </Form.Item>
          
          <Form.Item
            name="reason"
            label="变动原因"
            rules={[{ required: true, message: '请输入变动原因' }]}
          >
            <Input placeholder="请输入变动原因" />
          </Form.Item>
          
          <Form.Item
            name="points"
            label="积分数量"
            rules={[{ required: true, message: '请输入积分数量' }, { type: 'number', min: 1 }]}
          >
            <Input type="number" placeholder="请输入积分数量" />
          </Form.Item>
          
          <Form.Item
            name="status"
            label="状态"
            rules={[{ required: true, message: '请选择状态' }]}
          >
            <Select placeholder="选择状态">
              <Option value="success">成功</Option>
              <Option value="pending">处理中</Option>
              <Option value="failed">失败</Option>
            </Select>
          </Form.Item>
          
          <Form.Item
            name="relatedOrder"
            label="关联订单号"
          >
            <Input placeholder="请输入关联订单号（可选）" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default PointsRecord;