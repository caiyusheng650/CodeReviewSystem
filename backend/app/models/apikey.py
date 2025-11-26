#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
API密钥相关的数据模型定义文件

此模块定义了代码审查系统中API密钥的管理和操作所需的Pydantic模型。
包含密钥的创建、验证、状态管理和使用统计等功能。
"""

from pydantic import BaseModel, Field
from typing import Optional, Dict, Any
from datetime import datetime
from bson import ObjectId
from enum import Enum

class ApiKeyStatus(str, Enum):
    """API密钥状态枚举类
    
    定义了API密钥的所有可能状态：
    - ACTIVE: 密钥处于激活状态，可以正常使用
    - INACTIVE: 密钥暂时失效，但可重新激活
    - REVOKED: 密钥已被撤销，无法再次使用
    """
    ACTIVE = "active"
    INACTIVE = "inactive"
    REVOKED = "revoked"

class ApiKeyBase(BaseModel):
    """API密钥基础模型
    
    定义了API密钥的核心字段，是其他密钥相关模型的基础。
    包含密钥的基本信息、使用限制和时间记录等。
    """
    username: str = Field(..., description="关联的用户名，标识密钥所属用户")
    name: Optional[str] = Field(default=None, description="API密钥名称/描述，用于用户识别不同的密钥用途")
    status: ApiKeyStatus = Field(default=ApiKeyStatus.ACTIVE, description="密钥状态，默认为激活")
    permissions: Dict[str, Any] = Field(default_factory=dict, description="权限配置，控制密钥可访问的功能范围")
    usage_count: int = Field(default=0, description="累计使用次数")
    rate_limit: int = Field(default=1000, description="频率限制(每小时)，控制密钥的访问频率")
    created_at: datetime = Field(default_factory=datetime.utcnow, description="创建时间，UTC格式")
    last_used: Optional[datetime] = Field(default=None, description="最后使用时间，用于监控密钥活动")
    expires_at: Optional[datetime] = Field(default=None, description="过期时间，可设置密钥的有效期")

class ApiKeyInDB(ApiKeyBase):
    """数据库中的API密钥模型
    
    继承自基础模型，并添加了数据库存储所需的字段，包括ID、密钥哈希值和详细统计数据。
    此模型用于与数据库交互，存储完整的API密钥记录。
    注意：出于安全考虑，仅存储密钥的哈希值，不存储明文密钥。
    """
    id: Optional[ObjectId] = Field(default_factory=ObjectId, alias="_id")
    # 存储API密钥的哈希值，不存储明文
    api_key_hash: str = Field(..., description="API密钥的哈希值，用于安全验证")
    # 密钥预览，用于在UI中显示（仅显示前8位和后4位）
    key_preview: str = Field(..., description="密钥预览，安全地在UI中展示部分密钥信息")
    # 使用统计
    successful_requests: int = Field(default=0, description="成功请求次数")
    failed_requests: int = Field(default=0, description="失败请求次数")
    rate_limit_hits: int = Field(default=0, description="超出频率限制的次数")
    last_hour_requests: int = Field(default=0, description="最近一小时的请求次数")
    last_day_requests: int = Field(default=0, description="最近一天的请求次数")

    model_config = {
        "populate_by_name": True,
        "json_encoders": {ObjectId: str, datetime: lambda v: v.isoformat() if v else None},
        "arbitrary_types_allowed": True
    }

class ApiKeyResponse(ApiKeyBase):
    """API响应中的API密钥模型
    
    用于API响应，包含API密钥的基本信息，但排除了敏感信息如密钥哈希值。
    适用于密钥列表展示和详细信息查询场景。
    """
    id: str = Field(alias="_id", description="密钥ID")
    key_preview: str = Field(..., description="密钥预览")
    created_at: datetime
    last_used: Optional[datetime] = None
    expires_at: Optional[datetime] = None

    model_config = {
        "populate_by_name": True,
        "json_encoders": {ObjectId: str, datetime: lambda v: v.isoformat() if v else None},
        "arbitrary_types_allowed": True
    }

class ApiKeyGenerated(BaseModel):
    """生成密钥时的响应模型
    
    仅在密钥生成时返回，是唯一一次向用户展示完整API密钥的机会。
    包含新生成的完整密钥信息和其他元数据。
    """
    id: str = Field(..., description="生成的密钥ID")
    api_key: str = Field(..., description="完整密钥(仅首次显示)，用户需安全保存")
    key_preview: str = Field(..., description="密钥预览，用于后续识别")
    name: Optional[str] = None
    created_at: datetime
    expires_at: Optional[datetime] = None

    model_config = {
        "json_encoders": {datetime: lambda v: v.isoformat() if v else None}
    }

class ApiKeyStatusUpdate(BaseModel):
    """更新密钥状态模型
    
    用于API接收更新API密钥状态的请求数据。
    允许将密钥状态更改为激活、禁用或撤销。
    """
    status: ApiKeyStatus = Field(..., description="要更新的新状态")

class ApiKeyDelete(BaseModel):
    """删除密钥确认模型
    
    用于API接收删除API密钥的确认请求。
    需要显式确认以防止误操作。
    """
    confirm_delete: bool = Field(..., description="确认删除，必须为true才能执行删除操作")
    
class ApiKeyUsageStats(BaseModel):
    """API密钥使用统计模型
    
    用于存储和展示API密钥的详细使用统计信息。
    帮助管理员和用户了解密钥的使用情况和性能指标。
    """
    total_requests: int = Field(..., description="总请求次数")
    successful_requests: int = Field(..., description="成功完成的请求次数")
    failed_requests: int = Field(..., description="失败的请求次数")
    rate_limit_hits: int = Field(..., description="触发频率限制的次数")
    last_hour_requests: int = Field(..., description="最近一小时内的请求次数")
    last_day_requests: int = Field(..., description="最近一天内的请求次数")