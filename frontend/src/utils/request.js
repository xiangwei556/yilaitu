import axios from 'axios';
import { message } from 'antd';

// Create axios instance
const service = axios.create({
  baseURL: 'http://localhost:8001/api/v1', // Adjust if needed
  timeout: 5000,
});

// Token refresh flag to prevent multiple refresh requests
let isRefreshing = false;
let refreshSubscribers = [];

// Function to add requests to queue when token is refreshing
function subscribeTokenRefresh(cb) {
  refreshSubscribers.push(cb);
}

// Function to notify all queued requests when new token is available
function onRefreshed(token) {
  refreshSubscribers.forEach(cb => cb(token));
  refreshSubscribers = [];
}

// Request interceptor
service.interceptors.request.use(
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

// Response interceptor
service.interceptors.response.use(
  response => {
    const res = response.data;
    
    // Check custom code: backend returns {code: 0, data: ...} for success
    // We need to distinguish between standard response format and business objects with 'code' field
    // Standard response format should have both 'code' and 'data' fields
    if (res.code !== undefined && res.data !== undefined) {
      if (res.code !== 0) {
        // 不在这里显示错误信息，让调用方自己处理
        return Promise.reject(new Error(res.msg || 'Error'));
      } else {
        // For standard response format with code: {code: 0, data: ...}
        return res.data;
      }
    } else {
      // For direct data response (like login success: {access_token: '...'} or business objects)
      return res;
    }
  },
  error => {
    const originalRequest = error.config;
    
    // Handle 401 Unauthorized - token expired
    if (error.response && error.response.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // If already refreshing, queue the request
        return new Promise((resolve) => {
          subscribeTokenRefresh((token) => {
            originalRequest.headers['Authorization'] = `Bearer ${token}`;
            resolve(service(originalRequest));
          });
        });
      }
      
      originalRequest._retry = true;
      isRefreshing = true;
      
      // Get refresh token from localStorage
      const refreshToken = localStorage.getItem('refresh_token');
      
      if (!refreshToken) {
        // No refresh token, redirect to appropriate login page
        localStorage.removeItem('token');
        localStorage.removeItem('refresh_token');
        // Check current path to determine which login page to redirect to
        const currentPath = window.location.pathname;
        const loginPath = currentPath.startsWith('/admin') ? '/admin/login' : '/login';
        window.location.href = loginPath;
        return Promise.reject(error);
      }
      
      // Try to refresh token
      return new Promise((resolve, reject) => {
        service.post('/auth/refresh', { refresh_token: refreshToken })
          .then(response => {
            const { access_token, refresh_token } = response;
            
            // Save new tokens
            localStorage.setItem('token', access_token);
            localStorage.setItem('refresh_token', refresh_token);
            
            // Update Authorization header for current request
            originalRequest.headers['Authorization'] = `Bearer ${access_token}`;
            
            // Notify all queued requests
            onRefreshed(access_token);
            
            // Resolve current request with new token
            resolve(service(originalRequest));
          })
          .catch(err => {
            // Refresh failed, redirect to appropriate login page
            localStorage.removeItem('token');
            localStorage.removeItem('refresh_token');
            // Check current path to determine which login page to redirect to
            const currentPath = window.location.pathname;
            const loginPath = currentPath.startsWith('/admin') ? '/admin/login' : '/login';
            window.location.href = loginPath;
            reject(err);
          })
          .finally(() => {
            isRefreshing = false;
          });
      });
    }
    
    // 不在这里显示错误信息，让调用方自己处理
    return Promise.reject(error);
  }
);

export default service;
