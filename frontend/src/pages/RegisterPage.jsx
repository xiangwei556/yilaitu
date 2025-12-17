import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import request from '../utils/request';
import '../index.css';

const RegisterPage = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    phone: '',
    code: '',
    password: '',
    confirmPassword: '',
    invitationCode: ''
  });
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [confirmPasswordVisible, setConfirmPasswordVisible] = useState(false);

  // 表单验证
  const validateForm = () => {
    const newErrors = {};
    
    // 手机号验证
    if (!formData.phone) {
      newErrors.phone = '请输入手机号';
    } else if (!/^1[3-9]\d{9}$/.test(formData.phone)) {
      newErrors.phone = '请输入有效的手机号';
    }

    // 验证码验证
    if (!formData.code) {
      newErrors.code = '请输入验证码';
    } else if (!/^\d{4,6}$/.test(formData.code)) {
      newErrors.code = '请输入4-6位数字验证码';
    }

    // 密码验证
    if (!formData.password) {
      newErrors.password = '请输入密码';
    } else if (formData.password.length < 8) {
      newErrors.password = '密码长度不能少于8位';
    } else if (!/^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$/.test(formData.password)) {
      newErrors.password = '密码必须包含字母和数字';
    }

    // 确认密码验证
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = '请再次输入密码';
    } else if (formData.confirmPassword !== formData.password) {
      newErrors.confirmPassword = '两次输入的密码不一致';
    }

    // 邀请码验证（可选，但如果输入了需要验证格式）
    if (formData.invitationCode && !/^[A-Za-z0-9]{6,20}$/.test(formData.invitationCode)) {
      newErrors.invitationCode = '邀请码格式不正确（6-20位字符）';
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
      alert('验证码发送成功，万能验证码为：5567');
    } catch (error) {
      console.error('发送验证码失败:', error);
      const errorMsg = error.response?.data?.msg || error.response?.data?.detail || error.response?.data?.message || '发送验证码失败，请稍后重试';
      alert(`发送验证码失败: ${errorMsg}`);
    } finally {
      setIsLoading(false);
    }
  };

  // 倒计时逻辑
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  // 注册提交
  const handleRegister = async (e) => {
    e.preventDefault();
    
    if (validateForm()) {
      try {
        setIsLoading(true);
        
        // 检查验证码是否为万能验证码
        if (formData.code !== '5567') {
          // 这里可以添加验证码验证逻辑，如果不是万能验证码，可以调用验证码验证接口
          // 但是根据用户的要求，我们只需要让万能验证码通过即可
          alert('验证码错误');
          setIsLoading(false);
          return;
        }
        
        // 调用注册API，使用request.js中的axios实例
        // 调用passport应用的手机号注册接口
        const response = await request.post('/auth/register/phone', {
          phone: formData.phone,
          code: formData.code,
          password: formData.password
        });
        
        alert('注册成功！');
        navigate('/login');
      } catch (error) {
        console.error('注册失败:', error);
        // 显示更详细的错误信息
        const errorMsg = error.response?.data?.msg || error.response?.data?.detail || error.response?.data?.message || '注册失败，请稍后重试';
        alert(`注册失败: ${errorMsg}`);
      } finally {
        setIsLoading(false);
      }
    }
  };

  // 表单输入变化处理
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // 清除对应字段的错误信息
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2 className="auth-title">用户注册</h2>
        <form onSubmit={handleRegister} className="auth-form">
          {/* 手机号输入 */}
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

          {/* 验证码输入 */}
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

          {/* 密码输入 */}
          <div className="form-group">
            <label htmlFor="password" className="form-label">密码</label>
            <div className="password-input-group">
              <input
                type={passwordVisible ? 'text' : 'password'}
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="请输入密码（至少8位，包含字母和数字）"
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

          {/* 确认密码输入 */}
          <div className="form-group">
            <label htmlFor="confirmPassword" className="form-label">再次输入密码</label>
            <div className="password-input-group">
              <input
                type={confirmPasswordVisible ? 'text' : 'password'}
                id="confirmPassword"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="请再次输入密码"
                className={`form-input ${errors.confirmPassword ? 'input-error' : ''}`}
              />
              <button
                type="button"
                onClick={() => setConfirmPasswordVisible(!confirmPasswordVisible)}
                className="toggle-password-btn"
              >
                {confirmPasswordVisible ? '👁️' : '👁️‍🗨️'}
              </button>
            </div>
            {errors.confirmPassword && <span className="error-message">{errors.confirmPassword}</span>}
          </div>

          {/* 邀请码输入 */}
          <div className="form-group">
            <label htmlFor="invitationCode" className="form-label">邀请码（可选）</label>
            <input
              type="text"
              id="invitationCode"
              name="invitationCode"
              value={formData.invitationCode}
              onChange={handleChange}
              placeholder="请输入邀请码"
              className={`form-input ${errors.invitationCode ? 'input-error' : ''}`}
            />
            {errors.invitationCode && <span className="error-message">{errors.invitationCode}</span>}
          </div>

          {/* 注册按钮 */}
          <button
            type="submit"
            disabled={isLoading}
            className="auth-btn"
          >
            {isLoading ? '注册中...' : '注册'}
          </button>

          {/* 登录链接 */}
          <div className="auth-link">
            <span>已有账号？</span>
            <Link to="/login" className="link-text">去登录</Link>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RegisterPage;