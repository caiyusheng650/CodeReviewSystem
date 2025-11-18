# review/models.py
# 数据模型模块

from dataclasses import dataclass, field
from typing import List, Optional
import time

@dataclass
class AgentBuffer:
    """用于保存单个 agent 的流式输出与时间统计"""
    agent_name: str
    messages: List[str] = field(default_factory=list)
    first_ts: Optional[float] = None
    last_ts: Optional[float] = None
    status: str = "in_progress"  # completed | final

    def append(self, content: str, ts: Optional[float] = None):
        """添加消息到buffer"""
        if self.first_ts is None:
            self.first_ts = ts or time.time()
        self.last_ts = ts or time.time()
        self.messages.append(content)

    def full_text(self) -> str:
        """获取完整的文本内容"""
        return "\n".join(self.messages)

    def processing_time(self) -> float:
        """计算处理时间"""
        if self.first_ts is None or self.last_ts is None:
            return 0.0
        return max(0.0, self.last_ts - self.first_ts)

@dataclass
class ReviewResult:
    """审查结果数据模型"""
    review_id: str
    status: str  # success | error
    agent_outputs: dict
    final_result: str
    author: str
    timestamp: str
    
    def to_dict(self) -> dict:
        """转换为字典格式"""
        return {
            "review_id": self.review_id,
            "status": self.status,
            "agent_outputs": self.agent_outputs,
            "final_result": self.final_result,
            "author": self.author,
            "timestamp": self.timestamp
        }

@dataclass 
class ReviewRequest:
    """审查请求数据模型"""
    review_id: str
    code_diff: str
    pr_comments: List[dict]
    developer_reputation_score: int
    developer_reputation_history: List[str]
    repository_readme: str
    author: str
    github_action_id: Optional[str] = None
    pr_number: Optional[str] = None
    repo_owner: Optional[str] = None
    repo_name: Optional[str] = None
    pr_title: Optional[str] = None
    pr_body: Optional[str] = None
    user_id: Optional[str] = None

@dataclass
class AgentOutput:
    """Agent输出数据模型"""
    agent_name: str
    agent_type: str
    output_content: dict
    processing_time: float
    execution_time: float
    status: str  # in_progress | completed | final

    def to_dict(self) -> dict:
        """转换为字典格式"""
        return {
            "agent_name": self.agent_name,
            "agent_type": self.agent_type,
            "output_content": self.output_content,
            "processing_time": self.processing_time,
            "execution_time": self.execution_time,
            "status": self.status
        }