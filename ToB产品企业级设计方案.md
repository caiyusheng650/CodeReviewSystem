# 智能代码审查系统 - ToB产品企业级设计方案

## 1. 企业级用户数据表设计方案

### 1.1 核心设计原则
- **单一数据源**：合并用户和程序员表，简化数据模型
- **企业级扩展**：支持团队管理、权限控制、审计日志
- **向后兼容**：确保现有功能不受影响
- **安全合规**：满足GDPR等数据保护要求

### 1.2 数据库表结构设计

#### 用户表 (enterprise_users)
```python
from enum import Enum
from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, EmailStr, Field
from bson import ObjectId

# 枚举类型定义
class UserRole(str, Enum):
    SUPER_ADMIN = "super_admin"        # 超级管理员
    TEAM_ADMIN = "team_admin"          # 团队管理员
    QUALITY_ASSURANCE = "quality_assurance"  # 质量保证
    DEVELOPER = "developer"             # 开发人员
    GUEST = "guest"                    # 访客

class UserStatus(str, Enum):
    ACTIVE = "active"                  # 活跃
    INACTIVE = "inactive"              # 非活跃
    SUSPENDED = "suspended"            # 暂停
    PENDING = "pending"                # 待激活

class ExpertiseLevel(str, Enum):
    JUNIOR = "junior"                  # 初级
    INTERMEDIATE = "intermediate"      # 中级
    SENIOR = "senior"                  # 高级
    EXPERT = "expert"                  # 专家

# 信誉事件记录
class ReputationEvent(BaseModel):
    event_type: str = Field(..., description="事件类型")
    description: str = Field(..., description="事件描述")
    delta_score: int = Field(..., description="分数变化")
    related_review_id: Optional[str] = Field(None, description="关联审查ID")
    created_at: datetime = Field(default_factory=datetime.utcnow)

# 技术技能详情
class TechnicalSkills(BaseModel):
    primary_language: str = Field(..., description="主要编程语言")
    secondary_languages: List[str] = Field(default_factory=list, description="次要编程语言")
    frameworks: List[str] = Field(default_factory=list, description="框架技能")
    tools: List[str] = Field(default_factory=list, description="工具技能")
    experience_years: int = Field(default=0, description="经验年限")

# 企业信息
class EnterpriseInfo(BaseModel):
    employee_id: Optional[str] = Field(None, description="员工ID")
    department: Optional[str] = Field(None, description="部门")
    job_title: Optional[str] = Field(None, description="职位")
    manager_id: Optional[str] = Field(None, description="直属上级ID")
    hire_date: Optional[datetime] = Field(None, description="入职日期")

# 主用户模型
class EnterpriseUserInDB(BaseModel):
    # 基础身份信息
    id: Optional[ObjectId] = Field(default_factory=ObjectId, alias="_id")
    email: EmailStr = Field(..., description="企业邮箱")
    username: str = Field(..., min_length=3, max_length=50, description="用户名")
    display_name: str = Field(..., description="显示名称")
    
    # 安全认证
    hashed_password: str = Field(..., description="密码哈希")
    mfa_enabled: bool = Field(default=False, description="多因素认证")
    failed_login_attempts: int = Field(default=0, description="登录失败次数")
    password_changed_at: datetime = Field(default_factory=datetime.utcnow)
    
    # 企业信息
    enterprise_info: EnterpriseInfo = Field(default_factory=EnterpriseInfo)
    team_id: Optional[ObjectId] = Field(None, description="所属团队ID")
    
    # 角色权限
    role: UserRole = Field(default=UserRole.DEVELOPER, description="用户角色")
    status: UserStatus = Field(default=UserStatus.PENDING, description="用户状态")
    permissions: Dict[str, Any] = Field(default_factory=dict, description="权限配置")
    
    # 专业技能
    reputation_score: int = Field(default=60, ge=0, le=100, description="信誉评分")
    reputation_history: List[ReputationEvent] = Field(default_factory=list, description="信誉历史")
    technical_skills: TechnicalSkills = Field(default_factory=TechnicalSkills, description="技术技能")
    expertise_level: ExpertiseLevel = Field(default=ExpertiseLevel.JUNIOR, description="专业级别")
    
    # 联系信息
    phone: Optional[str] = Field(None, description="联系电话")
    avatar_url: Optional[str] = Field(None, description="头像URL")
    
    # 时间戳
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    last_login_at: Optional[datetime] = Field(None, description="最后登录时间")
    email_verified: bool = Field(default=False, description="邮箱验证状态")
    
    # 统计信息
    total_reviews: int = Field(default=0, description="总审查次数")
    successful_reviews: int = Field(default=0, description="成功审查次数")
    
    class Config:
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}
```

#### 团队表 (teams)
```python
class TeamInDB(BaseModel):
    id: Optional[ObjectId] = Field(default_factory=ObjectId, alias="_id")
    name: str = Field(..., description="团队名称")
    description: Optional[str] = Field(None, description="团队描述")
    
    # 管理信息
    owner_id: ObjectId = Field(..., description="团队所有者ID")
    admin_ids: List[ObjectId] = Field(default_factory=list, description="管理员ID列表")
    member_ids: List[ObjectId] = Field(default_factory=list, description="成员ID列表")
    
    # 配置
    max_members: int = Field(default=50, description="最大成员数")
    allowed_domains: List[str] = Field(default_factory=list, description="允许的邮箱域名")
    
    # 订阅信息
    subscription_plan: str = Field(default="basic", description="订阅计划")
    subscription_status: str = Field(default="active", description="订阅状态")
    subscription_expires_at: Optional[datetime] = Field(None, description="订阅过期时间")
    
    # 时间戳
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
```

### 1.3 数据库索引优化
```python
# 建议创建的索引
indexes = [
    # 用户查询优化
    {"keys": [("email", 1)], "unique": True},
    {"keys": [("username", 1)], "unique": True},
    {"keys": [("enterprise_info.employee_id", 1)], "sparse": True},
    
    # 团队管理优化
    {"keys": [("team_id", 1), ("status", 1)]},
    {"keys": [("role", 1), ("status", 1)]},
    
    # 统计分析优化
    {"keys": [("reputation_score", -1)]},
    {"keys": [("created_at", -1)]},
    {"keys": [("total_reviews", -1)]},
    
    # 安全相关
    {"keys": [("last_login_at", -1)]},
    {"keys": [("failed_login_attempts", -1)]}
]
```

## 2. ToB产品分发和部署方案

### 2.1 部署模式选择

#### 2.1.1 SaaS模式（云端部署）
**适用场景**：中小企业、快速部署需求

**技术架构**：
```
前端 (React + Vite) → CDN
    ↓
API网关 (Nginx) → 负载均衡
    ↓
后端集群 (FastAPI + MongoDB集群)
    ↓
文件存储 (对象存储) + 缓存 (Redis)
```

**优势**：
- 零部署成本，开箱即用
- 自动升级和维护
- 弹性扩展能力
- 统一的安全管理

#### 2.1.2 私有化部署模式
**适用场景**：大型企业、数据安全要求高

**部署包结构**：
```
code_review_system/
├── docker-compose.yml          # 容器编排
├── .env.production            # 生产环境配置
├── backend/                    # 后端服务
│   ├── Dockerfile
│   ├── requirements.txt
│   └── app/
├── frontend/                   # 前端应用
│   ├── Dockerfile
│   ├── nginx.conf
│   └── build/
├── database/                  # 数据库
│   ├── init-mongo.js
│   └── backup/
└── scripts/                   # 部署脚本
    ├── deploy.sh
    ├── backup.sh
    └── update.sh
```

### 2.2 分发渠道设计

#### 2.2.1 官网直销渠道
- **官网注册**：企业邮箱验证注册
- **试用申请**：30天免费试用
- **在线购买**：信用卡/支付宝支付

#### 2.2.2 合作伙伴渠道
- **系统集成商**：提供API集成支持
- **云市场**：阿里云/腾讯云市场
- **代理商**：区域代理销售

#### 2.2.3 技术分发方案
```bash
# Docker部署脚本示例
#!/bin/bash
# deploy.sh

echo "开始部署智能代码审查系统..."

# 1. 环境检查
echo "检查Docker环境..."
docker --version
docker-compose --version

# 2. 创建数据目录
mkdir -p ./data/mongodb
mkdir -p ./data/backups

# 3. 配置环境变量
cp .env.example .env
# 编辑 .env 文件配置企业信息

# 4. 启动服务
echo "启动服务容器..."
docker-compose up -d

# 5. 健康检查
echo "等待服务启动..."
sleep 30
curl -f http://localhost:8000/api/health || echo "服务启动失败"

echo "部署完成！访问地址: http://localhost:3000"
```

### 2.3 部署流程自动化

#### 2.3.1 CI/CD流水线
```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [ main ]
    tags: [ 'v*' ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
    - name: Checkout code
      uses: actions/checkout@v3
      
    - name: Build and push Docker images
      run: |
        docker build -t $REGISTRY/code-review-backend:latest ./backend
        docker build -t $REGISTRY/code-review-frontend:latest ./frontend
        docker push $REGISTRY/code-review-backend:latest
        docker push $REGISTRY/code-review-frontend:latest
        
    - name: Deploy to production
      run: |
        ssh deploy@$PRODUCTION_SERVER 'cd /opt/code-review && ./scripts/update.sh'
```

## 3. 收款和订阅管理系统

### 3.1 订阅计划设计

#### 3.1.1 定价策略
```python
class SubscriptionPlan(str, Enum):
    FREE = "free"              # 免费版
    BASIC = "basic"            # 基础版：$29/月
    PROFESSIONAL = "professional"  # 专业版：$99/月
    ENTERPRISE = "enterprise"  # 企业版：$299/月

# 订阅计划详情
PLAN_DETAILS = {
    "free": {
        "price_monthly": 0,
        "price_yearly": 0,
        "max_team_members": 5,
        "max_reviews_per_month": 100,
        "features": ["基础代码审查", "GitHub集成", "基础报告"]
    },
    "basic": {
        "price_monthly": 29,
        "price_yearly": 290,  # 节省2个月
        "max_team_members": 20,
        "max_reviews_per_month": 1000,
        "features": ["高级代码审查", "自定义规则", "团队管理", "API访问"]
    },
    "professional": {
        "price_monthly": 99,
        "price_yearly": 990,  # 节省2个月
        "max_team_members": 50,
        "max_reviews_per_month": 5000,
        "features": ["AI智能审查", "安全漏洞检测", "性能分析", "优先级支持"]
    },
    "enterprise": {
        "price_monthly": 299,
        "price_yearly": 2990,  # 自定义定价
        "max_team_members": 1000,
        "max_reviews_per_month": "无限",
        "features": ["私有化部署", "SLA保障", "专属客户经理", "定制开发"]
    }
}
```

### 3.2 支付系统集成

#### 3.2.1 支付网关选择
- **国际支付**：Stripe、PayPal
- **国内支付**：支付宝、微信支付
- **企业支付**：银行转账、对公账户

#### 3.2.2 支付流程设计
```python
class PaymentService:
    """支付服务"""
    
    async def create_subscription(self, team_id: str, plan: str, payment_method: str) -> Dict:
        """创建订阅"""
        # 1. 验证团队信息
        team = await self.get_team(team_id)
        
        # 2. 计算价格
        amount = self.calculate_amount(plan, team.member_count)
        
        # 3. 创建支付订单
        order = await self.create_order(team_id, amount, payment_method)
        
        # 4. 调用支付网关
        payment_result = await self.process_payment(order, payment_method)
        
        # 5. 更新订阅状态
        if payment_result.success:
            await self.activate_subscription(team_id, plan, order)
            
        return payment_result
    
    async def handle_webhook(self, payload: Dict) -> bool:
        """处理支付webhook"""
        # 验证webhook签名
        if not self.verify_signature(payload):
            return False
            
        event_type = payload.get('type')
        
        if event_type == 'payment.succeeded':
            await self.handle_payment_success(payload)
        elif event_type == 'subscription.updated':
            await self.handle_subscription_update(payload)
        elif event_type == 'invoice.payment_failed':
            await self.handle_payment_failed(payload)
            
        return True
```

### 3.3 发票和账单管理

#### 3.3.1 发票生成
```python
class InvoiceService:
    """发票服务"""
    
    async def generate_invoice(self, subscription_id: str) -> Dict:
        """生成发票"""
        subscription = await self.get_subscription(subscription_id)
        team = await self.get_team(subscription.team_id)
        
        invoice_data = {
            "invoice_number": self.generate_invoice_number(),
            "issue_date": datetime.utcnow(),
            "due_date": datetime.utcnow() + timedelta(days=30),
            "from": {
                "company_name": "智能代码审查系统",
                "tax_id": "91310101MA1FPXXXXX",
                "address": "上海市浦东新区张江高科技园区"
            },
            "to": {
                "company_name": team.company_name,
                "tax_id": team.tax_id,
                "address": team.billing_address
            },
            "items": [
                {
                    "description": f"{subscription.plan} 订阅费",
                    "quantity": 1,
                    "unit_price": subscription.amount,
                    "amount": subscription.amount
                }
            ],
            "total_amount": subscription.amount,
            "tax_amount": subscription.amount * 0.06  # 6%增值税
        }
        
        # 生成PDF发票
        pdf_content = await self.generate_pdf_invoice(invoice_data)
        
        return {
            "invoice_data": invoice_data,
            "pdf_content": pdf_content
        }
```

## 4. 实施路线图

### 4.1 第一阶段：基础功能（1-2个月）
- ✅ 企业级用户数据模型
- ✅ 团队管理基础功能
- ✅ 基础订阅和支付系统
- ✅ SaaS模式部署

### 4.2 第二阶段：高级功能（2-3个月）
- 🔄 私有化部署支持
- 🔄 高级权限管理
- 🔄 多支付渠道集成
- 🔄 发票和账单系统

### 4.3 第三阶段：生态扩展（3-6个月）
- 🔄 合作伙伴渠道
- 🔄 API市场集成
- 🔄 定制化开发服务
- 🔄 国际化支持

## 5. 现有企业管理软件集成方案

### 5.1 Jira集成方案

#### 5.1.1 双向同步功能
```python
class JiraIntegrationService:
    """Jira集成服务"""
    
    async def sync_code_review_to_jira(self, review_id: str, jira_project_key: str) -> Dict:
        """将代码审查结果同步到Jira"""
        # 获取代码审查详情
        review = await self.get_code_review(review_id)
        
        # 创建Jira issue
        jira_issue = {
            "project": {"key": jira_project_key},
            "summary": f"代码审查问题: {review.title}",
            "description": self.format_review_description(review),
            "issuetype": {"name": "Bug"},
            "priority": {"name": self.map_severity_to_priority(review.severity)},
            "labels": ["code-review", "automated"],
            "customfield_10000": review.pr_url  # 关联PR链接
        }
        
        # 调用Jira API
        response = await self.jira_client.create_issue(jira_issue)
        
        # 记录同步状态
        await self.record_sync_status(review_id, response["key"])
        
        return response
    
    async def sync_jira_status_to_review(self, jira_issue_key: str) -> bool:
        """将Jira issue状态同步回代码审查"""
        jira_issue = await self.jira_client.get_issue(jira_issue_key)
        
        # 根据Jira状态更新审查状态
        if jira_issue["fields"]["status"]["name"] == "Done":
            await self.mark_review_as_resolved(jira_issue_key)
        
        return True
```

#### 5.1.2 配置管理
```python
# Jira集成配置
class JiraConfig(BaseModel):
    base_url: str = Field(..., description="Jira实例URL")
    username: str = Field(..., description="Jira用户名")
    api_token: str = Field(..., description="Jira API令牌")
    project_mappings: Dict[str, str] = Field(default_factory=dict, description="项目映射")
    auto_sync: bool = Field(default=True, description="自动同步")
    sync_interval: int = Field(default=300, description="同步间隔(秒)")
```

### 5.2 Slack/Teams集成

#### 5.2.1 实时通知
```python
class NotificationService:
    """通知服务"""
    
    async def send_slack_notification(self, review: CodeReview, channel: str) -> bool:
        """发送Slack通知"""
        message = {
            "channel": channel,
            "blocks": [
                {
                    "type": "section",
                    "text": {
                        "type": "mrkdwn",
                        "text": f"*代码审查完成* :eyes:\n*PR标题*: {review.title}\n*严重程度*: {review.severity}"
                    }
                },
                {
                    "type": "actions",
                    "elements": [
                        {
                            "type": "button",
                            "text": {"type": "plain_text", "text": "查看详情"},
                            "url": review.pr_url
                        },
                        {
                            "type": "button", 
                            "text": {"type": "plain_text", "text": "创建Jira任务"},
                            "action_id": "create_jira_issue"
                        }
                    ]
                }
            ]
        }
        
        return await self.slack_client.post_message(message)
```

### 5.3 GitHub/GitLab深度集成

#### 5.3.1 PR状态更新
```python
class GitIntegrationService:
    """Git平台集成服务"""
    
    async def update_pr_status(self, pr_url: str, review_status: str) -> bool:
        """更新PR状态"""
        # 解析PR信息
        repo_owner, repo_name, pr_number = self.parse_pr_url(pr_url)
        
        # 设置PR状态检查
        status_payload = {
            "state": self.map_review_status(review_status),
            "target_url": f"{settings.APP_URL}/reviews/{review_id}",
            "description": "AI代码审查结果",
            "context": "ai-code-review"
        }
        
        # 调用GitHub/GitLab API
        if "github" in pr_url:
            return await self.github_client.set_status(repo_owner, repo_name, pr_number, status_payload)
        else:
            return await self.gitlab_client.set_status(repo_owner, repo_name, pr_number, status_payload)
```

### 5.4 单点登录(SSO)集成

#### 5.4.1 SAML/OAuth2集成
```python
class SSOIntegrationService:
    """单点登录集成服务"""
    
    async def handle_saml_login(self, saml_response: str) -> User:
        """处理SAML登录"""
        # 验证SAML响应
        assertion = await self.saml_client.validate_response(saml_response)
        
        # 提取用户信息
        user_attributes = assertion.get_attributes()
        email = user_attributes.get("email")
        
        # 查找或创建用户
        user = await self.find_or_create_user_from_sso(email, user_attributes)
        
        # 生成JWT令牌
        token = self.create_jwt_token(user)
        
        return {"user": user, "token": token}
    
    async def handle_oauth2_login(self, provider: str, code: str) -> User:
        """处理OAuth2登录"""
        # 交换授权码获取访问令牌
        token_response = await self.oauth2_client.exchange_code(provider, code)
        
        # 获取用户信息
        user_info = await self.oauth2_client.get_user_info(provider, token_response["access_token"])
        
        # 同步用户数据
        user = await self.sync_user_from_oauth2(provider, user_info)
        
        return user
```

### 5.5 企业身份提供商集成

#### 5.5.1 Active Directory/LDAP集成
```python
class ADIntegrationService:
    """Active Directory集成服务"""
    
    async def authenticate_with_ad(self, username: str, password: str) -> bool:
        """AD认证"""
        try:
            # 连接AD服务器
            conn = await self.ldap_client.connect(
                settings.AD_SERVER,
                settings.AD_DOMAIN
            )
            
            # 绑定用户验证密码
            user_dn = f"CN={username},OU=Users,DC=company,DC=com"
            return await conn.bind(user_dn, password)
            
        except Exception as e:
            logger.error(f"AD认证失败: {e}")
            return False
    
    async def sync_ad_groups(self, username: str) -> List[str]:
        """同步AD用户组"""
        # 获取用户所属组
        groups = await self.ldap_client.get_user_groups(username)
        
        # 映射到系统角色
        system_roles = self.map_ad_groups_to_roles(groups)
        
        return system_roles
```

## 6. 集成优势分析

### 6.1 减少重复开发
- **项目管理**：直接使用Jira/Asana的项目管理功能
- **用户管理**：集成AD/Okta等身份提供商
- **通知系统**：利用Slack/Teams现有通知渠道
- **代码托管**：深度集成GitHub/GitLab

### 6.2 提升用户体验
- **统一登录**：SSO减少密码记忆负担
- **工作流整合**：代码审查结果自动同步到项目管理工具
- **实时协作**：通过现有IM工具进行团队沟通
- **数据一致性**：避免信息孤岛

### 6.3 降低部署成本
- **无需额外基础设施**：利用企业现有系统
- **减少培训成本**：员工使用熟悉的工具
- **快速上线**：集成配置相对简单
- **维护简单**：依赖成熟的企业软件

## 7. 风险控制和合规性

### 7.1 数据安全
- **API密钥管理**：安全存储集成密钥
- **传输加密**：所有集成使用HTTPS
- **访问控制**：基于角色的权限管理
- **审计日志**：完整操作记录

### 7.2 合规性要求
- **GDPR合规**：用户数据保护
- **API使用合规**：遵守第三方API使用条款
- **安全认证**：ISO 27001等认证
- **服务等级协议**：SLA保障

### 7.3 业务连续性
- **多地域部署**：灾备和容灾
- **监控告警**：实时系统监控
- **技术支持**：7x24小时支持
- **文档和培训**：完善的用户文档

---

**文档版本**: v1.0  
**创建时间**: 2024年  
**最后更新**: 2024年  
**负责人**: 技术团队