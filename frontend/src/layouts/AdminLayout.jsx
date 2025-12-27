import React, { useState } from 'react';
import { Layout, Menu, Button, Dropdown } from 'antd';
import {
  GoldOutlined,
  GiftOutlined,
  ShoppingCartOutlined,
  BellOutlined,
  SettingOutlined,
  DashboardOutlined,
  UserOutlined,
  SafetyCertificateOutlined,
  LogoutOutlined,
  MenuUnfoldOutlined,
  MenuFoldOutlined,
} from '@ant-design/icons';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';

const { Header, Sider, Content } = Layout;

const AdminLayout = () => {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/admin/login');
  };

  const menuItems = [
    {
      key: '/admin/dashboard',
      icon: <DashboardOutlined />,
      label: '仪表盘',
    },
    {
      key: '/admin/users',
      icon: <UserOutlined />,
      label: '用户管理',
    },
    {
      key: '/admin/membership',
      icon: <GoldOutlined />,
      label: '会员管理',
      children: [
        { key: '/admin/membership/packages', label: '套餐配置' },
        { key: '/admin/membership/subscriptions', label: '订阅列表' },
      ],
    },
    {
      key: '/admin/points',
      icon: <GiftOutlined />,
      label: '积分管理',
      children: [
        { key: '/admin/points/packages', label: '积分包配置' },
        { key: '/admin/points/rules', label: '积分规则' },
        { key: '/admin/points/ledger', label: '积分台账' },
      ],
    },
    {
      key: '/admin/yilaitumodel',
      icon: <UserOutlined />,
      label: '模特管理',
      children: [
        { key: '/admin/yilaitumodel/models', label: '模特列表' },
      ],
    },
    {
      key: '/admin/orders',
      icon: <ShoppingCartOutlined />,
      label: '订单管理',
    },
    {
      key: '/admin/notifications',
      icon: <BellOutlined />,
      label: '通知管理',
      children: [
        { key: '/admin/notifications/config', label: '模板配置' },
        { key: '/admin/notifications/send', label: '发送消息' },
      ],
    },
    {
      key: '/admin/config',
      icon: <SettingOutlined />,
      label: '配置中心',
    },
    {
      key: '/admin/logs',
      icon: <SafetyCertificateOutlined />,
      label: '审计日志',
    },
  ];

  const userMenu = {
    items: [
      {
        key: 'logout',
        icon: <LogoutOutlined />,
        label: '退出登录',
        onClick: handleLogout
      }
    ]
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider trigger={null} collapsible collapsed={collapsed}>
        <div className="logo" style={{ height: 32, margin: 16, background: 'rgba(255, 255, 255, 0.2)', textAlign: 'center', color: 'white', lineHeight: '32px' }}>
            {collapsed ? 'A' : '管理后台'}
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          onClick={({ key }) => navigate(key)}
          items={menuItems}
        />
      </Sider>
      <Layout className="site-layout">
        <Header className="site-layout-background" style={{ padding: '0 24px', background: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {React.createElement(collapsed ? MenuUnfoldOutlined : MenuFoldOutlined, {
            className: 'trigger',
            onClick: () => setCollapsed(!collapsed),
          })}
          <Dropdown menu={userMenu}><Button type="text">管理员</Button></Dropdown>
        </Header>
        <Content
          className="site-layout-background"
          style={{
            margin: '4px 4px',
            padding: 24,
            minHeight: 280,
            background: '#fff',
          }}
        >
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
};

export default AdminLayout;
