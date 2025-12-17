# 单域名SSL证书部署方案

由于您的SSL证书只支持单域名，无法使用`api.yilaitu.com`子域名部署后端服务，以下是几种可行的解决方案：

## 一、方案比较

| 方案 | 描述 | 优点 | 缺点 |
|------|------|------|------|
| **路径前缀方案** | 使用同一域名的不同路径区分前后端 | 配置简单，用户体验好 | 需要调整前端API调用地址 |
| **端口区分方案** | 使用不同端口区分前后端 | 配置相对简单 | 需要开放额外端口，用户体验较差 |
| **子目录方案** | 使用子目录部署前端 | 配置复杂 | 可能影响前端路由 |
| **申请通配符证书** | 更换为支持所有子域名的证书 | 长期最优方案 | 需要额外成本和时间 |

## 二、推荐方案：路径前缀方案

使用`www.yilaitu.com`域名，通过路径区分前后端：
- 前端：`https://www.yilaitu.com/`
- 后端API：`https://www.yilaitu.com/api/`

### 1. 修改Nginx配置

```bash
# 编辑前端Nginx配置文件
sudo nano /etc/nginx/sites-available/www.yilaitu.com
```

修改配置，添加API路径代理：

```nginx
server {
    listen 80;
    server_name www.yilaitu.com yilaitu.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl;
    server_name www.yilaitu.com yilaitu.com;

    # SSL证书配置
    ssl_certificate /etc/letsencrypt/live/www.yilaitu.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/www.yilaitu.com/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    # 前端静态文件根目录
    root /var/www/html/yilaitu;
    index index.html index.htm;

    # API路径代理到后端服务
    location /api/ {
        proxy_pass http://127.0.0.1:8001/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # 支持React路由的历史模式
    location / {
        try_files $uri $uri/ /index.html;
    }

    # 日志配置
    access_log /var/log/nginx/yilaitu_frontend_access.log;
    error_log /var/log/nginx/yilaitu_frontend_error.log;
}
```

### 2. 删除原有的后端Nginx配置

```bash
# 删除后端配置文件
sudo rm /etc/nginx/sites-available/api.yilaitu.com

# 删除符号链接
sudo rm /etc/nginx/sites-enabled/api.yilaitu.com
```

### 3. 测试并重启Nginx

```bash
# 测试Nginx配置
sudo nginx -t

# 重启Nginx服务
sudo systemctl restart nginx
```

### 4. 调整前端API调用地址

修改前端项目中的API配置文件（`src/utils/request.js`），将硬编码的API地址改为相对路径或环境变量：

```javascript
// src/utils/request.js
const service = axios.create({
  baseURL: process.env.REACT_APP_API_BASE_URL || '/api/v1', // 使用相对路径或环境变量
  timeout: 5000,
});
```

如果需要使用环境变量，可以在前端项目根目录创建`.env`文件：

```bash
# .env
REACT_APP_API_BASE_URL=https://www.yilaitu.com/api/v1
```

### 5. 重新构建前端项目

```bash
# 进入前端目录
cd /path/to/frontend

# 安装依赖（如果尚未安装）
npm install

# 重新构建生产版本
npm run build

# 复制构建产物到静态文件目录
cp -r dist/* /var/www/html/yilaitu/
```

### 6. 验证部署

```bash
# 验证前端访问
curl -I https://www.yilaitu.com

# 验证API访问（健康检查）
curl https://www.yilaitu.com/api/health

# 验证API访问（示例端点）
curl https://www.yilaitu.com/api/v1/users
```

## 四、配置示例补充

### 1. PM2后端服务配置

确保后端服务使用正确的端口（8001）和路径运行：

```bash
# PM2配置文件示例（ecosystem.config.js）
module.exports = {
  apps: [
    {
      name: 'yilaitu-backend',
      script: '/path/to/backend/main.py',
      interpreter: 'python3',
      args: [],
      watch: false,
      autorestart: true,
      max_restarts: 10,
      restart_delay: 5000,
      env: {
        NODE_ENV: 'production',
        PYTHONPATH: '/path/to/backend'
      }
    }
  ]
}
```

### 2. 后端环境变量配置

```bash
# 后端.env文件示例
MYSQL_USER=root
MYSQL_PASSWORD=your_password
MYSQL_SERVER=127.0.0.1
MYSQL_PORT=3306
MYSQL_DB=image_edit_db

REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_DB=0

SECRET_KEY=your_secret_key
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=120
REFRESH_TOKEN_EXPIRE_DAYS=7
```

### 3. 前端构建命令优化

为了简化部署流程，可以在前端package.json中添加部署脚本：

```json
{
  "scripts": {
    "build": "vite build",
    "deploy": "npm run build && cp -r dist/* /var/www/html/yilaitu/"
  }
}
```

使用时只需运行：
```bash
npm run deploy
```

## 四、其他方案说明

### 1. 端口区分方案

如果您选择使用端口区分方案，可以按照以下步骤配置：

```nginx
# 在现有Nginx配置中添加后端端口监听
server {
    listen 8443 ssl;
    server_name www.yilaitu.com;

    # SSL证书配置（与前端相同）
    ssl_certificate /etc/letsencrypt/live/www.yilaitu.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/www.yilaitu.com/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    # 反向代理到后端服务
    location / {
        proxy_pass http://127.0.0.1:8001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### 2. 申请通配符证书

如果您有长期使用需求，建议申请通配符SSL证书（如`*.yilaitu.com`），这样可以支持所有子域名。申请步骤：

```bash
# 安装Certbot
sudo apt install -y certbot python3-certbot-nginx

# 申请通配符证书（需要DNS验证）
sudo certbot --server https://acme-v02.api.letsencrypt.org/directory --manual --preferred-challenges dns -d "*.yilaitu.com" -d yilaitu.com
```

## 五、方案总结与选择建议

### 各方案优缺点总结

| 方案 | 优点 | 缺点 | 适用场景 |
|------|------|------|----------|
| **路径前缀方案** | - 配置简单，仅需修改Nginx和前端API地址<br>- 用户体验好，无需记忆额外端口或域名<br>- 搜索引擎友好，有利于SEO<br>- 无需额外的端口开放 | - 需要调整前端API调用地址<br>- 部分前端框架路由可能需要额外配置 | 推荐：适用于大多数单域名SSL证书限制场景 |
| **端口区分方案** | - 配置相对简单<br>- 前后端完全隔离<br>- 无需修改前端API调用逻辑 | - 用户体验较差，需要记忆额外端口<br>- 需要开放额外端口，增加安全风险<br>- 部分网络环境可能限制非标准端口访问 | 临时方案：适用于开发或测试环境，不推荐生产环境 |
| **子目录方案** | - 保持单一域名<br>- 可以使用相同的SSL证书 | - 配置复杂，需要修改前端路由和Nginx配置<br>- 可能影响前端路由的正常工作<br>- 对搜索引擎不友好 | 不推荐：配置复杂且容易出现问题 |
| **申请通配符证书** | - 长期最优方案<br>- 支持所有子域名<br>- 用户体验最佳<br>- 无需修改现有代码 | - 需要额外成本<br>- 需要时间申请和配置<br>- 可能需要域名验证 | 长期方案：如果您有长期使用需求且预算允许，建议最终采用此方案 |

### 选择建议

1. **优先选择：路径前缀方案**
   - 最适合当前场景，配置简单且用户体验好
   - 不需要额外成本，立即可以实施
   - 对现有代码的修改最少

2. **长期规划：申请通配符证书**
   - 如果您的项目有长期发展规划，建议在条件允许时申请通配符证书
   - 通配符证书可以支持所有子域名，为未来的扩展提供更大的灵活性

3. **避免使用：子目录方案**
   - 配置复杂，容易出现路由冲突等问题
   - 对搜索引擎不友好，影响网站的SEO效果

4. **临时使用：端口区分方案**
   - 仅建议在开发或测试环境中临时使用
   - 生产环境中不推荐，因为用户体验较差且存在安全风险

### 实施步骤回顾

无论您选择哪种方案，以下是实施的基本步骤：

1. **修改Nginx配置**：根据选择的方案配置Nginx反向代理
2. **调整前端配置**：修改前端API调用地址（路径前缀方案需要）
3. **重新构建前端**：确保前端使用最新的配置
4. **重启服务**：重启Nginx和后端服务
5. **验证部署**：确保前后端都能正常访问

如果您有任何疑问或需要进一步的帮助，请随时咨询。