from pydantic import BaseModel, Field
from typing import Optional, Dict, Any
from datetime import datetime
from bson import ObjectId
from enum import Enum

class ApiKeyStatus(str, Enum):
    """API密钥状态枚举"""
    ACTIVE = "active"
    INACTIVE = "inactive"
    REVOKED = "revoked"

class ApiKeyBase(BaseModel):
    """API密钥基础模型"""
    username: str  # 关联的用户
    name: Optional[str] = Field(default=None, description="API密钥名称/描述")
    status: ApiKeyStatus = Field(default=ApiKeyStatus.ACTIVE, description="密钥状态")
    permissions: Dict[str, Any] = Field(default_factory=dict, description="权限配置")
    usage_count: int = Field(default=0, description="使用次数")
    rate_limit: int = Field(default=1000, description="频率限制(每小时)")
    created_at: datetime = Field(default_factory=datetime.utcnow, description="创建时间")
    last_used: Optional[datetime] = Field(default=None, description="最后使用时间")
    expires_at: Optional[datetime] = Field(default=None, description="过期时间")

class ApiKeyInDB(ApiKeyBase):
    """数据库中的API密钥模型"""
    id: Optional[ObjectId] = Field(default_factory=ObjectId, alias="_id")
    # 存储API密钥的哈希值，不存储明文
    api_key_hash: str
    # 密钥预览，用于在UI中显示（仅显示前8位和后4位）
    key_preview: str
    # 使用统计
    successful_requests: int = 0
    failed_requests: int = 0
    rate_limit_hits: int = 0
    last_hour_requests: int = 0
    last_day_requests: int = 0

    model_config = {
        "populate_by_name": True,
        "json_encoders": {ObjectId: str, datetime: lambda v: v.isoformat() if v else None},
        "arbitrary_types_allowed": True
    }

class ApiKeyResponse(ApiKeyBase):
    """API响应中的API密钥模型（不包含敏感信息）"""
    id: str = Field(alias="_id")
    key_preview: str
    created_at: datetime
    last_used: Optional[datetime] = None
    expires_at: Optional[datetime] = None

    model_config = {
        "populate_by_name": True,
        "json_encoders": {ObjectId: str, datetime: lambda v: v.isoformat() if v else None},
        "arbitrary_types_allowed": True
    }

class ApiKeyGenerated(BaseModel):
    """生成密钥时的响应模型（仅在生成时返回完整密钥）"""
    id: str
    api_key: str = Field(..., description="完整密钥(仅首次显示)")
    key_preview: str = Field(..., description="密钥预览")
    name: Optional[str] = None
    created_at: datetime
    expires_at: Optional[datetime] = None

    model_config = {
        "json_encoders": {datetime: lambda v: v.isoformat() if v else None}
    }

class ApiKeyStatusUpdate(BaseModel):
    """更新密钥状态模型"""
    status: ApiKeyStatus

class ApiKeyDelete(BaseModel):
    """删除密钥确认模型"""
    confirm_delete: bool = Field(..., description="确认删除")
    
class ApiKeyUsageStats(BaseModel):
    """API密钥使用统计"""
    total_requests: int
    successful_requests: int
    failed_requests: int
    rate_limit_hits: int
    last_hour_requests: int
    last_day_requests: int