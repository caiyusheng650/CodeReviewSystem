#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
代码审查相关的数据模型定义文件

此模块定义了代码审查系统中使用的所有Pydantic模型，用于请求验证、响应格式化
和数据存储。模型结构遵循单一职责原则，按照不同的使用场景和功能划分为多个类。
"""

from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List
from datetime import datetime
from bson import ObjectId
from enum import Enum
from app.models.user import PyObjectId

class ReviewStatus(str, Enum):
    """审查状态枚举类
    
    定义了代码审查流程中的所有可能状态：
    - PENDING: 审查请求已创建但尚未开始处理
    - PROCESSING: 审查正在进行中
    - COMPLETED: 审查已成功完成
    - FAILED: 审查过程中出现错误
    """
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"

class CodeReviewBase(BaseModel):
    """代码审查基础模型
    
    定义了代码审查所需的核心字段，是其他审查相关模型的基础。
    包含了从GitHub PR获取的基本信息和代码差异内容。
    """
    
    github_action_id: str = Field(..., description="GitHub Action ID，用于标识特定的工作流运行")
    pr_number: int = Field(..., description="Pull Request编号，唯一标识一个PR")
    repo_owner: str = Field(..., description="仓库所有者名称/组织名称")
    repo_name: str = Field(..., description="仓库名称")
    author: str = Field(..., description="PR作者的GitHub用户名")
    diff_content: str = Field(..., description="代码差异内容，包含PR中所有文件的修改")
    pr_title: str = Field(..., description="PR标题，简要描述PR的目的")
    pr_body: str = Field(..., description="PR正文，包含详细的修改说明和上下文")
    readme_content: str = Field(..., description="README内容，用于了解项目整体情况")
    comments: List[Dict[str, Any]] = Field(..., description="PR上现有的评论列表")

class CodeReviewInDB(CodeReviewBase):
    """数据库中的代码审查模型
    
    继承自基础模型，并添加了数据库存储所需的字段，包括ID、时间戳、状态等。
    此模型用于与数据库交互，存储完整的代码审查记录。
    """
    id: Optional[PyObjectId] = Field(default_factory=PyObjectId, alias="_id")
    created_at: datetime = Field(default_factory=datetime.utcnow, description="创建时间，UTC格式")
    updated_at: datetime = Field(default_factory=datetime.utcnow, description="更新时间，UTC格式")
    status: ReviewStatus = Field(default=ReviewStatus.PENDING, description="审查状态，默认为待处理")
    
    # 存储各个agent的输出结果（原始JSON字符串）
    agent_outputs: List[str] = Field(default_factory=list, description="各agent的输出结果列表，以JSON字符串形式存储")
    
    # 存储最终的聚合结果
    final_result: Optional[Dict] = Field(default=None, description="最终聚合结果，包含合并后的审查意见")
    
    # 存储标记的问题项序号
    marked_issues: List[str] = Field(default_factory=list, description="标记为重要或需要跟踪的问题项序号列表")
    
    # 存储聊天记录
    chat_history: List = Field(default_factory=list, description="与审查相关的聊天记录列表")
    
    username: str = Field(..., description="请求头API token所属的用户名，用于权限验证")
    
    model_config = {
        "populate_by_name": True,
        "json_encoders": {ObjectId: str, datetime: lambda v: v.isoformat() if v else None},
        "arbitrary_types_allowed": True
    }

class CodeReviewBaseResponse(BaseModel):
    """代码审查基础信息响应模型
    
    用于API响应，包含代码审查的核心信息，但不包含大型字段（如完整差异内容）。
    适用于列表展示等不需要详细内容的场景。
    """
    id: Optional[PyObjectId] = Field(default_factory=PyObjectId, alias="_id")
    github_action_id: str = Field(..., description="GitHub Action ID")
    pr_number: int = Field(..., description="Pull Request编号")
    repo_owner: str = Field(..., description="仓库所有者")
    repo_name: str = Field(..., description="仓库名称")
    author: str = Field(..., description="PR作者")
    pr_title: str = Field(..., description="PR标题")
    created_at: datetime
    updated_at: datetime
    status: ReviewStatus
    final_result: Optional[Dict] = None
    marked_issues: List[str] = Field(default_factory=list, description="标记的问题项序号列表")
    username: str = Field(..., description="请求头API token所属的用户名")

    model_config = {
        "populate_by_name": True,
        "json_encoders": {ObjectId: str, datetime: lambda v: v.isoformat() if v else None},
        "arbitrary_types_allowed": True
    }

class CodeReviewDetailResponse(CodeReviewBaseResponse):
    """代码审查详细信息响应模型
    
    继承自基础响应模型，添加了完整的详细信息，包括大型字段。
    适用于需要查看完整审查详情的场景。
    """
    diff_content: str = Field(..., description="代码差异内容")
    pr_body: str = Field(..., description="PR正文")
    readme_content: str = Field(..., description="README内容")
    comments: List[Dict[str, Any]] = Field(..., description="评论列表")
    agent_outputs: List[Dict] = Field(default_factory=list, description="各agent的输出结果，已解析为字典格式")
    chat_history: List = Field(default_factory=list, description="聊天记录列表")

class CodeReviewResponse(CodeReviewDetailResponse):
    """API响应中的代码审查模型
    
    为保持向后兼容性而保留的别名模型，与CodeReviewDetailResponse功能完全相同。
    用于确保现有客户端代码不受模型重命名的影响。
    """
    pass

class AgentOutput(BaseModel):
    """单个Agent输出模型
    
    用于表示代码审查过程中单个AI Agent的输出结果。
    每个Agent负责分析代码的不同方面，产生专业的审查意见。
    """
    agent_name: str = Field(..., description="Agent名称，标识是哪个AI Agent的输出")
    output_content: str = Field(..., description="输出内容，以JSON字符串形式存储详细的审查结果")
    created_at: datetime = Field(default_factory=datetime.utcnow, description="创建时间")

    def to_dict(self) -> dict:
        """转换为字典格式
        
        将模型实例转换为可序列化的字典，方便存储和传输。
        
        Returns:
            dict: 包含agent名称、内容和创建时间的字典
        """
        return {
            "agent": self.agent_name,
            "content": self.output_content,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }

class CodeReviewCreate(BaseModel):
    """创建代码审查请求模型
    
    用于API接收创建新代码审查的请求数据。
    包含启动一次代码审查所需的所有必要信息。
    """
    github_action_id: str = Field(..., description="GitHub Action ID")
    pr_number: int = Field(..., description="Pull Request编号")
    repo_owner: str = Field(..., description="仓库所有者")
    repo_name: str = Field(..., description="仓库名称")
    author: str = Field(..., description="PR作者")
    diff_content: str = Field(..., description="代码差异内容")
    pr_title: str = Field(..., description="PR标题")
    pr_body: str = Field(..., description="PR正文")
    readme_content: str = Field(..., description="README内容")
    comments: List[Dict[str, Any]] = Field(..., description="评论列表")
    username: str = Field(..., description="请求头API token所属的用户名")
    chat_history: List = Field(default_factory=list, description="聊天记录列表")

class CodeReviewUpdate(BaseModel):
    """更新代码审查模型
    
    用于API接收更新现有代码审查记录的请求数据。
    所有字段都是可选的，只更新提供的字段。
    """
    status: Optional[ReviewStatus] = None  # 可选的状态更新
    agent_outputs: Optional[List[Dict]] = None  # 可选的agent输出更新
    final_result: Optional[Dict] = None  # 可选的最终结果更新
    marked_issues: Optional[List[str]] = None  # 可选的标记问题更新
    chat_history: Optional[List[Dict[str, Any]]] = None  # 可选的聊天记录更新

class CodeReviewStats(BaseModel):
    """代码审查统计模型
    
    用于存储和展示系统整体的代码审查统计信息，帮助管理员了解系统运行状况。
    包含各类计数、活跃仓库/用户信息和问题分析等。
    """
    total_reviews: int  # 总审查次数
    completed_reviews: int  # 已完成的审查次数
    failed_reviews: int  # 失败的审查次数
    pending_reviews: int  # 待处理的审查次数
    most_active_repo: Optional[str] = None  # 最活跃的仓库
    most_active_user: Optional[str] = None  # 最活跃的用户
    top_issues: List[Dict[str, Any]] = []  # 最常见的问题类型统计
    agent_performance: Dict[str, Dict[str, Any]] = {}  # 各Agent的性能指标

class CodeReviewListResponse(BaseModel):
    """代码审查列表响应模型
    
    用于API返回分页的代码审查列表数据。
    """
    reviews: List[CodeReviewBaseResponse]  # 当前页的审查记录列表
    total: int  # 总记录数

class AsyncTaskResponse(BaseModel):
    """异步任务提交响应模型
    
    用于异步任务提交的响应，包含任务ID和状态信息。
    """
    task_id: str = Field(..., description="异步任务ID")
    status: ReviewStatus = Field(..., description="任务当前状态")
    message: str = Field(..., description="任务提交成功消息")

class TaskStatusResponse(BaseModel):
    """任务状态查询响应模型
    
    用于查询异步任务状态的响应。
    """
    task_id: str = Field(..., description="异步任务ID")
    status: ReviewStatus = Field(..., description="任务当前状态")
    progress: Optional[float] = Field(None, description="任务进度百分比")
    error: Optional[str] = Field(None, description="错误信息（如果任务失败）")
    result: Optional[Dict] = Field(None, description="任务结果（如果已完成）")
    created_at: datetime = Field(..., description="任务创建时间")
    updated_at: datetime = Field(..., description="任务最后更新时间")

# 新增：简化的审查记录列表响应模型
class SimpleCodeReviewResponse(BaseModel):
    """简化的审查记录响应模型
    
    为列表展示优化的轻量级响应模型，仅包含必要的字段。
    相比完整模型，减少了数据传输量，提高了列表加载性能。
    """
    id: Optional[PyObjectId] = Field(default_factory=PyObjectId, alias="_id")
    pr_number: int = Field(..., description="Pull Request编号")
    pr_title: str = Field(..., description="PR标题")
    pr_body: str = Field(..., description="PR正文")
    repo_name: str = Field(..., description="仓库名称")
    author: str = Field(..., description="PR作者")
    status: ReviewStatus  # 审查状态
    created_at: datetime  # 创建时间

    model_config = {
        "populate_by_name": True,
        "json_encoders": {ObjectId: str, datetime: lambda v: v.isoformat() if v else None},
        "arbitrary_types_allowed": True
    }

class SimpleCodeReviewListResponse(BaseModel):
    """简化的代码审查列表响应模型
    
    用于返回使用简化模型的分页列表数据。
    适用于需要快速加载大量审查记录的场景。
    """
    reviews: List[SimpleCodeReviewResponse]  # 当前页的简化审查记录列表
    total: int  # 总记录数
    page: int  # 当前页码
    size: int  # 每页大小
    has_next: bool  # 是否有下一页