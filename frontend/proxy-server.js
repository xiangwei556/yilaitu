import http from 'http';
import httpProxy from 'http-proxy';

// 创建代理服务器实例
const proxy = httpProxy.createProxyServer({
  target: 'http://localhost:8080',
  changeOrigin: true
});

// 创建HTTP服务器来监听80端口
const server = http.createServer((req, res) => {
  const host = req.headers.host;
  
  // 只代理yilaitu.com的请求
  if (host === 'yilaitu.com' || host === 'yilaitu.com:80') {
    proxy.web(req, res);
  } else {
    // 其他请求返回404
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
  }
});

// 监听80端口
server.listen(80, '0.0.0.0', () => {
  console.log('Proxy server running on port 80');
  console.log('Only yilaitu.com requests are proxied to http://localhost:8080');
});

// 处理代理错误
proxy.on('error', (err, req, res) => {
  res.writeHead(500, { 'Content-Type': 'text/plain' });
  res.end('Proxy Error');
});
