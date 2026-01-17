import React, { useState } from 'react';
import { ProLayout } from '@ant-design/pro-components';
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
  MessageOutlined,
  PictureOutlined,
} from '@ant-design/icons';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';

const AdminLayout = () => {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/admin/login');
  };

  return (
    <ProLayout
      title="管理后台"
      logo="/logo.png"
      collapsed={collapsed}
      onCollapse={setCollapsed}
      location={{
        pathname: location.pathname,
      }}
      route={{
        path: '/admin',
        routes: [
          {
            path: '/admin/dashboard',
            name: '仪表盘',
            icon: <DashboardOutlined />,
          },
          {
            path: '/admin/users',
            name: '用户管理',
            icon: <UserOutlined />,
          },
          {
            path: '/admin/membership',
            name: '会员管理',
            icon: <GoldOutlined />,
            routes: [
              {
                path: '/admin/membership/packages',
                name: '套餐配置',
              },
              {
                path: '/admin/membership/subscriptions',
                name: '订阅列表',
              },
            ],
          },
          {
            path: '/admin/points',
            name: '积分管理',
            icon: <GiftOutlined />,
            routes: [
              {
                path: '/admin/points/packages',
                name: '积分包配置',
              },
              {
                path: '/admin/points/rules',
                name: '积分规则',
              },
              {
                path: '/admin/points/ledger',
                name: '积分台账',
              },
            ],
          },
          {
            path: '/admin/sys-images',
            name: '系统图像管理',
            icon: <PictureOutlined />,
            routes: [
              {
                path: '/admin/yilaitumodel/models',
                name: '模特人像管理',
              },
              {
                path: '/admin/sys-images/categories',
                name: '类目管理',
              },
              {
                path: '/admin/sys-images/model-refs',
                name: '模特参考图管理',
              },
              {
                path: '/admin/sys-images/scenes',
                name: '场景图管理',
              },
              {
                path: '/admin/sys-images/poses',
                name: '姿势图管理',
              },
              {
                path: '/admin/sys-images/backgrounds',
                name: '背景图管理',
              },
            ],
          },
          {
            path: '/admin/orders',
            name: '订单管理',
            icon: <ShoppingCartOutlined />,
          },
          {
            path: '/admin/feedback',
            name: '反馈管理',
            icon: <MessageOutlined />,
          },
          {
            path: '/admin/notifications',
            name: '通知管理',
            icon: <BellOutlined />,
            routes: [
              {
                path: '/admin/notifications/config',
                name: '模板配置',
              },
              {
                path: '/admin/notifications/send',
                name: '发送消息',
              },
            ],
          },
          {
            path: '/admin/config',
            name: '配置中心',
            icon: <SettingOutlined />,
          },
          {
            path: '/admin/logs',
            name: '审计日志',
            icon: <SafetyCertificateOutlined />,
          },
        ],
      }}
      menuItemRender={(item, dom) => (
        <div onClick={() => navigate(item.path || '/')}>{dom}</div>
      )}
      avatarProps={{
        src: '/touxiang.svg',
        title: '管理员',
        size: 'small',
      }}
      actionsRender={() => [
        <div key="logout" onClick={handleLogout}>
          <LogoutOutlined />
        </div>,
      ]}
    >
      <Outlet />
    </ProLayout>
  );
};

export default AdminLayout;
