# 智能代码审查系统 - 后端API文档

## 概述

智能代码审查系统是一个基于FastAPI的后端服务，提供用户认证、API密钥管理、代码审查等功能。服务运行在端口8000上。

## API端点总览

### 认证相关接口 (前缀: `/api/auth`)

#### 1. POST `/api/auth/login`
- **功能**: 用户登录
- **输入参数**:
  - `form_data`: OAuth2PasswordRequestForm (包含username和password字段)
- **输出内容**:
  ```json
  {
    "access_token": "JWT令牌",
    "token_type": "bearer",
    "user": {
      "_id": "用户ID",
      "email": "用户邮箱",
      "username": "用户名"
    }
  }
  ```

#### 2. POST `/api/auth/register`
- **功能**: 用户注册
- **输入参数**:
  - `user_data`: UserCreate模型
    - `email`: 邮箱地址
    - `username`: 用户名
    - `password`: 密码
- **输出内容**:
  ```json
  {
    "_id": "用户ID",
    "email": "用户邮箱",
    "username": "用户名"
  }
  ```

#### 3. GET `/api/auth/me`
- **功能**: 获取当前用户信息
- **认证要求**: 需要Bearer Token
- **输出内容**:
  ```json
  {
    "_id": "用户ID",
    "email": "用户邮箱",
    "username": "用户名"
  }
  ```

### API密钥管理接口 (前缀: `/api/apikeys`)

#### 1. POST `/api/apikeys/create`
- **功能**: 创建新的API密钥
- **认证要求**: 需要Bearer Token
- **输入参数**:
  - `name`: 可选，API密钥名称/描述
  - `expires_in`: 可选，过期时间（天，1-365）
- **输出内容**:
  ```json
  {
    "id": "API密钥ID",
    "key": "完整的API密钥（仅在创建时显示）",
    "name": "密钥名称",
    "created_at": "创建时间",
    "expires_at": "过期时间"
  }
  ```

#### 2. GET `/api/apikeys/list` 或 `/api/apikeys/`
- **功能**: 获取当前用户的所有API密钥
- **认证要求**: 需要Bearer Token
- **输出内容**: API密钥列表（不包含完整密钥，仅预览）

#### 3. GET `/api/apikeys/{apikey_id}`
- **功能**: 获取单个API密钥的详细信息
- **认证要求**: 需要Bearer Token
- **输入参数**:
  - `apikey_id`: API密钥ID
- **输出内容**: API密钥详情（不包含完整密钥）

#### 4. PUT `/api/apikeys/{apikey_id}/status`
- **功能**: 更新API密钥状态
- **认证要求**: 需要Bearer Token
- **输入参数**:
  - `apikey_id`: API密钥ID
  - `status_update`: ApiKeyStatusUpdate模型
    - `status`: 状态（active/inactive/revoked）
- **输出内容**: 更新后的API密钥信息

#### 5. DELETE `/api/apikeys/{apikey_id}`
- **功能**: 删除API密钥
- **认证要求**: 需要Bearer Token
- **输入参数**:
  - `apikey_id`: API密钥ID
  - `confirm`: ApiKeyDelete模型
    - `confirm_delete`: 确认删除标志
- **输出内容**: 删除成功消息

### 代码审查接口 (前缀: `/api/codereview`)

#### 1. POST `/api/codereview/review`
- **功能**: 提交代码进行AI审查
- **认证要求**: 需要Bearer Token或API密钥
- **输入参数**:
  - `payload`: CodeReviewPayload模型
    - `diff_base64`: Base64编码的代码差异
    - `pr_title_b64`: Base64编码的PR标题
    - `pr_description_b64`: Base64编码的PR描述
    - `file_paths_b64`: Base64编码的文件路径列表
    - `repo_name_b64`: Base64编码的仓库名称
    - `commit_hash_b64`: Base64编码的提交哈希
- **输出内容**: 代码审查结果

#### 2. GET `/api/codereview/reviews`
- **功能**: 获取代码审查历史记录
- **认证要求**: 需要Bearer Token或API密钥
- **输出内容**: 代码审查记录列表

#### 3. GET `/api/codereview/review-latest`
- **功能**: 获取当前授权用户的最近一条代码审查记录
- **认证要求**: 需要Bearer Token
- **输入参数**: 无（自动从认证信息中获取当前用户）
- **输出内容**: 
  ```json
  {
    "_id": "审查记录ID",
    "github_action_id": "GitHub Action ID",
    "pr_number": "PR编号",
    "repo_owner": "仓库所有者",
    "repo_name": "仓库名称",
    "author": "作者",
    "diff_content": "代码差异内容",
    "pr_title": "PR标题",
    "pr_body": "PR描述",
    "readme_content": "README内容",
    "comments": "评论列表",
    "status": "审查状态",
    "agent_outputs": "Agent输出列表",
    "final_result": "最终审查结果",
    "created_at": "创建时间",
    "updated_at": "更新时间",
    "user_name": "用户名"
  }
  ```
- **错误响应**:
  - `401 Unauthorized`: 未认证用户
  - `404 Not Found`: 用户暂无审查记录
  - `500 Internal Server Error`: 服务器内部错误

### 信誉查询接口 (前缀: `/api`)

#### 1. GET `/api/reputation`
- **功能**: 获取当前用户的信誉分数
- **认证要求**: 需要Bearer Token
- **输出内容**: 用户信誉信息

#### 2. GET `/api/reputation/history`
- **功能**: 获取当前用户的信誉历史记录
- **认证要求**: 需要Bearer Token
- **输出内容**: 信誉历史记录列表

#### 3. GET `/api/reputation/leaderboard`
- **功能**: 获取信誉排行榜
- **认证要求**: 需要Bearer Token
- **输出内容**: 信誉排行榜数据

### 安装相关接口 (前缀: `/install`)

#### 1. GET `/install/workflow`
- **功能**: 获取GitHub Actions工作流文件
- **输出内容**: GitHub Actions工作流YAML内容

#### 2. GET `/install/script`
- **功能**: 获取Bash安装脚本
- **输出内容**: Bash安装脚本内容

#### 3. GET `/install/powershell`
- **功能**: 获取PowerShell安装脚本
- **输出内容**: PowerShell安装脚本内容

#### 4. GET `/install/`
- **功能**: 获取HTML安装指南
- **输出内容**: HTML安装指南页面

### 受保护路由示例 (前缀: `/api`)

#### 1. GET `/api/protected`
- **功能**: 受保护路由示例
- **认证要求**: 需要Bearer Token
- **输出内容**: 受保护资源信息

## 认证机制

系统支持两种认证方式：
1. **JWT Bearer Token**: 用于用户界面交互
2. **API密钥**: 用于程序化访问

## 端口配置

- **开发环境**: 127.0.0.1:8000
- **CORS配置**: 允许前端地址 http://localhost:5173

## 数据库连接

使用MongoDB数据库，通过异步连接池管理数据库连接。

## 错误处理

所有API端点都包含完整的错误处理，返回适当的HTTP状态码和错误信息。

## 日志记录

系统使用标准Python logging模块记录操作日志，便于调试和监控。

