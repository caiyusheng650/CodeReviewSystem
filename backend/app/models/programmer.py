"""程序员模型模块

此模块定义了与程序员相关的数据模型，用于代码审查系统中对程序员信息的管理和展示。
包含基础模型、数据库模型和响应模型，以支持不同场景下的数据交互需求。
"""

from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime
from bson import ObjectId
from app.models.user import PyObjectId


class ProgrammerBase(BaseModel):
    """程序员基础模型
    
    包含程序员的基本信息字段，作为其他程序员相关模型的基类。
    """
    username: str = Field(..., description="程序员的用户名，唯一标识")
    

class ProgrammerInDB(ProgrammerBase):
    """数据库中的程序员模型
    
    用于数据库交互的程序员完整模型，包含了数据库特有字段。
    """
    # 数据库ID字段，使用PyObjectId类型并设置别名
    id: Optional[PyObjectId] = Field(default_factory=PyObjectId, alias="_id", description="程序员在数据库中的唯一标识")
    
    # 信誉分数，默认值为60，用于评估程序员的代码质量和贡献
    reputation_score: int = Field(default=60, description="程序员的信誉分数，默认值为60")
    
    # 信誉历史记录，存储信誉变更的描述信息
    reputation_history: List[str] = Field(default_factory=list, description="程序员信誉变更的历史记录")
    
    # 创建时间，默认为当前UTC时间
    created_at: datetime = Field(default_factory=datetime.utcnow, description="记录创建时间")
    
    # 更新时间，默认为当前UTC时间
    updated_at: datetime = Field(default_factory=datetime.utcnow, description="记录最后更新时间")

    # 模型配置，用于控制序列化和反序列化行为
    model_config = {
        "populate_by_name": True,  # 允许通过名称填充字段
        "json_encoders": {ObjectId: str},  # 将ObjectId类型转换为字符串进行JSON序列化
        "arbitrary_types_allowed": True  # 允许使用任意类型
    }


class ProgrammerResponse(ProgrammerBase):
    """程序员响应模型
    
    用于API响应的程序员模型，将数据库模型转换为适合前端展示的格式。
    """
    # 响应中的ID字段为字符串类型
    id: str = Field(alias="_id", description="程序员的唯一标识（字符串格式）")
    
    # 信誉分数，默认值为60
    reputation_score: int = Field(default=60, description="程序员的信誉分数")
    
    # 信誉历史记录
    reputation_history: List[str] = Field(default_factory=list, description="程序员信誉变更的历史记录")
    
    # 创建时间
    created_at: datetime = Field(..., description="记录创建时间")
    
    # 更新时间
    updated_at: datetime = Field(..., description="记录最后更新时间")

    # 模型配置
    model_config = {
        "populate_by_name": True,  # 允许通过名称填充字段
        "json_encoders": {ObjectId: str},  # 将ObjectId类型转换为字符串
        "arbitrary_types_allowed": True  # 允许使用任意类型
    }