# 易来图 (yilaitu) - 图片编辑项目

一个基于 React + TypeScript + FastAPI 的图片编辑应用，包含前端和后端完整代码。

## 项目功能

### 前端功能
- 📸 图片上传与预览
- ✂️ 图片编辑工具（裁剪、滤镜、调整尺寸、添加文字、水印等）
- 📊 积分管理与记录查询
- 👤 用户认证与个人信息管理
- 📱 响应式设计，适配各种屏幕尺寸

### 后端功能
- 🔐 用户认证系统（手机号登录、微信登录）
- 🖼️ 图片处理 API
- 📊 积分管理系统
- 💾 数据持久化（SQLite）
- 🛡️ CORS 配置，支持跨域请求

## 技术栈

### 前端
- **React 18** - UI 框架
- **TypeScript** - 类型安全
- **Ant Design** - UI 组件库
- **Zustand** - 状态管理
- **React Router** - 路由管理
- **Axios** - HTTP 请求

### 后端
- **FastAPI** - Web 框架
- **SQLAlchemy** - ORM
- **Pydantic** - 数据验证
- **JWT** - 认证令牌
- **SQLite** - 数据库
- **Redis** - 缓存（预留）

## 项目结构

```
yilaitu/
├── frontend/              # 前端代码
│   ├── src/
│   │   ├── components/   # React 组件
│   │   │   ├── Header.tsx
│   │   │   ├── ImageEdit.tsx
│   │   │   └── PointsRecord.tsx
│   │   ├── stores/       # 状态管理
│   │   │   └── useAuthStore.ts
│   │   ├── App.tsx       # 应用入口
│   │   └── main.tsx      # React DOM 渲染
│   ├── package.json      # 前端依赖
│   └── vite.config.ts    # Vite 配置
├── backend/              # 后端代码
│   ├── app/
│   │   ├── api/          # API 路由
│   │   │   └── v1/       # API v1 版本
│   │   ├── core/         # 核心配置
│   │   ├── database/     # 数据库连接
│   │   ├── models/       # 数据模型
│   │   ├── schemas/      # 数据验证
│   │   └── services/     # 业务逻辑
│   ├── main.py           # FastAPI 入口
│   └── requirements.txt  # 后端依赖
└── README.md             # 项目文档
```

## 快速开始

### 前端启动

```bash
cd frontend
npm install
npm run dev
```

前端服务将在 `http://localhost:5173` 启动。

### 后端启动

```bash
cd backend
pip install -r requirements.txt
python main.py
```

后端服务将在 `http://localhost:8001` 启动，API 文档地址：`http://localhost:8001/docs`

## API 接口

### 认证接口
- `POST /api/v1/auth/login/phone` - 手机号登录
- `GET /api/v1/auth/login/wechat/url` - 获取微信登录 URL
- `POST /api/v1/auth/login/wechat` - 微信登录

### 图片处理接口
- `POST /api/v1/image/upload` - 上传图片
- `POST /api/v1/image/crop` - 裁剪图片
- `POST /api/v1/image/filter` - 应用滤镜
- `POST /api/v1/image/resize` - 调整尺寸
- `POST /api/v1/image/text` - 添加文字
- `POST /api/v1/image/watermark` - 添加水印

### 积分接口
- `GET /api/v1/points` - 获取积分
- `GET /api/v1/points/records` - 获取积分记录

## 配置说明

### 后端配置

创建 `.env` 文件，配置以下环境变量：

```env
# 数据库配置
DATABASE_URL=sqlite:///./image_edit.db

# JWT 密钥
SECRET_KEY=your-secret-key-change-me-in-production
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# 微信登录配置
WECHAT_APP_ID=your-wechat-app-id
WECHAT_APP_SECRET=your-wechat-app-secret
WECHAT_REDIRECT_URI=your-wechat-redirect-uri

# 短信配置（可选）
SMS_ACCESS_KEY_ID=your-sms-access-key
SMS_ACCESS_KEY_SECRET=your-sms-access-secret
```

## 开发说明

### 代码规范
- 前端使用 ESLint + Prettier
- 后端使用 Black + Flake8

### 提交规范

提交信息格式：

```
type(scope): description
```

类型说明：
- `feat` - 新功能
- `fix` - 修复 bug
- `docs` - 文档更新
- `style` - 代码格式
- `refactor` - 代码重构
- `test` - 测试代码
- `chore` - 构建过程或辅助工具的变动

## 部署说明

### 前端部署

1. 构建生产版本：
```bash
cd frontend
npm run build
```

2. 将 `dist` 目录部署到 Nginx 或其他静态文件服务器。

### 后端部署

1. 使用 Gunicorn + Uvicorn：
```bash
cd backend
gunicorn -w 4 -k uvicorn.workers.UvicornWorker main:app
```

2. 配置 Nginx 反向代理：
```nginx
server {
    listen 80;
    server_name your-domain.com;
    
    location /api/ {
        proxy_pass http://127.0.0.1:8001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
    
    location / {
        root /path/to/frontend/dist;
        index index.html;
        try_files $uri $uri/ /index.html;
    }
}
```

## 贡献指南

1. Fork 本仓库
2. 创建特性分支：`git checkout -b feature/AmazingFeature`
3. 提交更改：`git commit -m 'feat: Add some AmazingFeature'`
4. 推送到分支：`git push origin feature/AmazingFeature`
5. 提交 Pull Request

## 许可证

MIT License

## 联系方式

如有问题或建议，请通过 GitHub Issues 反馈。
