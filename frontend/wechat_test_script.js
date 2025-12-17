// 微信登录测试脚本
// 此脚本用于模拟微信登录成功后的回调处理

// 1. 检查当前环境
console.log('=== 微信登录测试脚本 ===');
console.log('当前URL:', window.location.href);

// 2. 模拟微信登录成功（未登录状态）
window.mockWechatLoginSuccess = async () => {
  try {
    // 使用提供的测试账号登录
    const phone = '13401022282';
    const code = '5567';
    
    console.log('正在使用手机号和验证码登录...');
    console.log('手机号:', phone);
    console.log('验证码:', code);
    
    // 调用真实的登录接口
    const response = await fetch('http://127.0.0.1:8001/api/v1/auth/login/phone', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        phone: phone,
        code: code
      })
    });
    
    if (!response.ok) {
      throw new Error(`登录失败: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    if (data.code === 0 && data.data) {
      // 保存登录信息
      localStorage.setItem('token', data.data.access_token || '');
      localStorage.setItem('refresh_token', data.data.refresh_token || '');
      localStorage.setItem('user', JSON.stringify(data.data.user || {}));
      
      console.log('=== 登录成功 ===');
      console.log('Token:', data.data.access_token);
      console.log('用户信息:', data.data.user);
      
      // 跳转到首页
      console.log('正在跳转到首页...');
      window.location.href = '/';
    } else {
      throw new Error(`登录失败: ${data.msg || '未知错误'}`);
    }
  } catch (error) {
    console.error('=== 登录失败 ===');
    console.error('错误信息:', error.message);
  }
};

// 3. 模拟微信绑定成功（已登录状态）
window.mockWechatBindSuccess = async () => {
  try {
    const token = localStorage.getItem('token');
    
    if (!token) {
      throw new Error('请先登录账号');
    }
    
    console.log('正在模拟微信绑定...');
    console.log('当前Token:', token);
    
    // 调用绑定接口（模拟）
    // 注意：实际项目中需要实现真实的微信绑定逻辑
    console.log('微信绑定成功！');
    
    // 刷新用户信息或显示成功提示
    window.location.reload();
  } catch (error) {
    console.error('=== 绑定失败 ===');
    console.error('错误信息:', error.message);
  }
};

// 4. 检查当前登录状态
window.checkLoginStatus = () => {
  const token = localStorage.getItem('token');
  const user = localStorage.getItem('user');
  
  console.log('=== 当前登录状态 ===');
  console.log('Token:', token ? '已存在' : '不存在');
  console.log('用户信息:', user ? JSON.parse(user) : '不存在');
};

// 5. 清除登录信息
window.clearLoginStatus = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('refresh_token');
  localStorage.removeItem('user');
  
  console.log('=== 登录信息已清除 ===');
  window.location.reload();
};

// 6. 测试获取微信登录URL
window.testWechatUrl = async () => {
  try {
    const token = localStorage.getItem('token');
    const isLoggedIn = !!token;
    
    // 根据登录状态决定是登录还是绑定
    const apiEndpoint = isLoggedIn ? '/user/bind/wechat/url' : '/auth/login/wechat/url';
    const redirectUri = encodeURIComponent(`http://127.0.0.1:8001/api/auth/wechat/callback`);
    
    console.log('正在获取微信登录URL...');
    console.log('API端点:', apiEndpoint);
    console.log('redirect_uri:', redirectUri);
    
    const response = await fetch(`http://127.0.0.1:8001/api/v1${apiEndpoint}?redirect_uri=${redirectUri}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    });
    
    if (!response.ok) {
      throw new Error(`获取URL失败: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    if (data.code === 0 && data.data && data.data.url) {
      console.log('=== 获取微信登录URL成功 ===');
      console.log('微信登录URL:', data.data.url);
      
      // 解析URL查看redirect_uri是否正确
      const url = new URL(data.data.url);
      const redirectUriParam = url.searchParams.get('redirect_uri');
      console.log('解析出的redirect_uri:', decodeURIComponent(redirectUriParam));
      
      // 检查redirect_uri是否正确
      if (redirectUriParam === encodeURIComponent('http://127.0.0.1:8001/api/auth/wechat/callback')) {
        console.log('✅ redirect_uri参数设置正确！');
      } else {
        console.log('❌ redirect_uri参数设置错误！');
      }
    } else {
      throw new Error(`获取URL失败: ${data.msg || '未知错误'}`);
    }
  } catch (error) {
    console.error('=== 获取微信登录URL失败 ===');
    console.error('错误信息:', error.message);
  }
};

// 自动运行状态检查
checkLoginStatus();

console.log('=== 可用测试函数 ===');
console.log('1. mockWechatLoginSuccess() - 使用测试账号登录');
console.log('2. mockWechatBindSuccess() - 模拟微信绑定（需先登录）');
console.log('3. checkLoginStatus() - 检查当前登录状态');
console.log('4. clearLoginStatus() - 清除登录信息');
console.log('5. testWechatUrl() - 测试获取微信登录URL');
console.log('=== 使用方法 ===');
console.log('在浏览器控制台中输入上述函数名并按回车执行测试');
