# 易来图项目 - 完整部署指南

## 一、项目概述

### 1.1 技术栈
- **前端**：React + TypeScript + Vite
- **后端**：FastAPI + Uvicorn + Python 3
- **Web服务器**：Nginx
- **数据库**：MySQL
- **进程管理**：PM2
- **SSL证书**：Let's Encrypt (Certbot自动化管理)

### 1.2 网络架构
```
用户 → Nginx反向代理 (80/443端口)
      ├─ 静态资源 → 前端静态文件 (/var/www/html/yilaitu)
      └─ API请求 → 后端FastAPI服务 (127.0.0.1:8001)
```

### 1.3 域名规划

#### 方案一：子域名方案（需通配符SSL证书）
- **前端**：`www.yilaitu.com` (主域名)
- **后端API**：`api.yilaitu.com` (子域名)

#### 方案二：单域名路径前缀方案（推荐，适用于单域名SSL证书）
如果您的SSL证书仅支持单个域名（无法使用子域名），推荐使用路径前缀方案：
- **前端**：`www.yilaitu.com` (主域名)
- **后端API**：`www.yilaitu.com/api` (同一域名下的API路径)

**注意**：如果您的SSL证书只支持单域名，无法使用`api.yilaitu.com`子域名，请使用单域名路径前缀方案。

## 二、环境准备

### 2.1 连接云主机
```bash
ssh root@47.99.70.37  # 替换为您的云主机IP
```

### 2.2 系统更新与依赖安装
```bash
# 更新系统包
sudo apt update && sudo apt upgrade -y

# 安装基础依赖
sudo apt install -y git curl wget python3-pip python3-venv npm nginx mysql-server

# 更新npm
sudo npm install -g npm@latest

# 安装PM2
sudo npm install -g pm2
```

### 2.3 项目目录创建
```bash
# 创建项目根目录
mkdir -p /root/projects/yilaitu

# 设置目录权限
chmod -R 755 /root/projects/yilaitu
```

## 三、项目部署

### 3.1 克隆代码
```bash
cd /root/projects/yilaitu
git clone https://github.com/your-username/yilaitu.git
cd yilaitu
```

### 3.2 前端部署
```bash
# 进入前端目录
cd frontend

# 安装依赖
npm install

# 构建生产版本
npm run build

# 创建静态文件目录并复制构建产物
mkdir -p /var/www/html/yilaitu
cp -r dist/* /var/www/html/yilaitu/

# 设置权限
sudo chown -R www-data:www-data /var/www/html/yilaitu
```

### 3.3 前端API地址调整（仅适用于单域名路径前缀方案）

如果使用单域名路径前缀方案，需要调整前端的API调用地址：

```bash
# 编辑前端API配置文件
sudo nano /root/projects/yilaitu/yilaitu/frontend/src/utils/request.js
```

修改API基础地址为相对路径或环境变量：

```javascript
// src/utils/request.js
const service = axios.create({
  baseURL: process.env.REACT_APP_API_BASE_URL || '/api/v1', // 使用相对路径或环境变量
  timeout: 5000,
});
```

创建或修改前端环境变量文件：

```bash
# 创建.env文件
sudo nano /root/projects/yilaitu/yilaitu/frontend/.env
```

```bash
# .env
REACT_APP_API_BASE_URL=https://www.yilaitu.com/api/v1
```

**注意**：修改API地址后需要重新构建前端项目：

```bash
cd /root/projects/yilaitu/frontend
npm run build
cp -r dist/* /var/www/html/yilaitu/
```

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

### 3.4 后端部署
```bash
# 进入后端目录
cd /root/projects/yilaitu/backend

# 创建并激活虚拟环境
python3 -m venv venv
source venv/bin/activate

# 安装依赖
pip install -r requirements.txt

# 配置环境变量
cp .env.example .env
nano .env  # 编辑数据库连接等配置

# 初始化数据库
python create_tables.py

# 启动后端服务
pm2 start start_server.py

# 配置PM2自动重启
pm2 save
pm2 startup
```

## 四、Nginx配置

### 4.1 前端配置 (www.yilaitu.com)

#### 方案一：单域名路径前缀方案（推荐，适用于单域名SSL证书）
```bash
sudo nano /etc/nginx/sites-available/www.yilaitu.com
```

```nginx
server {
    listen 80;
    server_name www.yilaitu.com yilaitu.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl;
    server_name www.yilaitu.com yilaitu.com;

    # SSL证书配置（执行Certbot后自动生成）
    ssl_certificate /etc/letsencrypt/live/www.yilaitu.com/yilaitu.com.pem;  # 完整证书链
    ssl_certificate_key /etc/letsencrypt/live/www.yilaitu.com/yilaitu.com.key;  # 私钥文件
    include /etc/letsencrypt/options-ssl-nginx.conf;  # 推荐的SSL配置选项
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;  # Diffie-Hellman参数，增强安全性

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

#### 方案二：子域名方案（需通配符SSL证书）
如果使用子域名方案，请使用以下配置（不包含API代理，需要单独配置api.yilaitu.com）：

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

    # 支持React路由的历史模式
    location / {
        try_files $uri $uri/ /index.html;
    }

    # 日志配置
    access_log /var/log/nginx/yilaitu_frontend_access.log;
    error_log /var/log/nginx/yilaitu_frontend_error.log;
}
```

### 4.2 后端配置 (api.yilaitu.com) 【仅适用于子域名方案】

**注意**：此配置仅适用于子域名方案。如果您使用单域名路径前缀方案，**请跳过此配置**，并删除可能存在的旧配置（如下文所示）。

```bash
sudo nano /etc/nginx/sites-available/api.yilaitu.com
```

```nginx
server {
    listen 80;
    server_name api.yilaitu.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl;
    server_name api.yilaitu.com;

    # SSL证书将由Certbot自动配置
    ssl_certificate /etc/letsencrypt/live/www.yilaitu.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/www.yilaitu.com/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    # 反向代理到FastAPI后端服务
    location / {
        proxy_pass http://127.0.0.1:8001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # 日志配置
    access_log /var/log/nginx/yilaitu_backend_access.log;
    error_log /var/log/nginx/yilaitu_backend_error.log;
}
```

### 4.3 删除旧的后端Nginx配置 【仅适用于单域名方案】

如果您之前配置过后端子域名且现在切换到单域名方案，请删除旧的后端配置：

```bash
# 删除后端配置文件
sudo rm /etc/nginx/sites-available/api.yilaitu.com

# 删除符号链接
sudo rm /etc/nginx/sites-enabled/api.yilaitu.com
```

### 4.4 启用Nginx配置

#### 方案一：单域名路径前缀方案
```bash
# 创建前端配置符号链接
sudo ln -s /etc/nginx/sites-available/www.yilaitu.com /etc/nginx/sites-enabled/

# 测试配置
sudo nginx -t

# 重启Nginx
sudo systemctl restart nginx
```

#### 方案二：子域名方案
```bash
# 创建符号链接
sudo ln -s /etc/nginx/sites-available/www.yilaitu.com /etc/nginx/sites-enabled/
sudo ln -s /etc/nginx/sites-available/api.yilaitu.com /etc/nginx/sites-enabled/

# 测试配置
sudo nginx -t

# 重启Nginx
sudo systemctl restart nginx
```

### 4.5 SSL证书配置

#### 方案一：单域名证书（适用于单域名路径前缀方案）
```bash
# 安装Certbot
sudo apt install -y certbot python3-certbot-nginx

# 为单域名获取SSL证书
sudo certbot --nginx -d www.yilaitu.com -d yilaitu.com

# 配置证书自动更新
sudo systemctl enable certbot.timer
```

#### 方案二：多域名/通配符证书（适用于子域名方案）
```bash
# 安装Certbot
sudo apt install -y certbot python3-certbot-nginx

# 为域名和子域名获取SSL证书（需要通配符证书支持）
sudo certbot --nginx -d www.yilaitu.com -d yilaitu.com -d api.yilaitu.com

# 配置证书自动更新
sudo systemctl enable certbot.timer
```

**注意**：
1. 如果您的SSL证书仅支持单个域名，无法使用`api.yilaitu.com`子域名，请使用方案一。
2. 通配符证书（如`*.yilaitu.com`）是长期最优方案，支持所有子域名，但可能需要额外成本和时间申请。

## 五、配置文件示例

### 5.1 环境变量配置 (.env.example)
```dotenv
# 项目基本配置
PROJECT_NAME=Unified Login System
API_V1_STR=/api/v1

# 数据库配置
MYSQL_USER=root
MYSQL_PASSWORD=your_database_password
MYSQL_SERVER=127.0.0.1
MYSQL_PORT=3306
MYSQL_DB=image_edit_db

# Redis配置
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_DB=0

# 安全配置
SECRET_KEY=your_secret_key_change_in_production
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=120
REFRESH_TOKEN_EXPIRE_DAYS=7

# 微信配置
WECHAT_APP_ID=your_wechat_app_id
WECHAT_APP_SECRET=your_wechat_app_secret

# 验证码配置
CAPTCHA_EXPIRE_SECONDS=300

# 阿里云配置
ALIYUN_ACCESS_KEY_ID=your_aliyun_access_key_id
ALIYUN_ACCESS_KEY_SECRET=your_aliyun_access_key_secret

# 火山引擎配置
VOLCENGINE_ACCESS_KEY=your_volcengine_access_key
VOLCENGINE_SECRET_KEY=your_volcengine_secret_key
```

### 5.2 PM2配置 (ecosystem.config.js)
```javascript
module.exports = {
  apps: [
    {
      name: 'yilaitu-backend',
      script: 'start_server.py',
      interpreter: '/root/projects/yilaitu/yilaitu/backend/venv/bin/python',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production'
      }
    }
  ]
}
```

## 六、一键部署脚本

```bash
#!/bin/bash

# ---------------------- 部署配置参数 ----------------------
GITHUB_REPO="https://github.com/your-username/yilaitu.git"  # 替换为您的GitHub仓库地址
DOMAIN="yilaitu.com"  # 替换为主域名
DEPLOYMENT_MODE="single_domain"  # 部署模式：single_domain（单域名路径前缀）或 subdomain（子域名）
API_SUBDOMAIN="api"  # 仅在subdomain模式下生效，替换为API子域名
# ------------------------------------------------------

# 输出颜色配置（增强可读性）
GREEN="\033[0;32m"   # 绿色：正常流程
YELLOW="\033[1;33m"  # 黄色：警告信息
NC="\033[0m"        # 无颜色：重置

echo -e "${YELLOW}=== 易来图项目一键部署脚本 ===${NC}"
echo -e "${YELLOW}部署模式：${DEPLOYMENT_MODE}${NC}"

# 1. 系统更新和依赖安装
echo -e "\n${GREEN}1. 更新系统和安装基础依赖${NC}"
echo -e "正在更新系统包..."
sudo apt update && sudo apt upgrade -y
echo -e "正在安装必要工具：git, curl, wget, python3, npm, nginx, mysql..."
sudo apt install -y git curl wget python3-pip python3-venv npm nginx mysql-server

# 2. 更新npm和安装PM2
echo -e "\n${GREEN}2. 更新npm和安装PM2进程管理工具${NC}"
echo -e "正在更新npm到最新版本..."
sudo npm install -g npm@latest
echo -e "正在安装PM2..."
sudo npm install -g pm2

# 3. 创建项目目录结构
echo -e "\n${GREEN}3. 创建项目目录结构${NC}"
echo -e "正在创建项目根目录和静态文件目录..."
mkdir -p /root/projects/yilaitu /var/www/html/yilaitu
echo -e "正在设置目录权限..."
chmod -R 755 /root/projects/yilaitu

# 4. 克隆项目代码
echo -e "\n${GREEN}4. 从GitHub克隆项目代码${NC}"
cd /root/projects/yilaitu
echo -e "正在克隆项目：${GITHUB_REPO}..."
git clone $GITHUB_REPO
echo -e "正在进入项目目录..."
cd yilaitu

# 5. 前端项目部署
echo -e "\n${GREEN}5. 部署前端项目${NC}"
cd frontend
echo -e "正在安装前端依赖..."
npm install
echo -e "正在构建生产版本..."
npm run build
echo -e "正在复制构建产物到Nginx静态目录..."
cp -r dist/* /var/www/html/yilaitu/
echo -e "正在设置静态文件权限..."
sudo chown -R www-data:www-data /var/www/html/yilaitu

# 6. 前端API地址配置（单域名模式下）
if [ "$DEPLOYMENT_MODE" == "single_domain" ]; then
    echo -e "\n${GREEN}6. 配置前端API地址（单域名模式）${NC}"
    
    # 修改前端API配置文件
    API_CONFIG_FILE="/root/projects/yilaitu/yilaitu/frontend/src/utils/request.js"
    if [ -f "$API_CONFIG_FILE" ]; then
        echo -e "正在修改前端API配置文件..."
        sudo sed -i 's|baseURL:.*|baseURL: process.env.REACT_APP_API_BASE_URL || "\/api\/v1",|' "$API_CONFIG_FILE"
    fi
    
    # 创建.env文件
    echo -e "正在创建前端环境变量文件..."
    sudo cat > /root/projects/yilaitu/yilaitu/frontend/.env << EOF
REACT_APP_API_BASE_URL=https://www.$DOMAIN/api/v1
EOF
    
    # 重新构建前端
    echo -e "正在重新构建前端..."
    npm run build
    echo -e "正在复制最新构建产物..."
    cp -r dist/* /var/www/html/yilaitu/
fi

# 7. 后端项目部署
echo -e "\n${GREEN}7. 部署后端项目${NC}"
cd ../backend
echo -e "正在创建Python虚拟环境..."
python3 -m venv venv
echo -e "正在激活虚拟环境..."
source venv/bin/activate
echo -e "正在安装后端依赖..."
pip install -r requirements.txt

# 配置环境变量
echo -e "正在配置环境变量..."
if [ ! -f .env ]; then
    cp .env.example .env
    echo -e "\n${YELLOW}⚠️  请手动编辑 backend/.env 文件配置数据库连接、密钥等参数！${NC}"
fi

echo -e "正在初始化数据库..."
python create_tables.py

# 8. 启动后端服务
echo -e "\n${GREEN}8. 启动后端服务${NC}"
echo -e "正在使用PM2启动后端服务..."
# 使用已激活的虚拟环境启动服务
pm2 start start_server.py
echo -e "正在保存PM2进程列表..."
pm2 save
echo -e "正在配置PM2开机自启..."
pm2 startup

# 9. Nginx配置
echo -e "\n${GREEN}9. 配置Nginx反向代理${NC}"

if [ "$DEPLOYMENT_MODE" == "single_domain" ]; then
    # 创建单域名Nginx配置
    echo -e "正在创建单域名Nginx配置文件..."
    sudo cat > /etc/nginx/sites-available/www.$DOMAIN << EOF
server {
    listen 80;
    server_name www.$DOMAIN $DOMAIN;
    root /var/www/html/yilaitu;
    index index.html index.htm;
    
    # API路径代理
    location /api/ {
        proxy_pass http://127.0.0.1:8001/;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
    
    # 支持React路由
    location / {
        try_files \$uri \$uri/ /index.html;
    }
    
    access_log /var/log/nginx/${DOMAIN}_frontend_access.log;
    error_log /var/log/nginx/${DOMAIN}_frontend_error.log;
}
EOF
    
    # 启用配置
    echo -e "正在启用Nginx配置..."
    sudo ln -sf /etc/nginx/sites-available/www.$DOMAIN /etc/nginx/sites-enabled/
    
else
    # 创建前端Nginx配置
    echo -e "正在创建前端Nginx配置文件..."
    sudo cat > /etc/nginx/sites-available/www.$DOMAIN << EOF
server {
    listen 80;
    server_name www.$DOMAIN $DOMAIN;
    root /var/www/html/yilaitu;
    index index.html index.htm;
    location / {
        try_files \$uri \$uri/ /index.html;
    }
    access_log /var/log/nginx/${DOMAIN}_frontend_access.log;
    error_log /var/log/nginx/${DOMAIN}_frontend_error.log;
}
EOF
    
    # 创建后端Nginx配置
    echo -e "正在创建后端Nginx配置文件..."
    sudo cat > /etc/nginx/sites-available/$API_SUBDOMAIN.$DOMAIN << EOF
server {
    listen 80;
    server_name $API_SUBDOMAIN.$DOMAIN;
    location / {
        proxy_pass http://127.0.0.1:8001;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
    access_log /var/log/nginx/${DOMAIN}_backend_access.log;
    error_log /var/log/nginx/${DOMAIN}_backend_error.log;
}
EOF
    
    # 启用配置
    echo -e "正在启用Nginx配置..."
    sudo ln -sf /etc/nginx/sites-available/www.$DOMAIN /etc/nginx/sites-enabled/
    sudo ln -sf /etc/nginx/sites-available/$API_SUBDOMAIN.$DOMAIN /etc/nginx/sites-enabled/
fi

# 测试和重启Nginx
echo -e "正在测试Nginx配置..."
sudo nginx -t
echo -e "正在重启Nginx服务..."
sudo systemctl restart nginx

# 10. SSL证书配置（可选）
echo -e "\n${GREEN}10. SSL证书配置 (可选)${NC}"
echo -e "${YELLOW}提示：配置SSL可以启用HTTPS访问，增强网站安全性${NC}"
echo -e "如需配置SSL证书，请执行以下命令："

if [ "$DEPLOYMENT_MODE" == "single_domain" ]; then
    echo -e "  ${YELLOW}sudo apt install -y certbot python3-certbot-nginx${NC}"
    echo -e "  ${YELLOW}sudo certbot --nginx -d www.$DOMAIN -d $DOMAIN${NC}"
else
    echo -e "  ${YELLOW}sudo apt install -y certbot python3-certbot-nginx${NC}"
    echo -e "  ${YELLOW}sudo certbot --nginx -d www.$DOMAIN -d $DOMAIN -d $API_SUBDOMAIN.$DOMAIN${NC}"
fi

# 部署完成提示
echo -e "\n${GREEN}========================================${NC}"
echo -e "${GREEN}=== 易来图项目部署完成！===${NC}"
echo -e "${GREEN}========================================${NC}"

if [ "$DEPLOYMENT_MODE" == "single_domain" ]; then
    echo -e "前端访问地址: ${YELLOW}http://www.$DOMAIN${NC}"
    echo -e "后端API地址: ${YELLOW}http://www.$DOMAIN/api${NC}"
else
    echo -e "前端访问地址: ${YELLOW}http://www.$DOMAIN${NC}"
    echo -e "后端API地址: ${YELLOW}http://$API_SUBDOMAIN.$DOMAIN${NC}"
fi

echo -e "\n${YELLOW}注意：${NC}"
echo -e "1. 请确保已正确配置.env文件中的数据库连接信息"
echo -e "2. 如需HTTPS访问，请按照上方提示配置SSL证书"
echo -e "3. 可使用 pm2 status 查看后端服务状态"
echo -e "4. 可使用 sudo systemctl status nginx 查看Nginx状态"
echo -e "${GREEN}========================================${NC}"
```

## 七、部署验证

### 7.1 服务状态检查
```bash
# 检查Nginx状态
sudo systemctl status nginx

# 检查PM2进程状态
pm2 status

# 检查MySQL状态
sudo systemctl status mysql
```

### 7.2 前端访问验证
```bash
# 检查前端静态文件
curl -I http://www.yilaitu.com
```

### 7.3 后端API验证

#### 方案一：单域名路径前缀方案
```bash
# 检查API服务
curl -I http://www.yilaitu.com/api

# 检查健康检查端点（如果有）
curl http://www.yilaitu.com/api/health

# 检查API版本端点（如果有）
curl http://www.yilaitu.com/api/v1
```

#### 方案二：子域名方案
```bash
# 检查后端服务
curl -I http://api.yilaitu.com

# 检查健康检查端点（如果有）
curl http://api.yilaitu.com/health

# 检查API版本端点（如果有）
curl http://api.yilaitu.com/api/v1
```

## 八、常见问题与解决方案

### 8.1 前端路由问题
**问题**：刷新页面后出现404错误
**解决方案**：确保Nginx配置中包含 `try_files $uri $uri/ /index.html;` 以支持React路由的历史模式

### 8.2 后端连接问题
**问题**：前端无法连接到后端API
**解决方案**：
- 检查后端服务状态：`pm2 status`
- 检查Nginx反向代理配置
  - 单域名方案：确保Nginx前端配置中包含`location /api/`代理配置
  - 子域名方案：确保Nginx后端配置正确
- 检查前端API配置
  - 单域名方案：确保前端`request.js`中的`baseURL`设置为`/api/v1`或环境变量`REACT_APP_API_BASE_URL`
  - 子域名方案：确保前端API地址指向`http://api.yilaitu.com/api/v1`
- 检查CORS设置是否允许前端域名访问

### 8.3 数据库连接问题
**问题**：后端无法连接到数据库
**解决方案**：
- 检查MySQL服务状态：`sudo systemctl status mysql`
- 验证.env文件中的数据库配置
- 确保数据库用户具有正确的权限

### 8.4 SSL证书问题
**问题**：浏览器显示证书错误
**解决方案**：
- 确保域名解析正确指向云主机IP
- 检查Certbot证书安装状态
- 等待DNS解析生效（通常需要几分钟到几小时）

### 8.5 端口占用问题
**问题**：端口被占用导致服务无法启动
**解决方案**：
- 检查端口占用：`lsof -i :8001`
- 停止占用端口的进程：`kill -9 <PID>`
- 重新启动服务