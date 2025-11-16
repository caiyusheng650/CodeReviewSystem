# 智能代码审查系统

## 项目简介

智能代码审查系统是一个基于AI的自动化代码审查工具，旨在帮助开发团队提高代码质量和审查效率。该系统通过GitHub Actions集成，能够自动分析Pull Request中的代码变更，并提供详细的审查反馈。

## 核心功能

- **自动化代码审查**：当创建或更新Pull Request时，自动触发代码审查流程
- **多维度问题检测**：识别代码中的潜在问题，包括：
  - 静态缺陷（未使用的变量、代码规范等）
  - 逻辑缺陷（潜在的错误、异常处理缺失等）
  - 安全漏洞（XSS、SQL注入风险等）
- **详细的问题报告**：为每个发现的问题提供具体位置、描述和修复建议
- **用户友好的Web界面**：提供注册、登录、设置等完整的用户功能
- **API密钥管理**：安全地管理访问凭证

## 技术架构

### 前端
- **框架**：React 18 + Vite
- **UI库**：Material-UI (MUI)
- **路由**：React Router v7
- **状态管理**：React Context API
- **构建工具**：Vite

### 后端
- **框架**：FastAPI (Python)
- **数据库**：MongoDB (通过Motor驱动)
- **认证**：JWT Token
- **部署**：Uvicorn ASGI服务器

### CI/CD集成
- **平台**：GitHub Actions
- **触发事件**：Pull Request (opened, synchronize, reopened)

## 项目结构

```
.
├── backend/              # 后端服务
│   ├── app/             # 应用核心代码
│   │   ├── models/      # 数据模型
│   │   ├── routers/     # API路由
│   │   ├── schemas/     # 数据验证模式
│   │   ├── services/    # 业务逻辑
│   │   └── utils/       # 工具函数
│   ├── main.py          # 应用入口
│   └── requirements.txt # Python依赖
├── frontend/            # 前端应用
│   ├── src/             # 源代码
│   │   ├── components/  # 可复用组件
│   │   ├── pages/       # 页面组件
│   │   ├── contexts/    # React上下文
│   │   ├── services/    # API服务
│   │   └── theme/       # 主题配置
│   └── package.json     # Node.js依赖
├── .github/workflows/   # GitHub Actions工作流
└── README.md            # 项目说明文档
```

## 快速开始

### 后端服务启动

1. 进入后端目录：
   ```bash
   cd backend
   ```

2. 安装Python依赖：
   ```bash
   pip install -r requirements.txt
   ```

3. 配置环境变量（复制`.env.example`为`.env`并修改相应值）：
   ```bash
   cp .env.example .env
   ```

4. 启动服务：
   ```bash
   python main.py
   ```
   或使用：
   ```bash
   uvicorn main:app --reload
   ```

### 前端应用启动

1. 进入前端目录：
   ```bash
   cd frontend
   ```

2. 安装Node.js依赖：
   ```bash
   npm install
   ```

3. 启动开发服务器：
   ```bash
   npm run dev
   ```

## API接口

### 认证相关
- `POST /api/auth/register` - 用户注册
- `POST /api/auth/login` - 用户登录

### 代码审查相关
- `POST /api/codereview/review` - 接收代码审查请求
- `GET /api/codereview/health` - 健康检查

### API密钥管理
- `POST /api/apikeys` - 创建API密钥
- `GET /api/apikeys` - 列出所有API密钥
- `PUT /api/apikeys/{apikey}/disable` - 禁用API密钥
- `PUT /api/apikeys/{apikey}/enable` - 启用API密钥
- `DELETE /api/apikeys/{apikey}` - 删除API密钥

## GitHub Actions集成

系统通过GitHub Actions工作流自动审查Pull Request：

1. 当创建或更新PR时自动触发
2. 生成代码差异(diff)
3. 发送请求到后端API进行分析
4. 在PR中添加审查评论

需要在仓库中配置以下Secrets：
- `CODE_REVIEW_API_URL` - 后端API地址
- `CODE_REVIEW_API_TOKEN` - API访问令牌

## 开发指南

### 代码规范

- 前端遵循ESLint规则
- 后端遵循Python PEP8规范
- 提交前请运行相应的lint检查

### 扩展功能

1. **添加新的审查规则**：
   - 在后端`codereview`路由中扩展分析逻辑
   - 返回符合GitHub Actions期望格式的结果

2. **添加新的API端点**：
   - 在`backend/app/routers/`目录下创建新的路由文件
   - 在`main.py`中注册新路由

## 部署说明

### 后端部署

推荐使用以下方式部署：
1. 使用Docker容器化部署
2. 使用云服务（如Heroku、AWS、阿里云等）
3. 使用Gunicorn作为WSGI服务器

### 前端部署

1. 构建生产版本：
   ```bash
   npm run build
   ```
2. 部署构建产物到静态文件服务器

## 贡献指南

欢迎提交Issue和Pull Request来改进这个项目！

1. Fork项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启Pull Request

## 许可证

本项目采用MIT许可证 - 查看[LICENSE](LICENSE)文件了解详情

## 联系方式

项目链接: [https://github.com/yourusername/CodeReviewSystem](https://github.com/yourusername/CodeReviewSystem)