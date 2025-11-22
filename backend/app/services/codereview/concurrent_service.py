"""
并发限制的AI代码审查服务包装器
"""

import asyncio
import logging
from typing import Dict, Any, Optional
from app.utils.concurrency import code_review_limiter, ConcurrencyLimitExceeded
from .service import AICodeReviewService

logger = logging.getLogger(__name__)


class ConcurrentAICodeReviewService:
    """支持并发限制的AI代码审查服务"""
    
    def __init__(self, ai_code_review_service: AICodeReviewService):
        """
        初始化并发限制服务
        
        Args:
            ai_code_review_service: 基础的AI代码审查服务
        """
        self.ai_service = ai_code_review_service
        logger.info("ConcurrentAICodeReviewService 已初始化")
    
    async def run_ai_code_review(
        self,
        review_data: Dict[str, Any],
        timeout: Optional[float] = 300.0  # 5分钟超时
    ) -> Dict[str, Any]:
        """
        运行AI代码审查，支持并发限制
        
        Args:
            review_data: 审查数据
            timeout: 等待槽位的超时时间（秒）
            
        Returns:
            Dict[str, Any]: 审查结果
        """
        review_id = review_data.get("review_id", "unknown-review-id")
        
        # 检查并发限制
        logger.info(f"检查并发限制，审查ID: {review_id}")
        
        # 使用并发限制器
        async with code_review_limiter.limit(review_id) as acquired:
            if not acquired:
                # 无法获取执行权限，返回错误
                status = code_review_limiter.get_current_status()
                logger.warning(
                    f"并发限制超出，审查ID: {review_id}，"
                    f"当前活跃任务: {status['active_tasks']}/{status['max_concurrent']}"
                )
                
                return {
                    "review_id": review_id,
                    "status": "error",
                    "error": f"系统繁忙，当前有 {status['active_tasks']} 个审查任务正在运行，"
                            f"最大并发限制为 {status['max_concurrent']}。请稍后重试。",
                    "error_code": "CONCURRENCY_LIMIT_EXCEEDED",
                    "current_active": status['active_tasks'],
                    "max_concurrent": status['max_concurrent'],
                    "suggested_retry_after": 60  # 建议60秒后重试
                }
            
            # 成功获取执行权限，运行AI审查
            logger.info(f"开始执行AI代码审查，审查ID: {review_id}")
            
            try:
                # 运行实际的AI代码审查
                result = await self.ai_service.run_ai_code_review(review_data)
                
                # 添加并发状态信息
                if "status" in result and result["status"] == "error":
                    # 如果AI审查出错，保持原有错误信息
                    return result
                else:
                    # 成功完成，添加并发状态信息
                    status = code_review_limiter.get_current_status()
                    result["concurrency_status"] = {
                        "max_concurrent": status["max_concurrent"],
                        "current_active": status["active_tasks"],
                        "available_slots": status["available_slots"]
                    }
                    return result
                    
            except asyncio.TimeoutError:
                logger.error(f"AI代码审查超时，审查ID: {review_id}")
                return {
                    "review_id": review_id,
                    "status": "error",
                    "error": "AI代码审查处理超时，请稍后重试",
                    "error_code": "AI_REVIEW_TIMEOUT"
                }
            except Exception as e:
                logger.exception(f"AI代码审查执行失败，审查ID: {review_id}: {e}")
                return {
                    "review_id": review_id,
                    "status": "error",
                    "error": f"AI代码审查执行失败: {str(e)}",
                    "error_code": "AI_REVIEW_FAILED"
                }
    
    async def get_concurrency_status(self) -> Dict[str, Any]:
        """
        获取当前并发状态
        
        Returns:
            Dict[str, Any]: 并发状态信息
        """
        return code_review_limiter.get_current_status()
    
    async def wait_for_available_slot(
        self, 
        timeout: Optional[float] = None
    ) -> Dict[str, Any]:
        """
        等待可用槽位
        
        Args:
            timeout: 超时时间（秒）
            
        Returns:
            Dict[str, Any]: 等待结果
        """
        available = await code_review_limiter.wait_for_slot(timeout)
        status = code_review_limiter.get_current_status()
        
        return {
            "available": available,
            "current_status": status,
            "suggested_action": "retry" if available else "wait"
        }


def get_concurrent_ai_code_review_service(
    ai_code_review_service: AICodeReviewService
) -> ConcurrentAICodeReviewService:
    """
    获取并发限制的AI代码审查服务实例
    
    Args:
        ai_code_review_service: 基础的AI代码审查服务
        
    Returns:
        ConcurrentAICodeReviewService: 并发限制服务实例
    """
    return ConcurrentAICodeReviewService(ai_code_review_service)