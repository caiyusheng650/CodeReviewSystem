"""信誉系统模型模块

此模块定义了与程序员信誉相关的数据模型，用于代码审查系统中信誉分数的管理和更新。
包含信誉基础模型和信誉更新载荷模型，支持信誉分数的跟踪和历史记录管理。
"""

from pydantic import BaseModel, Field
from typing import List, Optional


class ReputationBase(BaseModel):
    """信誉基础模型
    
    包含信誉的核心信息，作为信誉相关数据的基础结构。
    """
    # 信誉分数，默认值为60，表示程序员的初始信誉等级
    score: int = Field(default=60, description="程序员的信誉分数，默认值为60")
    
    # 信誉历史记录，存储信誉变更的详细信息
    history: List[str] = Field(default_factory=list, description="信誉变更的历史记录列表")


class ReputationUpdatePayload(BaseModel):
    """信誉更新载荷模型
    
    用于请求更新程序员信誉分数的数据结构，包含触发信誉变更的相关信息。
    """
    # 作者用户名，标识需要更新信誉的程序员
    author: str = Field(..., description="需要更新信誉的程序员用户名")
    
    # 触发信誉变更的事件类型
    event: str = Field(
        ..., 
        description="触发信誉变更的事件类型",
        # 可能的事件类型包括：通过审核、轻微问题、严重错误、被拒绝
        example="passed / minor_issue / severe_bug / rejected"
    )