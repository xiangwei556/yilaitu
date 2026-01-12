import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';

// 创建一个新的axios实例，用于微信相关接口，跳过token刷新拦截器
const wechatRequest = axios.create({
  baseURL: 'http://localhost:8001/api/v1',
  timeout: 10000,
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

const WechatLoginPage = () => {
  const [isBindingMode, setIsBindingMode] = useState(false);
  const [wechatState, setWechatState] = useState('');
  const [isWechatReady, setIsWechatReady] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const wechatLoginRef = useRef(null);
  const hasInitializedWechat = useRef(false);

  // 加载微信JS SDK
  useEffect(() => {
    const loadWechatSDK = () => {
      return new Promise((resolve, reject) => {
        if (window.WxLogin) {
          resolve();
          return;
        }

        const script = document.createElement('script');
        script.src = 'https://res.wx.qq.com/connect/zh_CN/htmledition/js/wxLogin.js';
        script.onload = resolve;
        script.onerror = reject;
        document.body.appendChild(script);
      });
    };

    loadWechatSDK()
      .then(() => {
        setIsWechatReady(true);
        initWechatLogin();
      })
      .catch((error) => {
        console.error('加载微信JS SDK失败:', error);
        setMessage('加载微信登录组件失败，请刷新页面重试');
      });

    return () => {
      hasInitializedWechat.current = false;
    };
  }, []);

  // 初始化微信登录
  const initWechatLogin = async () => {
    if (hasInitializedWechat.current) {
      console.log('已经初始化过微信登录，跳过重复请求');
      return;
    }
    
    try {
      setIsLoading(true);
      
      const token = localStorage.getItem('token');
      let isLoggedIn = !!token;
      
      let apiEndpoint = isLoggedIn ? '/user/bind/wechat/url' : '/auth/login/wechat/url';
      
      const redirectUri = `https://nonsecludedly-sewable-napoleon.ngrok-free.dev/api/v1/auth/login/wechat/callback`;
      
      let response;
      try {
        response = await wechatRequest.get(apiEndpoint, {
          params: { redirect_uri: redirectUri }
        });
      } catch (error) {
        if (isLoggedIn && error.response && error.response.status === 401) {
          console.log('绑定接口401，尝试使用登录接口');
          localStorage.removeItem('token');
          localStorage.removeItem('refresh_token');
          isLoggedIn = false;
          apiEndpoint = '/auth/login/wechat/url';
          response = await wechatRequest.get(apiEndpoint, {
            params: { redirect_uri: redirectUri }
          });
        } else {
          throw error;
        }
      }
      
      const wechatUrl = response.data?.data?.url;
      
      if (wechatUrl) {
        console.log('微信扫码完整URL:', wechatUrl);
        
        const url = new URL(wechatUrl);
        const state = url.searchParams.get('state');
        const appid = url.searchParams.get('appid');
        
        if (state) {
          setWechatState(state);
        }
        
        if (window.WxLogin && wechatLoginRef.current) {
          wechatLoginRef.current.innerHTML = '';
          
          new window.WxLogin({
            self_redirect: true,
            id: 'wechat-login-container',
            appid: appid,
            scope: 'snsapi_login',
            redirect_uri: encodeURIComponent(redirectUri),
            state: state,
            style: 'black',
            stylelite: 1,
            qrWidth: 600,
            href: ''
          });
          
          setIsBindingMode(isLoggedIn);
          setMessage('');
        } else {
          throw new Error('微信JS SDK未加载完成');
        }
      } else {
        throw new Error('获取微信登录URL失败');
      }
    } catch (error) {
      console.error('初始化微信登录失败:', error);
      const token = localStorage.getItem('token');
      const isLoggedIn = !!token;
      let errorMsg = '初始化微信登录失败，请稍后重试';
      
      if (error.response) {
        if (error.response.status === 401) {
          errorMsg = '登录已过期，请重新登录';
        } else if (error.response.status === 403) {
          errorMsg = '没有权限执行此操作';
        } else if (error.response.status === 404) {
          errorMsg = '获取微信登录失败：服务未找到';
        } else if (error.response.status >= 500) {
          errorMsg = '获取微信登录失败：服务器错误';
        } else {
          errorMsg = error.response.data?.msg || error.response.data?.detail || errorMsg;
        }
      } else if (error.request) {
        errorMsg = '获取微信登录失败：网络连接异常';
      } else {
        errorMsg = `获取微信登录失败：${error.message}`;
      }
      
      setMessage(errorMsg);
      setIsBindingMode(isLoggedIn);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ 
      width: '300px', 
      height: '400px', 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      justifyContent: 'center',
      padding: '20px',
      boxSizing: 'border-box'
    }}>
      {message && (
        <div style={{ 
          marginBottom: '20px', 
          padding: '10px', 
          backgroundColor: '#f8d7da', 
          color: '#721c24', 
          borderRadius: '4px',
          textAlign: 'center',
          width: '100%'
        }}>
          {message}
        </div>
      )}
      
      <div style={{ position: 'relative' }}>
        {isLoading && (
          <div style={{ 
            position: 'absolute', 
            top: 0, 
            left: 0, 
            right: 0, 
            bottom: 0, 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            backgroundColor: 'rgba(255, 255, 255, 0.8)',
            borderRadius: '4px'
          }}>
            <div>加载中...</div>
          </div>
        )}
        <div 
          id="wechat-login-container" 
          ref={wechatLoginRef}
        ></div>
      </div>
      
    </div>
  );
};

export default WechatLoginPage;
