import React, { useState } from 'react';
import { X } from 'lucide-react';
import { useAuthStore } from '../stores/useAuthStore';
import { message } from 'antd';
import request from '../utils/request';

export const AuthModal: React.FC = () => {
  const { isOpen, closeAuthModal, login } = useAuthStore();
  const [authMode, setAuthMode] = useState<'phone' | 'wechat'>('phone');
  const [agreed, setAgreed] = useState(false);
  // 添加手机号和验证码的状态管理
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  // 添加错误状态管理
  const [errors, setErrors] = useState({
    phone: '',
    code: '',
    general: ''
  });
  
  if (!isOpen) return null;

  // 登录事件处理函数
  const handleLogin = async () => {
    // 重置错误信息
    setErrors({
      phone: '',
      code: '',
      general: ''
    });

    // 验证手机号格式
    const phoneRegex = /^1[3-9]\d{9}$/;
    if (!phoneRegex.test(phone)) {
      setErrors(prev => ({ ...prev, phone: '请输入正确的手机号' }));
      return;
    }

    // 验证验证码
    if (!code) {
      setErrors(prev => ({ ...prev, code: '请输入验证码' }));
      return;
    }

    // 验证是否同意协议
    if (!agreed) {
      setErrors(prev => ({ ...prev, general: '请阅读并同意使用协议及隐私政策' }));
      return;
    }

    try {
      // 清除旧的 localStorage 数据
      localStorage.removeItem('isLoggedIn');
      localStorage.removeItem('user');
      localStorage.removeItem('token');
      localStorage.removeItem('refresh_token');
      
      // 调用登录接口
      const response = await request.post('/auth/login/phone', {
        phone,
        code
      });

      // 保存token到localStorage
      localStorage.setItem('token', response.access_token);
      localStorage.setItem('refresh_token', response.refresh_token || '');
      
      // 使用后端返回的用户信息
      const userData = response.user || {};
      
      // 验证 user.id 是否存在
      if (!userData.id) {
        setErrors(prev => ({ ...prev, general: '登录失败：用户数据异常' }));
        return;
      }
      
      const loginUserData = {
        nickname: userData.nickname || phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2'),
        id: userData.id.toString(),
        points: userData.points || 0,
        avatar: userData.avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix'
      };
      
      login(loginUserData);
      
      // 显示登录成功消息
      message.success('登录成功');

      // 关闭登录弹窗
      closeAuthModal();
    } catch (error) {
      // 更新错误信息
      const errorDetail = error.response?.data?.detail || '登录失败，请稍后重试';
      if (errorDetail === '验证码错误') {
        setErrors(prev => ({ ...prev, code: errorDetail }));
      } else {
        setErrors(prev => ({ ...prev, general: errorDetail }));
      }
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl w-[800px] h-[500px] flex overflow-hidden shadow-2xl relative animate-in zoom-in-95 duration-200">
        <button 
          onClick={closeAuthModal}
          className="absolute right-4 top-4 text-gray-400 hover:text-gray-600 transition-colors z-50"
        >
          <X className="w-6 h-6" />
        </button>

        {/* Left Side - Branding Image */}
        <div className="w-[320px] h-full relative">
          <img 
            src="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2564&auto=format&fit=crop" 
            alt="Branding" 
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-[#4C3BFF]/80 flex flex-col justify-center p-8 text-white">
             <div className="flex items-center gap-2 mb-6">
                <div className="w-8 h-8 bg-white/20 rounded flex items-center justify-center">
                  <div className="w-4 h-4 bg-white transform rotate-45" />
                </div>
                <span className="text-xl font-bold">ProductGen</span>
             </div>
             <h2 className="text-3xl font-bold leading-tight mb-4">
               高效智能的产品主图<br/>设计与协作平台
             </h2>
             <p className="text-white/80 text-sm leading-relaxed">
               集模板、设计、协作于一体<br/>百万电商团队的共同选择
             </p>
          </div>
        </div>

        {/* Right Side - Auth Forms */}
        <div className="flex-1 p-10 flex flex-col justify-center relative">
          
          {authMode === 'phone' ? (
            // Phone Login Mode
            <div className="w-full max-w-[320px] mx-auto animate-in slide-in-from-right-4 duration-300">
              <h3 className="text-2xl font-bold text-gray-900 mb-1">手机号登录/注册</h3>
              <p className="text-gray-400 text-xs mb-8">未注册的手机号验证后将自动创建账户</p>
              
              <div className="space-y-2">
                <div>
                  <input 
                    type="text" 
                    placeholder="请输入手机号" 
                    value={phone}
                    onChange={(e) => {
                      setPhone(e.target.value);
                      // 清除手机号错误信息
                      if (errors.phone) {
                        setErrors(prev => ({ ...prev, phone: '' }));
                      }
                    }}
                    className={`w-full h-10 px-4 bg-gray-50 border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-brand transition-all ${errors.phone ? 'border-red-400' : 'border-gray-100 focus:border-brand'}`}
                  />
                  {errors.phone && (
                    <p className="text-red-500 text-xs mt-1">{errors.phone}</p>
                  )}
                </div>
                <div>
                  <div className="flex gap-3">
                    <input 
                      type="text" 
                      placeholder="请输入验证码" 
                      value={code}
                      onChange={(e) => {
                        setCode(e.target.value);
                        // 清除验证码错误信息
                        if (errors.code) {
                          setErrors(prev => ({ ...prev, code: '' }));
                        }
                      }}
                      className={`flex-1 h-10 px-4 bg-gray-50 border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-brand transition-all ${errors.code ? 'border-red-400' : 'border-gray-100 focus:border-brand'}`}
                    />
                    <button className="px-4 h-10 bg-white border border-gray-200 text-gray-600 text-xs rounded-lg hover:border-brand hover:text-brand transition-colors whitespace-nowrap">
                      获取验证码
                    </button>
                  </div>
                  {errors.code && (
                    <p className="text-red-500 text-xs mt-1">{errors.code}</p>
                  )}
                </div>
                
                {errors.general && (
                  <p className="text-red-500 text-xs mb-2">{errors.general}</p>
                )}
                
                <button 
                  onClick={handleLogin}
                  className="w-full h-10 bg-[#4C3BFF] text-white rounded-full font-medium text-sm hover:bg-[#3b2de0] transition-colors shadow-lg shadow-blue-500/30 mt-2"
                >
                  登录 / 注册
                </button>
                
                <div className="flex items-center justify-center gap-2 mt-2 cursor-pointer" onClick={() => setAgreed(!agreed)}>
                  <div className={`w-4 h-4 rounded-full border transition-colors flex items-center justify-center ${agreed ? 'bg-[#4C3BFF] border-[#4C3BFF]' : 'bg-white border-gray-300'}`}>
                    {agreed && <svg width="10" height="8" viewBox="0 0 10 8" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                  </div>
                  <p className="text-[10px] text-gray-400 select-none">
                    我已阅读并同意 <a href="#" className="text-[#4C3BFF]" onClick={(e) => e.stopPropagation()}>使用协议</a> 及 <a href="#" className="text-[#4C3BFF]" onClick={(e) => e.stopPropagation()}>隐私政策</a>
                  </p>
                </div>
              </div>

              <div className="mt-8 relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-100"></div>
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="px-2 bg-white text-gray-400">其他登录方式</span>
                </div>
              </div>

              <button 
                onClick={() => setAuthMode('wechat')}
                className="w-full h-10 mt-6 bg-[#07C160] text-white rounded-full font-medium text-sm hover:bg-[#06ad56] transition-colors flex items-center justify-center gap-2 shadow-lg shadow-green-500/20"
              >
                <img src="https://api.iconify.design/ri:wechat-fill.svg?color=white" className="w-5 h-5" alt="WeChat" />
                微信扫码登录
              </button>
            </div>
          ) : (
            // WeChat Login Mode
            <div className="w-full max-w-[320px] mx-auto text-center animate-in slide-in-from-right-4 duration-300">
              <h3 className="text-xl font-bold text-gray-900 mb-2">微信扫码登录</h3>
              <p className="text-gray-400 text-xs mb-8">请使用微信扫描二维码登录</p>
              
              <div className="w-[180px] h-[180px] bg-gray-100 rounded-lg mx-auto mb-4 flex items-center justify-center">
                 {/* QR Code Placeholder */}
                 <img 
                   src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=https://example.com/login/wechat&color=333333`} 
                   alt="QR Code" 
                   className="w-[160px] h-[160px] mix-blend-multiply opacity-80"
                 />
              </div>
              
              <p className="text-xs text-gray-400 mb-8">扫码后请在手机上确认登录</p>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-100"></div>
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="px-2 bg-white text-gray-400">其他登录方式</span>
                </div>
              </div>

              <button 
                onClick={() => setAuthMode('phone')}
                className="w-full h-10 mt-6 bg-white border border-gray-200 text-gray-700 rounded-full font-medium text-sm hover:border-gray-300 hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
              >
                <span className="material-icons-outlined text-gray-500 text-lg">smartphone</span>
                手机号登录/注册
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
