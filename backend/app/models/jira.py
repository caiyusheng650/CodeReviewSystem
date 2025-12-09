from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List
from datetime import datetime
from bson import ObjectId
from app.models.user import PyObjectId

class JiraResource(BaseModel):
    """Jira资源信息模型"""
    id: str = Field(..., description="Jira资源ID")
    url: str = Field(..., description="Jira实例URL")
    name: str = Field(..., description="Jira实例名称")
    scopes: List[str] = Field(default_factory=list, description="访问权限范围")
    avatar_url: Optional[str] = Field(None, description="头像URL", alias="avatarUrl")

class JiraConnection(BaseModel):
    id: Optional[PyObjectId] = Field(default_factory=PyObjectId, alias="_id", description="Jira连接的唯一标识")
    name: str = Field(..., description="连接名称")
    description: Optional[str] = Field(None, description="连接描述")
    jira_resource_id: Optional[str] = Field(None, description="Jira资源ID")
    jira_resource_name: Optional[str] = Field(None, description="Jira资源名称")
    project_key: Optional[str] = Field(None, description="Jira项目密钥")
    auth_type: str = Field(default="oauth2", description="认证类型: oauth2")
    client_id: str = Field(..., description="OAuth客户端ID")
    refresh_token: Optional[str] = Field(None, description="OAuth刷新令牌")
    token_type: Optional[str] = Field(None, description="令牌类型")
    scope: Optional[str] = Field(None, description="访问权限范围")
    is_cloud: bool = Field(default=True, description="是否为Jira Cloud实例")
    accessible_resources: Optional[List[JiraResource]] = Field(None, description="可访问的Jira资源列表")
    created_at: datetime = Field(default_factory=datetime.utcnow, description="创建时间")
    updated_at: datetime = Field(default_factory=datetime.utcnow, description="更新时间")
    last_sync_at: Optional[datetime] = Field(None, description="最后同步时间")
    is_active: bool = Field(default=True, description="连接是否激活")

    model_config = {
        "populate_by_name": True,
        "arbitrary_types_allowed": True,
        "json_encoders": {
            PyObjectId: str,
            datetime: lambda v: v.isoformat()
        }
    }

class JiraConnectionCreate(BaseModel):
    name: str = Field(..., description="连接名称")
    description: Optional[str] = Field(None, description="连接描述")
    jira_resource_id: Optional[str] = Field(None, description="Jira资源ID")
    jira_resource_name: Optional[str] = Field(None, description="Jira资源名称")
    project_key: Optional[str] = Field(None, description="Jira项目密钥")
    auth_type: str = Field(default="oauth2", description="认证类型: oauth2")
    client_id: str = Field(..., description="OAuth客户端ID")
    is_cloud: bool = Field(default=True, description="是否为Jira Cloud实例")
    access_token: Optional[str] = Field(None, description="OAuth访问令牌")
    refresh_token: Optional[str] = Field(None, description="OAuth刷新令牌")
    token_expires_at: Optional[datetime] = Field(None, description="令牌过期时间")
    token_type: Optional[str] = Field(None, description="令牌类型")
    scope: Optional[str] = Field(None, description="访问权限范围")
    accessible_resources: Optional[List[JiraResource]] = Field(None, description="可访问的Jira资源列表")

class JiraConnectionUpdate(BaseModel):
    name: Optional[str] = Field(None, description="连接名称")
    description: Optional[str] = Field(None, description="连接描述")
    jira_resource_id: Optional[str] = Field(None, description="Jira资源ID")
    jira_resource_name: Optional[str] = Field(None, description="Jira资源名称")
    project_key: Optional[str] = Field(None, description="Jira项目密钥")
    auth_type: Optional[str] = Field(default="oauth2", description="认证类型: oauth2")
    client_id: Optional[str] = Field(None, description="OAuth客户端ID")
    client_secret: Optional[str] = Field(None, description="OAuth客户端密钥")
    is_cloud: Optional[bool] = Field(None, description="是否为Jira Cloud实例")
    refresh_token: Optional[str] = Field(None, description="OAuth刷新令牌")
    token_expires_at: Optional[datetime] = Field(None, description="令牌过期时间")
    token_type: Optional[str] = Field(None, description="令牌类型")
    scope: Optional[str] = Field(None, description="访问权限范围")
    accessible_resources: Optional[List[JiraResource]] = Field(None, description="可访问的Jira资源列表")
    last_sync_at: Optional[datetime] = Field(None, description="最后同步时间")
    is_active: Optional[bool] = Field(None, description="连接是否激活")

class JiraConnectionTest(BaseModel):
    auth_type: str = Field(default="oauth2", description="认证类型: oauth2")
    access_token: str = Field(..., description="OAuth访问令牌")
    is_cloud: bool = Field(default=True, description="是否为Jira Cloud实例")

class JiraConnectionWithToken(JiraConnection):
    """包含解密后令牌的Jira连接模型，用于测试等需要令牌的场景"""
    access_token: Optional[str] = Field(None, description="OAuth访问令牌")