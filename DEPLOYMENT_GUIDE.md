# 项目部署指南

## 一、SSH连接远程服务器

### 1. 基本连接命令
```bash
# 格式：ssh [用户名]@[服务器IP或域名]
ssh user@192.168.1.100

# 如果使用密钥认证
ssh -i ~/.ssh/id_rsa user@192.168.1.100
```

### 2. Windows下连接方式
- **PowerShell**：直接使用上述命令
- **PuTTY**：图形化工具，需要配置服务器IP、端口(默认22)和认证方式

### 3. 配置SSH免密登录
```bash
# 本地生成密钥对(如果没有)
ssh-keygen -t rsa -b 4096 -C "your_email@example.com"

# 将公钥复制到服务器
ssh-copy-id user@192.168.1.100
```

## 二、项目部署步骤

### 1. 准备工作
```bash
# 登录服务器后，更新系统包
sudo apt update && sudo apt upgrade -y

# 安装必要工具
sudo apt install -y git curl wget python3-pip python3-venv npm nginx
```

### 2. 克隆项目代码
```bash
# 克隆项目到服务器
git clone https://github.com/your-username/yilaitu.git
cd yilaitu
```

### 3. 后端部署

#### 3.1 创建虚拟环境并安装依赖
```bash
cd backend

# 创建虚拟环境
python3 -m venv venv

# 激活虚拟环境
# Linux/Mac
source venv/bin/activate
# Windows (PowerShell)
.\venv\Scripts\Activate.ps1

# 安装依赖
pip install -r requirements.txt
```

#### 3.2 配置环境变量
```bash
# 创建.env文件并配置环境变量
cp .env.example .env
nano .env

# 在.env文件中添加必要的配置项
# ALIYUN_ACCESS_KEY_ID=your_access_key_id
# ALIYUN_ACCESS_KEY_SECRET=your_access_key_secret
# DATABASE_URL=mysql+pymysql://user:password@localhost/db_name
```

#### 3.3 初始化数据库
```bash
# 创建数据库表
python create_tables.py
```

#### 3.4 启动后端服务
```bash
# 开发环境启动
python start_server.py

# 生产环境推荐使用systemd或gunicorn
# 示例：使用gunicorn
pip install gunicorn
uvicorn main:app --host 0.0.0.0 --port 8000 --workers 4
```

### 4. 前端部署

#### 4.1 安装依赖
```bash
cd ../frontend

# 安装npm依赖
npm install
```

#### 4.2 构建项目
```bash
# 构建生产版本
npm run build
```

#### 4.3 部署静态文件
```bash
# 将构建好的静态文件复制到nginx目录
sudo cp -r dist/* /var/www/html/

# 配置nginx反向代理
# 编辑nginx配置文件
sudo nano /etc/nginx/sites-available/default
```

### 5. Nginx配置示例
```nginx
server {
    listen 80;
    server_name your-domain.com;

    # 前端静态文件
    location / {
        root /var/www/html;
        index index.html;
        try_files $uri $uri/ /index.html;
    }

    # 后端API代理
    location /api {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## 三、自动安装脚本

可以创建一个自动安装脚本`deploy.sh`，一键完成部署：

```bash
#!/bin/bash

# 更新系统
echo "更新系统包..."
sudo apt update && sudo apt upgrade -y

# 安装必要工具
echo "安装必要工具..."
sudo apt install -y git curl wget python3-pip python3-venv npm nginx

# 克隆项目
echo "克隆项目代码..."
git clone https://github.com/your-username/yilaitu.git
cd yilaitu

# 后端部署
echo "部署后端..."
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# 创建.env文件
if [ ! -f .env ]; then
    echo "创建.env文件..."
    cat > .env << EOF
ALIYUN_ACCESS_KEY_ID=
ALIYUN_ACCESS_KEY_SECRET=
DATABASE_URL=mysql+pymysql://root:password@localhost/image_edit
EOF
fi

# 初始化数据库
python create_tables.py

# 启动后端服务
nohup uvicorn main:app --host 0.0.0.0 --port 8000 --workers 4 > backend.log 2>&1 &

# 前端部署
echo "部署前端..."
cd ../frontend
npm install
npm run build

# 部署静态文件
sudo cp -r dist/* /var/www/html/

# 配置nginx
echo "配置nginx..."
sudo cat > /etc/nginx/sites-available/default << EOF
server {
    listen 80;
    server_name localhost;

    location / {
        root /var/www/html;
        index index.html;
        try_files $uri $uri/ /index.html;
    }

    location /api {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF

# 重启nginx
sudo systemctl restart nginx

echo "部署完成！访问 http://your-ip 查看应用"
```

## 四、注意事项

1. **安全配置**：
   - 不要将明文密码或密钥提交到代码仓库
   - 使用环境变量管理敏感信息
   - 生产环境建议配置HTTPS

2. **端口配置**：
   - 确保服务器防火墙已开放必要端口(80, 443, 8000等)
   - 可以使用`ufw`或`firewalld`管理防火墙

3. **数据库配置**：
   - 生产环境建议使用MySQL或PostgreSQL
   - 配置强密码并限制数据库访问权限

4. **日志管理**：
   - 定期检查应用日志
   - 配置日志轮询避免日志文件过大

5. **性能优化**：
   - 使用CDN加速静态资源访问
   - 配置缓存提高应用响应速度
   - 合理配置服务器资源(CPU、内存)
