import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import request from '../utils/request';
import axios from 'axios';
import QRCode from 'qrcode';
import '../index.css';

// 创建一个新的axios实例，用于微信相关接口，跳过token刷新拦截器
const wechatRequest = axios.create({
  baseURL: 'http://localhost:8001/api/v1',
  timeout: 5000,
});

// 只添加请求拦截器，不添加响应拦截器
wechatRequest.interceptors.request.use(
  config => {
    // Add token if available
    const token = localStorage.getItem('token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  error => {
    return Promise.reject(error);
  }
);

const LoginPage = () => {
  const navigate = useNavigate();
  
  // 登录方式：1-手机号验证码登录，2-账号密码登录，3-微信扫码登录
  const [loginType, setLoginType] = useState(1);
  
  // 表单数据
  const [formData, setFormData] = useState({
    phone: '',
    code: '',
    username: '',
    password: '',
    rememberMe: false
  });
  
  const [errors, setErrors] = useState({});
  const [generalError, setGeneralError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [passwordVisible, setPasswordVisible] = useState(false);
  
  // 微信扫码状态
  const [wechatQrCode, setWechatQrCode] = useState('https://picsum.photos/200/200'); // 模拟二维码
  const [qrCodeExpires, setQrCodeExpires] = useState(60); // 二维码有效期（秒）
  const [isBindingMode, setIsBindingMode] = useState(false); // 是否为绑定模式
  const [pollingTimer, setPollingTimer] = useState(null); // 轮询定时器
  const [wechatState, setWechatState] = useState(''); // 保存微信登录/绑定的state参数
  
  // 表单验证
  const validateForm = () => {
    const newErrors = {};
    
    if (loginType === 1) {
      // 手机号验证码登录验证
      if (!formData.phone) {
        newErrors.phone = '请输入手机号';
      } else if (!/^1[3-9]\d{9}$/.test(formData.phone)) {
        newErrors.phone = '请输入有效的手机号';
      }
      
      if (!formData.code) {
        newErrors.code = '请输入验证码';
      } else if (!/^\d{4,6}$/.test(formData.code)) {
        newErrors.code = '请输入4-6位数字验证码';
      }
    } else if (loginType === 2) {
      // 账号密码登录验证
      if (!formData.username) {
        newErrors.username = '请输入用户名/手机号';
      }
      
      if (!formData.password) {
        newErrors.password = '请输入密码';
      } else if (formData.password.length < 8) {
        newErrors.password = '密码长度不能少于8位';
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  // 发送验证码
  const handleSendCode = async () => {
    if (!/^1[3-9]\d{9}$/.test(formData.phone)) {
      setErrors(prev => ({ ...prev, phone: '请输入有效的手机号' }));
      return;
    }
    
    try {
      setIsLoading(true);
      // 调用发送验证码API
      await request.post('/sms/send', { phone: formData.phone });
      
      // 开始倒计时
      setCountdown(60);
      setGeneralError('');
    } catch (error) {
      console.error('发送验证码失败:', error);
      const errorMsg = error.response?.data?.msg || error.response?.data?.detail || error.response?.data?.message || '发送验证码失败，请稍后重试';
      setGeneralError(`发送验证码失败: ${errorMsg}`);
    } finally {
      setIsLoading(false);
    }
  };
  
  // 倒计时逻辑
  useEffect(() => {
    let timer;
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [countdown]);
  
  // 二维码有效期倒计时
  useEffect(() => {
    let timer;
    if (loginType === 3 && qrCodeExpires > 0) {
      timer = setTimeout(() => setQrCodeExpires(qrCodeExpires - 1), 1000);
    } else if (loginType === 3 && qrCodeExpires === 0) {
      // 二维码过期，刷新二维码
      refreshWechatQrCode();
    }
    return () => clearTimeout(timer);
  }, [loginType, qrCodeExpires]);

  // 组件挂载和卸载时的清理
  useEffect(() => {
    // 如果初始登录类型是微信登录，自动获取二维码
    if (loginType === 3) {
      refreshWechatQrCode();
      // 注意：startPolling()会在refreshWechatQrCode成功后自动调用
    }

    // 组件卸载时停止轮询
    return () => {
      stopPolling();
    };
  }, [loginType]);
  
  // 检查微信登录/绑定状态
  const checkWechatLoginStatus = async () => {
    try {
      // 根据当前模式选择对应的API端点
      let apiEndpoint = isBindingMode ? '/user/bind/wechat/status' : '/auth/login/wechat/status';
      
      const token = localStorage.getItem('token');
      let response;
      try {
        // 使用wechatRequest实例，避免全局拦截器的影响
        response = await wechatRequest.get(apiEndpoint, {
          params: { state: wechatState }, // 传递state参数
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        });
      } catch (error) {
        // 如果是绑定状态检查接口返回401，可能是token过期，尝试停止绑定模式
        if (isBindingMode && error.response && error.response.status === 401) {
          console.log('绑定状态检查接口401，停止绑定模式');
          // 清除可能过期的token
          localStorage.removeItem('token');
          localStorage.removeItem('refresh_token');
          // 停止轮询
          stopPolling();
          // 重新获取二维码，此时会使用登录接口
          refreshWechatQrCode();
          return;
        } else {
          // 其他错误，重新抛出
          throw error;
        }
      }
      
      // 检查响应格式，后端返回的应该是{ "code": 0, "msg": "success", "data": { "status": "pending/success" } }
      const statusData = response.data?.data;
      const status = statusData?.status;
      
      if (status === 'success') {
        if (isBindingMode) {
          // 绑定成功
          setGeneralError('微信账号绑定成功！');
          stopPolling();
          // 跳转到个人中心
          setTimeout(() => {
            navigate('/user/profile');
          }, 1500);
        } else {
          // 登录成功
          localStorage.setItem('token', response.access_token || '');
          localStorage.setItem('refresh_token', response.refresh_token || '');
          localStorage.setItem('user', JSON.stringify(response.user || {}));
          setGeneralError('');
          navigate('/');
        }
      } else if (status === 'expired') {
        // 二维码过期，重新获取
        refreshWechatQrCode();
        setGeneralError('二维码已过期，正在刷新...');
      } else if (status === 'pending') {
        // 用户尚未扫码，继续轮询
      } else if (status === 'canceled') {
        // 用户取消了扫码
        stopPolling();
        setGeneralError('用户已取消扫码');
      }
    } catch (error) {
      console.error('检查微信状态失败:', error);
      const prefix = isBindingMode ? '绑定' : '登录';
      const errorMsg = error.response?.data?.msg || '网络连接异常';
      
      // 如果是二维码过期，由后端返回状态处理
      if (errorMsg && !errorMsg.includes('过期')) {
        setGeneralError(`${prefix}失败: ${errorMsg}`);
      }
    }
  };

  // 刷新微信二维码
  const refreshWechatQrCode = async () => {
    try {
      setIsLoading(true);
      
      // 检查用户是否已登录
      const token = localStorage.getItem('token');
      let isLoggedIn = !!token;
      
      // 根据登录状态决定是登录还是绑定
      let apiEndpoint = isLoggedIn ? '/user/bind/wechat/url' : '/auth/login/wechat/url';
      
      // 构造redirect_uri参数，必须与微信开放平台配置的授权回调域一致
      // 使用本地后端服务的回调地址，不需要手动编码，axios会自动处理
      const redirectUri = `http://127.0.0.1:8001/api/auth/wechat/callback`;
      
      // 调用后端API获取微信URL
      let response;
      try {
        response = await wechatRequest.get(apiEndpoint, {
          params: { redirect_uri: redirectUri }
        });
      } catch (error) {
        // 如果是绑定接口返回401，可能是token过期，尝试使用登录接口
        if (isLoggedIn && error.response && error.response.status === 401) {
          console.log('绑定接口401，尝试使用登录接口');
          // 清除可能过期的token
          localStorage.removeItem('token');
          localStorage.removeItem('refresh_token');
          isLoggedIn = false;
          // 切换到登录接口
          apiEndpoint = '/auth/login/wechat/url';
          // 再次调用API
          response = await wechatRequest.get(apiEndpoint, {
            params: { redirect_uri: redirectUri }
          });
        } else {
          // 其他错误，重新抛出
          throw error;
        }
      }
      
      // wechatRequest实例没有响应拦截器，所以会返回完整的Axios响应对象
      // 数据在response.data中，根据后端API的响应格式，应该是{ "code": 0, "msg": "success", "data": { "url": "微信URL" } }
      const wechatUrl = response.data?.data?.url;
      
      if (wechatUrl) {
        // 调试：输出完整的微信URL
        console.log('微信扫码完整URL:', wechatUrl);
        
        // 提取state参数
        const url = new URL(wechatUrl);
        const state = url.searchParams.get('state');
        if (state) {
          setWechatState(state);
          // 开始轮询检查登录状态
          startPolling();
        }
        
        // 确保清除缓存，添加时间戳参数
        const urlWithTimestamp = `${wechatUrl}&_t=${Date.now()}`;
        // 使用qrcode库将微信URL转换为二维码图片
        const qrCodeDataUrl = await QRCode.toDataURL(urlWithTimestamp);
        setWechatQrCode(qrCodeDataUrl);
        setIsBindingMode(isLoggedIn);
        setQrCodeExpires(60);
        setGeneralError('');
      } else {
        // 如果API返回格式不正确，使用默认图片
        setWechatQrCode(`https://picsum.photos/200/200?random=${Date.now()}`);
        setIsBindingMode(isLoggedIn);
        setQrCodeExpires(60);
        setGeneralError('获取二维码失败，正在使用备用方案...');
      }
    } catch (error) {
      console.error('获取微信二维码失败:', error);
      const token = localStorage.getItem('token');
      const isLoggedIn = !!token;
      let errorMsg = '获取二维码失败，请稍后重试';
      
      // 分类处理不同的错误
      if (error.response) {
        // 服务器返回错误
        if (error.response.status === 401) {
          errorMsg = '登录已过期，请重新登录';
        } else if (error.response.status === 403) {
          errorMsg = '没有权限执行此操作';
        } else if (error.response.status === 404) {
          errorMsg = '获取二维码失败：服务未找到';
        } else if (error.response.status >= 500) {
          errorMsg = '获取二维码失败：服务器错误';
        } else {
          // 其他客户端错误
          errorMsg = error.response.data?.msg || error.response.data?.detail || errorMsg;
        }
      } else if (error.request) {
        // 请求发出但没有收到响应
        errorMsg = '获取二维码失败：网络连接异常';
      } else {
        // 请求配置错误
        errorMsg = `获取二维码失败：${error.message}`;
      }
      
      setGeneralError(errorMsg);
      // 使用默认图片作为备选
      setWechatQrCode(`https://picsum.photos/200/200?random=${Date.now()}`);
      setQrCodeExpires(60);
      setIsBindingMode(isLoggedIn);
    } finally {
      setIsLoading(false);
    }
  };
  
  // 登录提交
  const handleLogin = async (e) => {
    e.preventDefault();
    
    if (validateForm()) {
      try {
        setIsLoading(true);
        
        let loginData;
        if (loginType === 1) {
          // 手机号验证码登录
          loginData = {
            phone: formData.phone,
            code: formData.code,
            login_type: 'sms'
          };
        } else if (loginType === 2) {
          // 账号密码登录
          loginData = {
            username: formData.username,
            password: formData.password,
            remember_me: formData.rememberMe,
            login_type: 'password'
          };
        }
        
        // 调用登录API
        let response;
        if (loginType === 1) {
          // 手机号验证码登录
          response = await request.post('/auth/login/phone', {
            phone: formData.phone,
            code: formData.code
          });
        } else if (loginType === 2) {
          // 账号密码登录
          response = await request.post('/auth/login/phone', {
            phone: formData.username, // 后端使用phone字段接收手机号或用户名
            password: formData.password
          });
        }
        
        // 检查响应格式
        if (!response) {
          console.error('服务器返回完整响应:', response);
          throw new Error('服务器返回格式错误，请查看控制台详细信息');
        }
        
        // 保存登录信息到localStorage
      // request.js拦截器已处理响应格式，直接使用数据
      localStorage.setItem('token', response.access_token || '');
      localStorage.setItem('refresh_token', response.refresh_token || '');
      // 从token中解析用户信息或使用默认空对象
      localStorage.setItem('user', JSON.stringify(response.user || {}));
      
      setGeneralError('');
      navigate('/'); // 登录成功后跳转到首页
    } catch (error) {
      console.error('登录失败:', error);
      const errorMsg = error.response?.data?.msg || error.response?.data?.detail || error.response?.data?.message || '登录失败，请检查账号密码或网络连接';
      setGeneralError(`登录失败: ${errorMsg}`);
    } finally {
      setIsLoading(false);
    }
  };
  
  // 开始轮询检查微信登录状态
  const startPolling = () => {
    // 先停止之前的轮询（如果有）
    stopPolling();
    
    // 每3秒检查一次登录状态
    const timer = setInterval(() => {
      checkWechatLoginStatus();
    }, 3000);
    
    setPollingTimer(timer);
  };
  
  // 停止轮询
  const stopPolling = () => {
    if (pollingTimer) {
      clearInterval(pollingTimer);
      setPollingTimer(null);
    }
  };
  
  // 处理表单输入变化
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    
    // 清除对应字段的错误信息
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };
  
  return (
    <div className="login-page">
      <div className="login-container">
        <h1 className="login-title">易来图</h1>
        <p className="login-subtitle">图片编辑与处理平台</p>
        
        {/* 登录方式切换 */}
        <div className="login-tabs">
          <button 
            className={`tab-button ${loginType === 1 ? 'active' : ''}`}
            onClick={() => setLoginType(1)}
          >
            手机号验证码
          </button>
          <button 
            className={`tab-button ${loginType === 2 ? 'active' : ''}`}
            onClick={() => setLoginType(2)}
          >
            账号密码
          </button>
          <button 
            className={`tab-button ${loginType === 3 ? 'active' : ''}`}
            onClick={() => setLoginType(3)}
          >
            微信扫码
          </button>
        </div>
        
        {/* 错误提示 */}
        {generalError && (
          <div className="error-message">
            {generalError}
          </div>
        )}
        
        {/* 表单内容 */}
        {loginType === 1 && (
          <form onSubmit={handleLogin} className="login-form">
            <div className="form-group">
              <label htmlFor="phone">手机号</label>
              <input
                type="tel"
                id="phone"
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
                placeholder="请输入手机号"
                className={errors.phone ? 'error' : ''}
              />
              {errors.phone && <div className="field-error">{errors.phone}</div>}
            </div>
            
            <div className="form-group">
              <label htmlFor="code">验证码</label>
              <div className="code-input-group">
                <input
                  type="text"
                  id="code"
                  name="code"
                  value={formData.code}
                  onChange={handleInputChange}
                  placeholder="请输入验证码"
                  className={errors.code ? 'error' : ''}
                />
                <button
                  type="button"
                  onClick={handleSendCode}
                  disabled={countdown > 0 || !formData.phone || !/^1[3-9]\d{9}$/.test(formData.phone)}
                  className="send-code-button"
                >
                  {countdown > 0 ? `${countdown}秒后重发` : '发送验证码'}
                </button>
              </div>
              {errors.code && <div className="field-error">{errors.code}</div>}
            </div>
            
            <div className="form-actions">
              <button type="submit" className="login-button" disabled={isLoading}>
                {isLoading ? '登录中...' : '登录'}
              </button>
            </div>
          </form>
        )}
        
        {loginType === 2 && (
          <form onSubmit={handleLogin} className="login-form">
            <div className="form-group">
              <label htmlFor="username">用户名/手机号</label>
              <input
                type="text"
                id="username"
                name="username"
                value={formData.username}
                onChange={handleInputChange}
                placeholder="请输入用户名或手机号"
                className={errors.username ? 'error' : ''}
              />
              {errors.username && <div className="field-error">{errors.username}</div>}
            </div>
            
            <div className="form-group">
              <label htmlFor="password">密码</label>
              <div className="password-input-group">
                <input
                  type={passwordVisible ? 'text' : 'password'}
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  placeholder="请输入密码"
                  className={errors.password ? 'error' : ''}
                />
                <button
                  type="button"
                  onClick={() => setPasswordVisible(!passwordVisible)}
                  className="password-toggle"
                >
                  {passwordVisible ? '隐藏' : '显示'}
                </button>
              </div>
              {errors.password && <div className="field-error">{errors.password}</div>}
            </div>
            
            <div className="form-options">
              <label className="remember-me">
                <input
                  type="checkbox"
                  name="rememberMe"
                  checked={formData.rememberMe}
                  onChange={handleInputChange}
                />
                记住我
              </label>
              <Link to="/forgot-password" className="forgot-password">
                忘记密码？
              </Link>
            </div>
            
            <div className="form-actions">
              <button type="submit" className="login-button" disabled={isLoading}>
                {isLoading ? '登录中...' : '登录'}
              </button>
            </div>
          </form>
        )}
        
        {loginType === 3 && (
          <div className="wechat-login">
            <div className="qr-code-container">
              <img 
                src={wechatQrCode} 
                alt="微信扫码登录"
                className="wechat-qr-code"
              />
              <div className="qr-code-timer">
                二维码有效期：{qrCodeExpires}秒
              </div>
            </div>
            <div className="wechat-login-tips">
              <p>打开微信，扫描二维码登录/绑定账号</p>
              <p>登录即表示同意 <Link to="/terms">用户协议</Link> 和 <Link to="/privacy">隐私政策</Link></p>
            </div>
            <button 
              type="button" 
              onClick={refreshWechatQrCode}
              className="refresh-qr-button"
              disabled={isLoading}
            >
              {isLoading ? '刷新中...' : '刷新二维码'}
            </button>
          </div>
        )}
        
        {/* 底部链接 */}
        <div className="login-footer">
          <p>还没有账号？ <Link to="/register">立即注册</Link></p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;