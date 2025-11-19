from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List
from datetime import datetime
from bson import ObjectId
from enum import Enum
from app.models.user import PyObjectId

class ReviewStatus(str, Enum):
    """审查状态枚举"""
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"

class CodeReviewBase(BaseModel):
    """代码审查基础模型"""
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

class CodeReviewInDB(CodeReviewBase):
    """数据库中的代码审查模型"""
    id: Optional[PyObjectId] = Field(default_factory=PyObjectId, alias="_id")
    created_at: datetime = Field(default_factory=datetime.utcnow, description="创建时间")
    updated_at: datetime = Field(default_factory=datetime.utcnow, description="更新时间")
    status: ReviewStatus = Field(default=ReviewStatus.PENDING, description="审查状态")
    
    # 存储各个agent的输出结果（原始JSON字符串）
    agent_outputs: List[str] = Field(default_factory=list, description="各agent的输出结果列表（JSON字符串）")
    
    # 存储最终的聚合结果（原始JSON字符串）
    final_result: Optional[str] = Field(default=None, description="最终聚合结果（JSON字符串）")
    
    # 性能统计
    agent_count: int = Field(default=0, description="参与审查的agent数量")

    username: str = Field(..., description="请求头API token所属的用户名")
    
    model_config = {
        "populate_by_name": True,
        "json_encoders": {ObjectId: str, datetime: lambda v: v.isoformat() if v else None},
        "arbitrary_types_allowed": True
    }

class CodeReviewResponse(CodeReviewBase):
    """API响应中的代码审查模型"""
    created_at: datetime
    updated_at: datetime
    status: ReviewStatus
    agent_outputs: List[Dict] = []
    final_result: Optional[str] = None
    agent_count: int = 0
    username: str = Field(..., description="请求头API token所属的用户名")

    model_config = {
        "populate_by_name": True,
        "json_encoders": {ObjectId: str, datetime: lambda v: v.isoformat() if v else None},
        "arbitrary_types_allowed": True
    }

class AgentOutput(BaseModel):
    """单个Agent输出模型"""
    agent_name: str = Field(..., description="Agent名称")
    output_content: str = Field(..., description="输出内容（JSON字符串）")
    created_at: datetime = Field(default_factory=datetime.utcnow, description="创建时间")

    def to_dict(self) -> dict:
        """转换为字典格式"""
        return {
            "agent": self.agent_name,
            "content": self.output_content,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }

class CodeReviewCreate(BaseModel):
    """创建代码审查请求模型"""
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

class CodeReviewUpdate(BaseModel):
    """更新代码审查模型"""
    status: Optional[ReviewStatus] = None
    agent_outputs: Optional[List[Dict]] = None
    final_result: Optional[str] = None

class CodeReviewStats(BaseModel):
    """代码审查统计模型"""
    total_reviews: int
    completed_reviews: int
    failed_reviews: int
    pending_reviews: int
    most_active_repo: Optional[str] = None
    most_active_user: Optional[str] = None
    top_issues: List[Dict[str, Any]] = []
    agent_performance: Dict[str, Dict[str, Any]] = {}

class CodeReviewListResponse(BaseModel):
    """代码审查列表响应模型"""
    reviews: List[CodeReviewResponse]
    total: int
    page: int
    size: int
    has_next: bool