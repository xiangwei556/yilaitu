import React, { useState } from 'react';
import { Form, Input, Button, Card, message } from 'antd';
import { UserOutlined, LockOutlined, SafetyOutlined } from '@ant-design/icons';
import request from '../../utils/request';
import { useNavigate } from 'react-router-dom';

const AdminLogin = () => {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const [captcha, setCaptcha] = useState(null);

  const fetchCaptcha = async () => {
     // TODO: Implement captcha fetching if needed
     // For now, we use simple phone/password login
  };

  const onFinish = async (values) => {
    setLoading(true);
    try {
      const res = await request.post('/admin/login', {
          username: values.username,
          password: values.password
      });
      
      // 根据request.js的响应拦截器，成功响应会直接返回res.data部分
      // 所以响应结构是 {access_token, refresh_token, user}
      if (res && res.access_token) {
        localStorage.setItem('token', res.access_token);
        localStorage.setItem('refresh_token', res.refresh_token || '');
        // 保存用户信息到localStorage
        localStorage.setItem('user', JSON.stringify(res.user || {}));
        console.log('Admin Login - User Info:', res.user);
        console.log('Admin Login - Redirecting to:', '/admin/dashboard');
        message.success('Login successful');
        navigate('/admin/dashboard');
      }
    } catch (error) {
      // Error handled by interceptor
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#f0f2f5' }}>
      <Card title="管理员登录" style={{ width: 300 }}>
        <Form
          name="admin_login"
          initialValues={{ remember: true }}
          onFinish={onFinish}
        >
          <Form.Item
            name="username"
            rules={[{ required: true, message: '请输入用户名!' }]}
          >
            <Input prefix={<UserOutlined />} placeholder="手机号" />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[{ required: true, message: '请输入密码!' }]}
          >
            <Input.Password prefix={<LockOutlined />} placeholder="密码" />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" style={{ width: '100%' }} loading={loading}>
              登录
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};

export default AdminLogin;
