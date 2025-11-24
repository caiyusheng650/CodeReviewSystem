# 智能代码审查系统 (AI Code Review System)

一个基于AI的智能代码审查系统，通过GitHub Actions集成，为开发团队提供自动化的代码质量分析和审查服务。

## 🌟 特性

### 核心功能
- **AI驱动的代码审查** - 使用多Agent架构进行深度代码分析
- **GitHub Actions集成** - 自动触发PR审查流程
- **多维度代码质量评估** - 涵盖安全、性能、可维护性等7个维度
- **开发者信誉系统** - 基于历史表现评估代码质量
- **实时聊天助手** - 提供代码改进建议和问题解答

### 技术特色
- **现代化技术栈** - FastAPI + React + MongoDB
- **多语言支持** - 完整的中英文国际化
- **响应式设计** - Material-UI打造的现代化界面
- **RESTful API** - 标准化的API设计
- **容器化部署** - 支持Docker部署

## 🏗️ 系统架构

### 前端 (Frontend)
- **框架**: React 19 + Vite
- **UI组件库**: Material-UI (MUI)
- **状态管理**: React Context
- **路由**: React Router DOM
- **国际化**: i18next
- **HTTP客户端**: Axios

### 后端 (Backend)
- **框架**: FastAPI
- **数据库**: MongoDB
- **认证**: JWT + API密钥
- **AI引擎**: AutoGen多Agent系统
- **异步处理**: Async/Await
- **文档**: OpenAPI自动生成

### AI审查维度
1. **静态分析** - 代码规范、命名约定
2. **逻辑缺陷** - 逻辑错误、分支覆盖
3. **内存安全** - 内存泄漏、资源管理
4. **安全漏洞** - 安全风险、注入攻击
5. **性能优化** - 性能瓶颈、算法效率
6. **可维护性** - 代码结构、复杂度
7. **架构设计** - 设计模式、模块划分

## 🚀 快速开始

### 环境要求
- Python 3.9+
- Node.js 18+
- MongoDB 5.0+
- Git

### 安装步骤

#### 1. 克隆项目
```bash
git clone <repository-url>
cd CodeReviewSystem
```

#### 2. 后端设置
```bash
cd backend

# 安装Python依赖
pip install -r requirements.txt

# 配置环境变量
cp .env.example .env
# 编辑.env文件，配置数据库连接和AI服务

# 启动后端服务
python main.py
```

#### 3. 前端设置
```bash
cd frontend

# 安装Node.js依赖
npm install

# 启动开发服务器
npm run dev
```

#### 4. 访问系统
- 前端地址: http://localhost:5173
- 后端API: http://localhost:8000
- API文档: http://localhost:8000/docs

## 📋 使用指南

### GitHub Actions集成

#### 1. 安装GitHub Workflow
```bash
# 使用安装脚本自动配置
curl -s "http://your-api-domain/api/install/workflow/install.sh" | bash
```

#### 2. 配置GitHub Secrets
在仓库设置中添加以下secrets：
- `CODE_REVIEW_API_TOKEN`: 您的API密钥
- `CODE_REVIEW_API_URL`: API服务地址

#### 3. 创建Pull Request
系统将在PR创建时自动触发AI代码审查。

### Web界面使用

#### 审查记录
- 查看所有代码审查历史
- 按状态、仓库、作者筛选
- 导出审查报告

#### 审查详情
- 多维度问题分类展示
- 代码片段对比查看
- 智能聊天助手交互

#### 设置管理
- API密钥管理
- 团队配置
- 个性化设置

## 🔧 API接口

### 认证相关
- `POST /api/auth/login` - 用户登录
- `POST /api/auth/register` - 用户注册
- `GET /api/auth/me` - 获取当前用户信息

### 代码审查
- `POST /api/codereview/` - 提交代码审查
- `GET /api/codereview/{review_id}` - 获取审查详情
- `GET /api/codereview/` - 获取审查列表

### API密钥管理
- `POST /api/apikeys/` - 创建API密钥
- `GET /api/apikeys/` - 获取密钥列表
- `DELETE /api/apikeys/{key_id}` - 删除API密钥

### 信誉系统
- `GET /api/reputation/{user_id}` - 获取用户信誉信息
- `GET /api/reputation/leaderboard` - 信誉排行榜

## 🗂️ 项目结构

```
CodeReviewSystem/
├── backend/                 # 后端服务
│   ├── app/
│   │   ├── models/          # 数据模型
│   │   ├── routers/         # API路由
│   │   ├── services/        # 业务逻辑
│   │   ├── source/          # 静态资源
│   │   └── utils/           # 工具函数
│   ├── main.py             # 应用入口
│   └── requirements.txt     # Python依赖
├── frontend/               # 前端应用
│   ├── src/
│   │   ├── components/     # React组件
│   │   ├── pages/          # 页面组件
│   │   ├── services/       # API服务
│   │   ├── contexts/       # 状态管理
│   │   └── utils/          # 工具函数
│   ├── package.json        # Node.js依赖
│   └── vite.config.js      # Vite配置
└── .github/workflows/      # GitHub Actions
    ├── ai-review.yml       # 主工作流
    └── docs.txt            # 文档说明
```

## 🔒 安全特性

- **API密钥认证** - 所有API请求需要有效密钥
- **JWT令牌** - 用户会话管理
- **CORS配置** - 跨域请求控制
- **输入验证** - 请求参数验证
- **错误处理** - 安全的错误信息返回

## 🚀 部署

### 开发环境
```bash
# 后端
cd backend && python main.py

# 前端
cd frontend && npm run dev
```

### 生产环境
```bash
# 使用Docker部署
docker-compose up -d

# 或使用PM2管理进程
pm2 start ecosystem.config.js
```

## 🤝 贡献指南

我们欢迎社区贡献！请遵循以下步骤：

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 创建Pull Request

### 开发规范
- 遵循PEP 8 (Python)和ESLint (JavaScript)代码规范
- 编写单元测试
- 更新相关文档
- 使用有意义的提交信息

## 📄 许可证

本项目采用MIT许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 📞 支持与联系

- 项目文档: [查看文档](docs/)
- 问题反馈: [GitHub Issues](issues)
- 邮箱支持: support@codereview.example.com
- 社区讨论: [Discord频道](discord-link)

## 🙏 致谢

感谢以下开源项目的支持：
- [FastAPI](https://fastapi.tiangolo.com/) - 高性能Python Web框架
- [React](https://reactjs.org/) - 用户界面库
- [Material-UI](https://mui.com/) - React组件库
- [AutoGen](https://microsoft.github.io/autogen/) - 多Agent框架
- [MongoDB](https://www.mongodb.com/) - 文档数据库

---

**智能代码审查系统** - 让代码审查更智能、更高效！ 🚀