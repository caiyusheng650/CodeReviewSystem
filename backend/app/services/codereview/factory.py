# review/factory.py
# 工厂函数模块

from typing import Optional
from autogen_agentchat.teams import GraphFlow

from .service import AICodeReviewService

def get_ai_code_review_service(
    code_review_service, 
    flow: Optional[GraphFlow] = None, 
    silence_agent_console: bool = True
) -> AICodeReviewService:
    """
    获取AI代码审查服务实例（每次创建新实例，无并发限制）
    
    Args:
        code_review_service: 代码审查服务实例
        flow: GraphFlow实例，如果为None则使用默认配置
        silence_agent_console: 是否静音控制台输出
        
    Returns:
        AICodeReviewService实例
    """
    
    # 直接创建AI代码审查服务实例，无并发限制
    return AICodeReviewService(
        code_review_service=code_review_service,
        flow=flow,
        silence_agent_console=silence_agent_console
    )

def create_ai_code_review_service(
    code_review_service, 
    flow: Optional[GraphFlow] = None, 
    silence_agent_console: bool = True
) -> AICodeReviewService:
    """
    创建新的AI代码审查服务实例（与get_ai_code_review_service功能相同，保持向后兼容）
    
    Args:
        code_review_service: 代码审查服务实例
        flow: GraphFlow实例，如果为None则使用默认配置
        silence_agent_console: 是否静音控制台输出
        
    Returns:
        新的AICodeReviewService实例
    """
    return AICodeReviewService(
        code_review_service=code_review_service,
        flow=flow,
        silence_agent_console=silence_agent_console
    )