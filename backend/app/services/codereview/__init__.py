"""
review模块主入口

此模块提供AI代码审查服务的模块化实现。
"""

from .service import AICodeReviewService
from .models import AgentBuffer, ReviewResult, ReviewRequest
from .factory import get_ai_code_review_service, create_ai_code_review_service
from .flow_builder import create_default_flow
from .utils import JSONParser, ContentAnalyzer, ResultFormatter
from .config import logger, setup_logger, silence_autogen_console, get_system_prompt
from .database_service import CodeReviewService

__all__ = [
    # 主服务类
    "AICodeReviewService",
    
    # 数据模型
    "AgentBuffer", 
    "ReviewResult", 
    "ReviewRequest",
    
    # 数据库服务
    "CodeReviewService",
    
    # 工厂函数
    "get_ai_code_review_service",
    "create_ai_code_review_service",
    
    # GraphFlow构建
    "create_default_flow", 
    "get_flow_builder",
    
    # 工具类
    "JSONParser",
    "ContentAnalyzer", 
    "ResultFormatter",
    
    # 配置
    "logger",
    "setup_logger",
    "silence_autogen_console",
    "get_system_prompt"
]

# 版本信息
__version__ = "1.0.0"
__author__ = "AI Code Review System"
__description__ = "模块化的AI代码审查服务"