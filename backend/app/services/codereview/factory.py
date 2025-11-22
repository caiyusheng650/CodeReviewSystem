# review/factory.py
# 工厂函数和单例模块

from typing import Optional
from autogen_agentchat.teams import GraphFlow

from .service import AICodeReviewService
from .concurrent_service import ConcurrentAICodeReviewService, get_concurrent_ai_code_review_service

# 全局单例实例
_ai_code_review_service: Optional[AICodeReviewService] = None
_concurrent_ai_code_review_service: Optional[ConcurrentAICodeReviewService] = None

def get_ai_code_review_service(
    code_review_service, 
    flow: Optional[GraphFlow] = None, 
    silence_agent_console: bool = True,
    enable_concurrency_limit: bool = True
) -> AICodeReviewService:
    """
    获取AI代码审查服务实例（单例模式）
    
    Args:
        code_review_service: 代码审查服务实例
        flow: GraphFlow实例，如果为None则使用默认配置
        silence_agent_console: 是否静音控制台输出
        enable_concurrency_limit: 是否启用并发限制（默认启用）
        
    Returns:
        AICodeReviewService实例或ConcurrentAICodeReviewService实例
    """
    global _ai_code_review_service, _concurrent_ai_code_review_service
    
    if enable_concurrency_limit:
        # 使用并发限制版本
        if _concurrent_ai_code_review_service is None:
            # 先创建基础的AI服务
            if _ai_code_review_service is None:
                _ai_code_review_service = AICodeReviewService(
                    code_review_service=code_review_service,
                    flow=flow,
                    silence_agent_console=silence_agent_console
                )
            # 创建并发限制包装器
            _concurrent_ai_code_review_service = ConcurrentAICodeReviewService(_ai_code_review_service)
        
        return _concurrent_ai_code_review_service
    else:
        # 使用原始版本（无并发限制）
        if _ai_code_review_service is None:
            _ai_code_review_service = AICodeReviewService(
                code_review_service=code_review_service,
                flow=flow,
                silence_agent_console=silence_agent_console
            )
        
        return _ai_code_review_service

def create_ai_code_review_service(
    code_review_service, 
    flow: Optional[GraphFlow] = None, 
    silence_agent_console: bool = True
) -> AICodeReviewService:
    """
    创建新的AI代码审查服务实例（非单例）
    
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

def reset_singleton():
    """重置单例实例（主要用于测试）"""
    global _ai_code_review_service
    _ai_code_review_service = None

def is_singleton_initialized() -> bool:
    """检查单例是否已初始化"""
    return _ai_code_review_service is not None