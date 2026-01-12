import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import request from '../utils/request';
import { useAuthStore } from '../stores/useAuthStore';
import '../index.css';

const LoginPage = () => {
  const navigate = useNavigate();
  const { login } = useAuthStore();
  
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
  
  // 微信二维码相关状态
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [qrCodeLoading, setQrCodeLoading] = useState(false);
  const [qrCodeExpireTime, setQrCodeExpireTime] = useState(null);
  const [sceneId, setSceneId] = useState('');
  const [isScanned, setIsScanned] = useState(false);
  const [pollingActive, setPollingActive] = useState(false);
  const [qrCodeExpired, setQrCodeExpired] = useState(false);
  
  // 获取微信二维码
  const fetchWeChatQRCode = async () => {
    try {
      setQrCodeLoading(true);
      setGeneralError('');
      setIsScanned(false);
      setPollingActive(true);
      setQrCodeExpired(false);
      
      const response = await request.get('/auth/login/wechat/qrcode');
      
      if (response && response.qr_code_url) {
        setQrCodeUrl(response.qr_code_url);
        setSceneId(response.scene_id);
        setQrCodeExpireTime(Date.now() + (response.expire_seconds * 1000));
        console.log('微信二维码获取成功:', response.qr_code_url);
        console.log('场景ID:', response.scene_id);
      } else {
        throw new Error('获取二维码失败：返回数据格式错误');
      }
    } catch (error) {
      console.error('获取微信二维码失败:', error);
      const errorMsg = error.response?.data?.msg || error.response?.data?.detail || error.message || '获取二维码失败';
      setGeneralError(`获取二维码失败: ${errorMsg}`);
      setPollingActive(false);
    } finally {
      setQrCodeLoading(false);
    }
  };
  
  // 切换登录方式
  const switchLoginType = (type) => {
    setLoginType(type);
    setErrors({}); 
    setGeneralError('');
    
    // 如果切换到微信扫码，获取二维码
    if (type === 3) {
      fetchWeChatQRCode();
    } else {
      setQrCodeUrl('');
    }
  };
  
  // 轮询检测扫码状态
  useEffect(() => {
    if (!pollingActive || !sceneId || isScanned) {
      return;
    }

    const checkScanStatus = async () => {
      try {
        console.log('开始检测扫码状态，scene_id:', sceneId);
        const response = await request.get('/auth/login/wechat/check', {
          params: { scene_id: sceneId }
        });
        
        console.log('扫码检测响应:', response);

        if (response && response.scanned) {
          console.log('检测到用户已扫码');
          setIsScanned(true);
          setPollingActive(false);

          if (response.access_token) {
            localStorage.setItem('token', response.access_token);
            console.log('Access Token已保存到localStorage');
          }
          if (response.refresh_token) {
            localStorage.setItem('refresh_token', response.refresh_token);
            console.log('Refresh Token已保存到localStorage');
          }
          
          console.log('response.user:', response.user);
          
          if (response.user) {
            localStorage.setItem('user', JSON.stringify(response.user));
            localStorage.setItem('isLoggedIn', 'true');
            console.log('用户信息已保存到localStorage:', response.user);
            
            // 调用 login 方法更新应用状态
            login({
              nickname: response.user.nickname || '微信用户',
              id: response.user.id.toString(),
              points: response.user.points || 0,
              avatar: response.user.avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix'
            });
            console.log('已调用 login 方法更新应用状态');
            
            // 跳转到首页
            console.log('准备跳转到首页...');
            setTimeout(() => {
              console.log('正在执行跳转到首页');
              navigate('/');
            }, 500);
          } else {
            console.log('response.user 不存在，无法跳转');
          }
        } else {
          console.log('用户未扫码，response.scanned:', response?.scanned);
        }
      } catch (error) {
        console.error('检测扫码状态失败:', error);
      }
    };

    const intervalId = setInterval(checkScanStatus, 2000);

    return () => {
      clearInterval(intervalId);
    };
  }, [pollingActive, sceneId, isScanned, navigate]);

  // 监听二维码过期
  useEffect(() => {
    if (!qrCodeExpireTime || loginType !== 3) {
      return;
    }

    const checkExpire = () => {
      if (Date.now() >= qrCodeExpireTime && pollingActive && !isScanned) {
        console.log('二维码已过期');
        setPollingActive(false);
        setQrCodeExpired(true);
      }
    };

    const intervalId = setInterval(checkExpire, 1000);

    return () => {
      clearInterval(intervalId);
    };
  }, [qrCodeExpireTime, loginType, pollingActive, isScanned]);
  
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
    }
  };
  
  // 表单输入变化处理
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    
    // 清除对应字段的错误信息和通用错误
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
    setGeneralError('');
  };
  
  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2 className="auth-title">用户登录</h2>
        
        {/* 登录方式切换 */}
        <div className="login-type-tabs">
          <button
            className={`login-type-tab ${loginType === 1 ? 'active' : ''}`}
            onClick={() => switchLoginType(1)}
          >
            手机号验证码
          </button>
          <button
            className={`login-type-tab ${loginType === 2 ? 'active' : ''}`}
            onClick={() => switchLoginType(2)}
          >
            账号密码
          </button>
          <button
            className={`login-type-tab ${loginType === 3 ? 'active' : ''}`}
            onClick={() => switchLoginType(3)}
          >
            微信扫码
          </button>
        </div>
        
        <form onSubmit={handleLogin} className="auth-form">
          {/* 通用错误信息 */}
          {generalError && (
            <div className="error-message general-error">
              {generalError}
            </div>
          )}
          {/* 手机号验证码登录 */}
          {loginType === 1 && (
            <>
              <div className="form-group">
                <label htmlFor="phone" className="form-label">手机号</label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="请输入手机号"
                  className={`form-input ${errors.phone ? 'input-error' : ''}`}
                  maxLength={11}
                />
                {errors.phone && <span className="error-message">{errors.phone}</span>}
              </div>
              
              <div className="form-group">
                <label htmlFor="code" className="form-label">验证码</label>
                <div className="code-input-group">
                  <input
                    type="text"
                    id="code"
                    name="code"
                    value={formData.code}
                    onChange={handleChange}
                    placeholder="请输入验证码"
                    className={`form-input ${errors.code ? 'input-error' : ''}`}
                    maxLength={6}
                  />
                  <button
                    type="button"
                    onClick={handleSendCode}
                    disabled={countdown > 0 || isLoading || !formData.phone}
                    className="send-code-btn"
                  >
                    {countdown > 0 ? `${countdown}秒后重试` : '发送验证码'}
                  </button>
                </div>
                {errors.code && <span className="error-message">{errors.code}</span>}
              </div>
            </>
          )}
          
          {/* 账号密码登录 */}
          {loginType === 2 && (
            <>
              <div className="form-group">
                <label htmlFor="username" className="form-label">用户名/手机号</label>
                <input
                  type="text"
                  id="username"
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  placeholder="请输入用户名或手机号"
                  className={`form-input ${errors.username ? 'input-error' : ''}`}
                />
                {errors.username && <span className="error-message">{errors.username}</span>}
              </div>
              
              <div className="form-group">
                <label htmlFor="password" className="form-label">密码</label>
                <div className="password-input-group">
                  <input
                    type={passwordVisible ? 'text' : 'password'}
                    id="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="请输入密码"
                    className={`form-input ${errors.password ? 'input-error' : ''}`}
                  />
                  <button
                    type="button"
                    onClick={() => setPasswordVisible(!passwordVisible)}
                    className="toggle-password-btn"
                  >
                    {passwordVisible ? '👁️' : '👁️‍🗨️'}
                  </button>
                </div>
                {errors.password && <span className="error-message">{errors.password}</span>}
              </div>
              
              <div className="form-group remember-me-group">
                <input
                  type="checkbox"
                  id="rememberMe"
                  name="rememberMe"
                  checked={formData.rememberMe}
                  onChange={handleChange}
                  className="remember-me-checkbox"
                />
                <label htmlFor="rememberMe" className="remember-me-label">记住我</label>
                <Link to="/forgot-password" className="forgot-password-link">忘记密码？</Link>
              </div>
            </>
          )}
          
          {/* 微信扫码登录 */}
          {loginType === 3 && (
            <div className="wechat-login-container" style={{ textAlign: 'center' }}>
              {qrCodeLoading ? (
                <div style={{ padding: '50px 0' }}>加载中...</div>
              ) : qrCodeUrl ? (
                <div style={{ position: 'relative', display: 'inline-block' }}>
                  <img 
                    src={qrCodeUrl} 
                    alt="微信扫码登录" 
                    style={{ 
                      width: '300px', 
                      height: '300px', 
                      border: '1px solid #ddd',
                      borderRadius: '4px'
                    }}
                  />
                  {qrCodeExpired && (
                    <div 
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '300px',
                        height: '300px',
                        backgroundColor: 'rgba(255, 255, 255, 0.9)',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center',
                        alignItems: 'center',
                        cursor: 'pointer',
                        borderRadius: '4px',
                        border: '1px solid #ddd'
                      }}
                      onClick={fetchWeChatQRCode}
                    >
                      <div style={{ fontSize: '48px', marginBottom: '10px' }}>🔄</div>
                      <div style={{ color: '#666', fontSize: '14px' }}>二维码已过期，点击刷新</div>
                    </div>
                  )}
                  <p style={{ marginTop: '10px', color: '#666', fontSize: '14px' }}>
                    请使用微信扫描二维码登录
                  </p>
                </div>
              ) : (
                <div style={{ padding: '50px 0', color: '#999' }}>
                  加载二维码失败，请重试
                </div>
              )}
            </div>
          )}
          
          {/* 登录按钮 */}
          {(loginType === 1 || loginType === 2) && (
            <button
              type="submit"
              disabled={isLoading}
              className="auth-btn"
            >
              {isLoading ? '登录中...' : '登录'}
            </button>
          )}
          
          {/* 注册链接 */}
          <div className="auth-link">
            <span>还没有账号？</span>
            <Link to="/register" className="link-text">去注册</Link>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;