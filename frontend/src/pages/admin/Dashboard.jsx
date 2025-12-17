import React, { useEffect, useState } from 'react';
import { Card, Row, Col, Statistic } from 'antd';
import { UserOutlined, TeamOutlined, UserAddOutlined } from '@ant-design/icons';
import request from '../../utils/request';

const Dashboard = () => {
  const [stats, setStats] = useState({
    total_users: 0,
    active_users: 0,
    new_users_today: 0
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await request.get('/admin/stats');
        setStats(res);
      } catch (error) {
        console.error(error);
      }
    };
    fetchStats();
  }, []);

  return (
    <div>
      <div style={{ marginBottom: '24px', paddingBottom: '16px', borderBottom: '1px solid #f0f0f0' }}>
        <h2 style={{ margin: 0, fontSize: '24px', fontWeight: 600, color: '#262626' }}>仪表盘</h2>
      </div>
      <Row gutter={[16, 16]} style={{ width: '100%' }}>
        <Col xs={24} sm={12} md={8}>
          <Card style={{ boxShadow: '0 2px 8px rgba(0, 0, 0, 0.09)', borderRadius: '4px' }}>
            <Statistic
              title="总用户数"
              value={stats.total_users}
              prefix={<TeamOutlined style={{ color: '#1890ff' }} />}
              valueStyle={{ fontSize: '32px', fontWeight: 600 }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8}>
          <Card style={{ boxShadow: '0 2px 8px rgba(0, 0, 0, 0.09)', borderRadius: '4px' }}>
            <Statistic
              title="今日活跃用户"
              value={stats.active_users}
              prefix={<UserOutlined style={{ color: '#52c41a' }} />}
              valueStyle={{ fontSize: '32px', fontWeight: 600, color: '#3f8600' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8}>
          <Card style={{ boxShadow: '0 2px 8px rgba(0, 0, 0, 0.09)', borderRadius: '4px' }}>
            <Statistic
              title="今日新增用户"
              value={stats.new_users_today}
              prefix={<UserAddOutlined style={{ color: '#ff4d4f' }} />}
              valueStyle={{ fontSize: '32px', fontWeight: 600, color: '#cf1322' }}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Dashboard;
