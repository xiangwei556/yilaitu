import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { useAuthStore } from '../../stores/useAuthStore';
import { message } from 'antd';
import request from '../../utils/request';

message.config({
  top: 100
});

const AuthModalContent: React.FC = () => {
  const { closeAuthModal, login } = useAuthStore();
  const [authMode, setAuthMode] = useState<'phone' | 'wechat'>('phone');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [errors, setErrors] = useState({
    phone: '',
    code: '',
    general: ''
  });
  
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [qrCodeLoading, setQrCodeLoading] = useState(false);
  const [qrCodeExpireTime, setQrCodeExpireTime] = useState<number | null>(null);
  const [sceneId, setSceneId] = useState('');
  const [isScanned, setIsScanned] = useState(false);
  const [pollingActive, setPollingActive] = useState(false);
  const [qrCodeExpired, setQrCodeExpired] = useState(false);
  
  // 手机号绑定相关状态
  const [showPhoneBindModal, setShowPhoneBindModal] = useState(false);
  const [bindPhone, setBindPhone] = useState('');
  const [bindCode, setBindCode] = useState('');
  const [bindErrors, setBindErrors] = useState({
    phone: '',
    code: '',
    general: ''
  });
  const [bindCountdown, setBindCountdown] = useState(0);
  const [isBinding, setIsBinding] = useState(false);
  
  // 登录验证码倒计时
  const [loginCountdown, setLoginCountdown] = useState(0);
  const [loginCodeSent, setLoginCodeSent] = useState(false);
  
  // 获取用户取消绑定手机号的次数
  const getBindCancelCount = (): number => {
    const count = localStorage.getItem('phone_bind_cancel_count');
    return count ? parseInt(count, 10) : 0;
  };
  
  // 增加用户取消绑定手机号的次数
  const incrementBindCancelCount = () => {
    const currentCount = getBindCancelCount();
    localStorage.setItem('phone_bind_cancel_count', (currentCount + 1).toString());
  };
  
  // 获取手机号绑定验证码
  const fetchBindCode = async () => {
    try {
      const phoneRegex = /^1[3-9]\d{9}$/;
      if (!phoneRegex.test(bindPhone)) {
        setBindErrors(prev => ({ ...prev, phone: '请输入正确的手机号' }));
        return;
      }
      
      const response = await request.post('/auth/login/send_sms', { phone_number: bindPhone });
      console.log('验证码发送成功:', response);
      
      setBindErrors(prev => ({ ...prev, phone: '', general: '' }));
      message.success('验证码发送成功，有效期为 5 分钟');
      
      setBindCountdown(60);
      const timer = setInterval(() => {
        setBindCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (error) {
      console.error('发送验证码失败:', error);
      const errorMsg = (error as any).response?.data?.msg || (error as any).response?.data?.detail || (error as any).message || '发送验证码失败';
      setBindErrors(prev => ({ ...prev, general: errorMsg }));
    }
  };
  
  // 手机号绑定
  const handlePhoneBind = async () => {
    try {
      setIsBinding(true);
      setBindErrors({ phone: '', code: '', general: '' });
      
      const phoneRegex = /^1[3-9]\d{9}$/;
      if (!phoneRegex.test(bindPhone)) {
        setBindErrors(prev => ({ ...prev, phone: '请输入正确的手机号' }));
        return;
      }
      
      if (!bindCode) {
        setBindErrors(prev => ({ ...prev, code: '请输入验证码' }));
        return;
      }
      
      const response = await request.post('/auth/bind/phone', {
        phone: bindPhone,
        code: bindCode
      });
      
      console.log('手机号绑定成功:', response);
      
      if (response.access_token) {
        localStorage.setItem('token', response.access_token);
      }
      if (response.refresh_token) {
        localStorage.setItem('refresh_token', response.refresh_token);
      }
      
      if (response.user) {
        localStorage.setItem('user', JSON.stringify(response.user));
        localStorage.setItem('isLoggedIn', 'true');
        
        login({
          nickname: response.user.nickname || '微信用户',
          id: response.user.id.toString(),
          points: response.user.points || 0,
          avatar: response.user.avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix'
        });
      }
      
      message.success('绑定成功');
      setShowPhoneBindModal(false);
      closeAuthModal();
    } catch (error) {
      console.error('手机号绑定失败:', error);
      const errorMsg = (error as any).response?.data?.msg || (error as any).response?.data?.detail || '绑定失败，请稍后重试';
      setBindErrors(prev => ({ ...prev, general: errorMsg }));
    } finally {
      setIsBinding(false);
    }
  };
  
  // 关闭手机号绑定弹窗
  const handleClosePhoneBindModal = () => {
    incrementBindCancelCount();
    setShowPhoneBindModal(false);
    closeAuthModal();
  };
  
  // 获取微信二维码
  const fetchWeChatQRCode = async () => {
    try {
      setQrCodeLoading(true);
      setErrors(prev => ({ ...prev, general: '' }));
      setIsScanned(false);
      setPollingActive(true);
      setQrCodeExpired(false);
      setQrCodeExpireTime(null);
      
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
      const errorMsg = (error as any).response?.data?.msg || (error as any).response?.data?.detail || (error as Error).message || '获取二维码失败';
      setErrors(prev => ({ ...prev, general: `获取二维码失败: ${errorMsg}` }));
      setPollingActive(false);
    } finally {
      setQrCodeLoading(false);
    }
  };

  // 刷新二维码（点击按钮时调用）
  const handleRefreshQRCode = () => {
    setQrCodeExpired(false);
    fetchWeChatQRCode();
  };
  
  // 切换登录方式
  const switchAuthMode = (mode: 'phone' | 'wechat') => {
    setAuthMode(mode);
    setErrors({ phone: '', code: '', general: '' });
    
    // 如果切换到微信扫码，获取二维码
    if (mode === 'wechat') {
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
            
            const cancelCount = getBindCancelCount();
            const hasPhone = !!response.user.phone;
            
            console.log('用户是否已绑定手机号:', hasPhone);
            console.log('用户取消绑定手机号次数:', cancelCount);
            
            if (!hasPhone && cancelCount < 2) {
              console.log('用户未绑定手机号且取消次数少于2次，显示绑定手机号弹窗');
              setShowPhoneBindModal(true);
            } else {
              console.log('用户已绑定手机号或取消次数超过2次，直接登录');
              
              login({
                nickname: response.user.nickname || '微信用户',
                id: response.user.id.toString(),
                points: response.user.points || 0,
                avatar: response.user.avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix'
              });
              console.log('已调用 login 方法更新应用状态');
              
              message.success('登录成功');
              closeAuthModal();
            }
          } else {
            console.error('response.user 不存在，无法登录');
            message.error('登录失败：无法获取用户信息');
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
  }, [pollingActive, sceneId, isScanned, login, closeAuthModal]);

  // 监听二维码过期
  useEffect(() => {
    if (!qrCodeExpireTime || authMode !== 'wechat') {
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
  }, [qrCodeExpireTime, authMode, pollingActive, isScanned]);

  // 获取登录验证码
  const fetchLoginCode = async () => {
    try {
      const phoneRegex = /^1[3-9]\d{9}$/;
      if (!phoneRegex.test(phone)) {
        setErrors(prev => ({ ...prev, phone: '请输入正确的手机号' }));
        return;
      }
      
      await request.post('/auth/login/send_sms', { phone_number: phone });
      
      setErrors(prev => ({ ...prev, phone: '', general: '' }));
      setLoginCodeSent(true);
      
      setLoginCountdown(60);
      const timer = setInterval(() => {
        setLoginCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (error) {
      console.error('发送验证码失败:', error);
      const errorMsg = (error as any).response?.data?.msg || (error as any).response?.data?.detail || (error as any).message || '发送验证码失败';
      setErrors(prev => ({ ...prev, general: errorMsg }));
    }
  };

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

    try {
      // 清除旧的 localStorage 数据
      localStorage.removeItem('isLoggedIn');
      localStorage.removeItem('user');
      localStorage.removeItem('token');
      localStorage.removeItem('refresh_token');
      
      // 调用登录接口
      const response = (await request.post('/auth/login/phone', {
        phone,
        code
      })) as any;

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
    <>
      {showPhoneBindModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" id="bind-phone-modal">
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-[400px] overflow-hidden transform transition-all">
                <div className="px-6 py-4 flex items-center justify-between border-b border-gray-100 dark:border-gray-800">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">绑定手机号</h3>
                    <button 
                        onClick={handleClosePhoneBindModal}
                        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors focus:outline-none"
                    >
                        <span className="material-icons-outlined text-xl">close</span>
                    </button>
                </div>
                <div className="p-8">
                    <div className="text-center mb-8">
                        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 text-primary mb-3">
                            <span className="material-icons-outlined text-2xl">phonelink_lock</span>
                        </div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            为了保障您的账号安全，请绑定手机号完成验证
                        </p>
                    </div>
                    <div className="space-y-4">
                        <div className="relative group">
                            <span className="material-icons-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary transition-colors">phone_iphone</span>
                            <input 
                                className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg py-3 pl-10 pr-4 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" 
                                placeholder="请输入手机号" 
                                type="tel"
                                value={bindPhone}
                                onChange={(e) => {
                                    setBindPhone(e.target.value);
                                    if (bindErrors.phone) setBindErrors(prev => ({ ...prev, phone: '' }));
                                }}
                            />
                        </div>
                        {bindErrors.phone && <p className="text-red-500 text-xs pl-1">{bindErrors.phone}</p>}
                        
                        <div className="flex gap-3">
                            <div className="relative flex-1 group">
                                <span className="material-icons-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary transition-colors">verified_user</span>
                                <input 
                                    className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg py-3 pl-10 pr-4 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" 
                                    placeholder="验证码" 
                                    type="text"
                                    value={bindCode}
                                    onChange={(e) => {
                                        setBindCode(e.target.value);
                                        if (bindErrors.code) setBindErrors(prev => ({ ...prev, code: '' }));
                                    }}
                                />
                            </div>
                            <button 
                                onClick={fetchBindCode}
                                disabled={bindCountdown > 0}
                                className={`px-4 py-2 text-sm font-medium text-primary bg-primary/5 hover:bg-primary/10 border border-primary/20 rounded-lg transition-colors whitespace-nowrap ${bindCountdown > 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                                {bindCountdown > 0 ? `${bindCountdown}s` : '获取验证码'}
                            </button>
                        </div>
                        {bindErrors.code && <p className="text-red-500 text-xs pl-1">{bindErrors.code}</p>}
                        {bindErrors.general && <p className="text-red-500 text-xs pl-1">{bindErrors.general}</p>}
                        
                        <button 
                            onClick={handlePhoneBind}
                            disabled={isBinding}
                            className="w-full bg-primary text-white font-bold py-3 px-4 rounded-full shadow-lg hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all mt-4 disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                            {isBinding ? '绑定中...' : '立即绑定'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
      ) : (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-xl w-full max-w-4xl shadow-2xl relative animate-in zoom-in-95 duration-200 grid grid-cols-1 md:grid-cols-2 overflow-hidden">
        <button 
          onClick={closeAuthModal}
          className="absolute right-4 top-4 text-gray-400 hover:text-gray-600 transition-colors z-50"
        >
          <X className="w-6 h-6" />
        </button>

        {/* Left Side - Branding Image */}
        <div className="bg-[#3713ec] text-white p-12 flex flex-col justify-between relative overflow-hidden">
          <div>
            <div className="flex items-center space-x-2 mb-12">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2L2 7L12 12L22 7L12 2Z" fill="white"></path>
                <path d="M2 17L12 22L22 17L12 12L2 17Z" fill="white" fillOpacity="0.6"></path>
                <path d="M2 12L12 17L22 12L12 7L2 12Z" fill="white" fillOpacity="0.3"></path>
              </svg>
              <span className="text-2xl font-bold">ProductGen</span>
            </div>
            <h1 className="text-4xl font-bold leading-tight mb-4">高效智能的产品主图<br/>设计与协作平台</h1>
            <p className="text-base text-gray-200">集模板、设计、协作于一体<br/>百万电商团队的共同选择</p>
          </div>
          <div className="relative h-64 md:h-80 -mx-12 -mb-12">
            <img alt="Abstract green shape" className="absolute bottom-0 -left-10 w-48 opacity-80" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAX7y9QW8TlQuTIFG-u1wO-9QHwpUnkmY1GK5rE_Z4Zp7TlW_gEAhDwbsRCRDe2PIaBG8Uwn10690I8QGaADSq2vEe_65nj7yL2ACp5eeZr3DMmqF-PWbSfBTMkP51VYHnb2I17TRpTdtp8sVCLQpeMzQqLFXJgRPr6AY5U28oIpic4rHnniWQ7gLTqSiqw1n4moR39iUqIOKAduusIAUGRVgmqdt2HGW1SM92KQ491I14j7_9TpSdf57RNO_4xvglf8h5eT1fkD7Tz"/>
            <img alt="Abstract red shape" className="absolute -bottom-10 right-10 w-64 opacity-80" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCDSJFFu9tivUfdVuscaI_FRax6FlUX52WCA6sa0fg_SZ6cqo7azYwnulMmiPSjZpAyA4VgZmVbNxFHATE88c4pbTaE3HzfcUBuw-IICIsk8yqeJUfK3XNOElTOsHYJ95Y-ZIl6rz69n84Oi2zyFVRhsE1DBuRUEZ47ZPGlo531zAPPaLCdDPf_1xCmvN0mtIFyaBXFY_QEVLET5hPQkPBkAfDKXVmiSAW_-sTFOKcyohsqpRNZAEIHpWPqJFdFut746nPRRvlOWrO4"/>
            <img alt="Abstract yellow shape" className="absolute top-10 right-0 w-40 opacity-80" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBjG9pNrjY_y44dkBbUCZJbaeW6WgyaXPsu4TRUvVxb12vdDiX2fI6G0gWCiEeWjNu3O6pskY7Y9HlUch4hOLFv55YtiYOjy4V5-akt2mqJXhWMvfBi8RKIE2RZaMy1hK4in-unfuNmbpBGq3oQAjniI_tpneZ-XUczoXf61o1t2ojJB3pCx9L7QgsWapsS6IMtP_IRxX2wNtKk6cH_SP48kp-l4exkXtvYrV7w5Bgt7R4oASUmzJ6ir_5JTwo9vni2akS-sLJKkoBu"/>
          </div>
        </div>

        {/* Right Side - Auth Forms */}
        <div className="p-12 flex flex-col justify-center text-center relative">
          
          {authMode === 'phone' ? (
            // Phone Login Mode
            <div className="p-12 flex flex-col justify-center animate-in slide-in-from-right-4 duration-300">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">手机号登录/注册</h2>
              <p className="text-gray-600 dark:text-gray-400 mb-8">未注册的手机号验证后将自动创建账户</p>
              
              <div className="space-y-6">
                <div>
                  <label className="sr-only" htmlFor="phone">手机号</label>
                  <input 
                    className={`w-full px-4 py-3 rounded-md bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700 focus:ring-primary focus:border-primary text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 transition-all ${errors.phone ? 'border-red-400' : ''}`}
                    id="phone" 
                    placeholder="请输入手机号" 
                    type="tel"
                    value={phone}
                    onChange={(e) => {
                      setPhone(e.target.value);
                      if (errors.phone) setErrors(prev => ({ ...prev, phone: '' }));
                    }}
                  />
                  {errors.phone && <p className="text-red-500 text-xs mt-1 pl-1">{errors.phone}</p>}
                </div>
                
                <div>
                  <div className="flex items-center">
                    <label className="sr-only" htmlFor="code">验证码</label>
                    <input 
                      className={`w-full px-4 py-3 rounded-md bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700 focus:ring-primary focus:border-primary text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 transition-all ${errors.code ? 'border-red-400' : ''}`}
                      id="code" 
                      placeholder="请输入验证码" 
                      type="text"
                      value={code}
                      onChange={(e) => {
                        setCode(e.target.value);
                        if (errors.code) setErrors(prev => ({ ...prev, code: '' }));
                      }}
                    />
                    <button 
                      onClick={fetchLoginCode}
                      disabled={loginCountdown > 0}
                      className={`whitespace-nowrap ml-4 px-4 py-3 rounded-md border border-gray-300 dark:border-gray-600 text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-800 focus:outline-none transition-colors duration-200 w-28 text-center ${loginCountdown > 0 ? 'cursor-not-allowed' : 'hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer'}`}
                      type="button"
                    >
                      {loginCountdown > 0 ? `${loginCountdown}s` : '获取验证码'}
                    </button>
                  </div>
                  {loginCodeSent && <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">短信验证码已发送，请耐心等待</p>}
                  {errors.code && <p className="text-red-500 text-xs mt-1 pl-1">{errors.code}</p>}
                </div>
                
                {errors.general && <p className="text-red-500 text-xs">{errors.general}</p>}
                
                <button 
                  onClick={handleLogin}
                  className="w-full bg-primary text-white py-3 rounded-full font-semibold hover:bg-opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary dark:focus:ring-offset-gray-800 transition-colors duration-200" 
                  type="submit"
                >
                  登录 / 注册
                </button>
                
                <div className="flex items-center justify-center mt-4">
                  <p className="text-xs text-gray-500 dark:text-gray-400 select-none text-center">
                    登录即代表我已阅读并同意
                    <a className="text-primary hover:underline ml-1" href="#" onClick={(e) => e.preventDefault()}>使用协议</a>
                    及
                    <a className="text-primary hover:underline ml-1" href="#" onClick={(e) => e.preventDefault()}>隐私政策</a>
                  </p>
                </div>
              </div>

              <div className="mt-8">
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-300 dark:border-gray-600"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-background-light dark:bg-background-dark text-gray-500 dark:text-gray-400">其他登录方式</span>
                  </div>
                </div>
                
                <div className="mt-6 flex justify-center">
                  <button 
                    onClick={() => switchAuthMode('wechat')}
                    className="w-full flex items-center justify-center space-x-2 bg-green-500 text-white py-3 rounded-full font-semibold hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 dark:focus:ring-offset-gray-800 transition-colors duration-200"
                  >
                    <svg aria-hidden="true" className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8.697 15.65c-4.437 0-8.033-3.218-8.033-7.185 0-3.967 3.596-7.185 8.033-7.185 4.437 0 8.033 3.218 8.033 7.185 0 3.967-3.596 7.185-8.033 7.185-.568 0-1.123-.053-1.65-.151-1.118.614-2.522 1.118-4.015 1.157l.379-1.571c-1.742-1.288-2.747-3.118-2.747-5.071 0-3.737 3.48-6.768 7.777-6.768 4.296 0 7.777 3.031 7.777 6.768 0 3.737-3.48 6.768-7.777 6.768-.443 0-.876-.032-1.298-.093l-3.12 1.713v-2.152c-1.586-1.048-2.544-2.705-2.544-4.477zm1.59-8.522c-.44 0-.795.355-.795.795s.355.795.795.795.795-.355.795-.795-.355-.795-.795-.795-.355-.795-.795-.795-.355-.795-.795-.795zm4.237 0c-.44 0-.795.355-.795.795s.355.795.795.795.795-.355.795-.795-.355-.795-.795-.795-.355-.795-.795-.795-.355-.795-.795-.795-.355-.795-.795-.795-.355-.795-.795-.795zm8.003 6.368c0-3.118-3.048-5.645-6.808-5.645-3.76 0-6.808 2.527-6.808 5.645 0 3.118 3.048 5.645 6.808 5.645.478 0 .945-.041 1.396-.118l2.631 1.319v-1.658c1.533-.972 2.455-2.474 2.455-4.095zm-4.706-2.029c.373 0 .674-.301.674-.674s-.301-.674-.674-.674-.674.301-.674.674.301.674.674.674zm2.964 0c.373 0 .674-.301.674-.674s-.301-.674-.674-.674-.674.301-.674.674.301.674.674.674z" fillRule="nonzero"></path>
                    </svg>
                    <span>微信扫码登录</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            // WeChat Login Mode
            <div className="w-full max-w-[320px] mx-auto text-center animate-in slide-in-from-right-4 duration-300">
              <h3 className="text-2xl font-bold text-gray-900 mb-2">微信扫码登录/注册</h3>
              <p className="text-gray-600 text-xs mb-8">微信扫码关注公众号完成登录/注册</p>
              
              {qrCodeLoading ? (
                <div className="flex justify-center mb-8">
                  <div className="w-64 h-64 bg-gray-200 rounded-lg flex items-center justify-center">
                    <div className="text-gray-400 text-sm">加载中...</div>
                  </div>
                </div>
              ) : qrCodeUrl ? (
                <div className="flex justify-center mb-8">
                  <div className="relative w-64 h-64">
                    <img 
                      src={qrCodeUrl} 
                      alt="微信扫码登录" 
                      className="w-full h-full border border-gray-200 rounded-lg"
                    />
                    {qrCodeExpired && (
                      <div 
                        className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white/90 backdrop-blur-[2px]"
                      >
                        <p className="text-base font-bold text-gray-900 mb-4">二维码失效</p>
                        <button 
                          onClick={handleRefreshQRCode}
                          className="bg-[#3713ec] text-white px-6 py-2.5 rounded-full text-sm font-medium hover:bg-opacity-90 transition-all shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#3713ec]"
                        >
                          刷新二维码
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex justify-center mb-8">
                  <div className="w-64 h-64 bg-gray-200 rounded-lg flex items-center justify-center">
                    <div className="text-gray-400 text-sm">加载二维码失败，请重试</div>
                  </div>
                </div>
              )}
              
              {errors.general && (
                <p className="text-red-500 text-xs mb-4">{errors.general}</p>
              )}

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-gray-500">其他登录方式</span>
                </div>
              </div>

              <button 
                onClick={() => switchAuthMode('phone')}
                className="w-full flex items-center justify-center space-x-2 border border-gray-200 text-gray-700 py-3 rounded-full font-semibold hover:bg-gray-50 transition-colors mt-6"
              >
                <svg aria-hidden="true" className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path d="M17.75 3.5a.75.75 0 00-1.5 0v1.258a7.502 7.502 0 00-8.5 0V3.5a.75.75 0 00-1.5 0v1.439a7.5 7.5 0 00-1.25 13.911V19.5a.75.75 0 001.5 0v-1.121a7.5 7.5 0 0011 0V19.5a.75.75 0 001.5 0v-.67a7.5 7.5 0 00-1.25-13.912V3.5zM7.75 16.5a1.25 1.25 0 11-2.5 0 1.25 1.25 0 012.5 0zm9.75-1.25a1.25 1.25 0 110-2.5 1.25 1.25 0 010 2.5z"></path>
                </svg>
                手机号登录/注册
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
      )}
    </>
  );
};

export const AuthModal: React.FC = () => {
  const { isOpen } = useAuthStore();
  
  if (!isOpen) return null;
  
  return <AuthModalContent />;
};
