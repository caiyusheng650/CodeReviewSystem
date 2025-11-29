# 异步代码审查API使用指南

## 概述

为了优化长时间运行的代码审查任务，我们已将同步API调用改为异步轮询方案。这样可以避免GitHub Actions的1小时超时限制，让服务器在后台处理代码审查任务。

## 新的API端点

### 1. 提交异步任务

**端点**: `POST /api/codereview/submit`

**功能**: 提交代码审查任务到后台异步处理

**请求体**: 与原来的 `/review` 端点相同

**响应示例**:
```json
{
  "task_id": "123e4567-e89b-12d3-a456-426614174000",
  "status": "pending",
  "message": "代码审查任务已提交，正在后台处理中"
}
```

### 2. 查询任务状态

**端点**: `GET /api/codereview/status/{task_id}`

**功能**: 查询异步任务的处理状态

**响应示例**:
```json
{
  "task_id": "123e4567-e89b-12d3-a456-426614174000",
  "status": "processing",
  "progress": null,
  "error": null,
  "result": null,
  "created_at": "2024-01-01T00:00:00Z",
  "updated_at": "2024-01-01T00:00:30Z"
}
```

**状态说明**:
- `pending`: 任务已提交，等待处理
- `processing`: 任务正在处理中
- `completed`: 任务已完成，可以获取结果
- `failed`: 任务处理失败

### 3. 获取任务结果

**端点**: `GET /api/codereview/result/{task_id}`

**功能**: 获取已完成任务的结果

**前提**: 任务状态必须为 `completed`

**响应示例**:
```json
{
  "issues": {
    "1": {
      "file": "src/main.py",
      "line": 15,
      "bug_type": "代码风格",
      "severity": "轻微",
      "description": "变量命名不规范",
      "suggestion": "使用更具描述性的变量名"
    }
  }
}
```

## GitHub Actions工作流配置

### 新的工作流步骤

1. **提交任务** (`Submit Review Task`)
   - 调用 `/api/codereview/submit` 端点
   - 获取任务ID并保存到环境变量

2. **轮询状态** (`Poll for Task Completion`)
   - 每30秒查询一次任务状态
   - 最大轮询60次（30分钟）
   - 根据状态进行相应处理

### 轮询逻辑

```bash
# 轮询配置
MAX_POLLS=60      # 最大轮询次数
POLL_INTERVAL=30   # 轮询间隔（秒）

# 状态处理
- completed: 下载结果并继续流程
- failed: 输出错误信息并退出
- processing/pending: 继续等待
- 其他: 继续等待
```

## 优势

### 1. 避免超时
- 原来的同步调用有1小时硬超时限制
- 异步方案允许任务在后台长时间运行
- 轮询机制可以灵活控制超时时间

### 2. 更好的用户体验
- 立即返回任务ID，用户可以知道任务已接受
- 实时状态反馈，用户可以了解处理进度
- 错误信息更清晰，便于排查问题

### 3. 系统稳定性
- 后台任务不会阻塞GitHub Actions
- 可以处理更复杂的代码审查任务
- 支持任务重试和恢复

## 向后兼容性

原有的同步端点 `/api/codereview/review` 仍然可用，确保现有客户端不会受到影响。

## 注意事项

1. **任务存储**: 当前使用内存存储任务状态，重启服务会丢失任务信息
2. **生产环境**: 建议使用Redis或数据库存储任务状态
3. **超时设置**: 轮询超时时间可根据实际需求调整
4. **错误处理**: 确保正确处理各种异常情况

## 示例调用流程

```bash
# 1. 提交任务
curl -X POST /api/codereview/submit -H "X-Api-Key: ..." -d @payload.json

# 2. 轮询状态（循环）
curl -X GET /api/codereview/status/{task_id} -H "X-Api-Key: ..."

# 3. 获取结果（当状态为completed时）
curl -X GET /api/codereview/result/{task_id} -H "X-Api-Key: ..."
```

## 故障排除

### 常见问题

1. **任务未找到**: 检查任务ID是否正确，或任务是否已过期
2. **任务长时间pending**: 检查服务器负载和任务队列状态
3. **任务失败**: 查看错误信息，检查输入数据格式

### 日志查看

- 服务器日志会记录任务处理过程
- 错误信息会包含详细的异常堆栈
- 可以查看任务状态变更历史