"""
并发限制管理器
用于限制同时运行的代码审查服务数量
"""

import asyncio
from typing import Optional, Set
from contextlib import asynccontextmanager
import logging

logger = logging.getLogger(__name__)


class ConcurrencyLimiter:
    """并发限制管理器"""
    
    def __init__(self, max_concurrent: int = 5):
        """
        初始化并发限制器
        
        Args:
            max_concurrent: 最大并发数，默认为5
        """
        self.max_concurrent = max_concurrent
        self.semaphore = asyncio.Semaphore(max_concurrent)
        self.active_tasks: Set[str] = set()
        self._lock = asyncio.Lock()
    
    async def acquire(self, task_id: str) -> bool:
        """
        尝试获取执行权限
        
        Args:
            task_id: 任务标识符
            
        Returns:
            bool: 是否成功获取权限
        """
        acquired = await self.semaphore.acquire()
        if acquired:
            async with self._lock:
                self.active_tasks.add(task_id)
            logger.info(f"任务 {task_id} 已开始执行，当前活跃任务数: {len(self.active_tasks)}/{self.max_concurrent}")
        return acquired
    
    async def release(self, task_id: str):
        """
        释放执行权限
        
        Args:
            task_id: 任务标识符
        """
        async with self._lock:
            if task_id in self.active_tasks:
                self.active_tasks.remove(task_id)
        self.semaphore.release()
        logger.info(f"任务 {task_id} 已完成，当前活跃任务数: {len(self.active_tasks)}/{self.max_concurrent}")
    
    @asynccontextmanager
    async def limit(self, task_id: str):
        """
        异步上下文管理器，用于限制并发执行
        
        Args:
            task_id: 任务标识符
            
        Yields:
            bool: 是否成功获取权限
        """
        acquired = await self.acquire(task_id)
        try:
            yield acquired
        finally:
            if acquired:
                await self.release(task_id)
    
    def get_current_status(self) -> dict:
        """
        获取当前并发状态
        
        Returns:
            dict: 状态信息
        """
        return {
            "max_concurrent": self.max_concurrent,
            "active_tasks": len(self.active_tasks),
            "available_slots": self.max_concurrent - len(self.active_tasks),
            "active_task_ids": list(self.active_tasks)
        }
    
    async def wait_for_slot(self, timeout: Optional[float] = None) -> bool:
        """
        等待可用槽位
        
        Args:
            timeout: 超时时间（秒），None表示无限等待
            
        Returns:
            bool: 是否在超时前等到槽位
        """
        try:
            # 尝试立即获取，如果失败则等待
            if self.semaphore._value > 0:
                return True
                
            # 等待信号量可用
            if timeout is None:
                await self.semaphore.acquire()
                self.semaphore.release()  # 立即释放，只是检查可用性
                return True
            else:
                try:
                    await asyncio.wait_for(self.semaphore.acquire(), timeout)
                    self.semaphore.release()  # 立即释放，只是检查可用性
                    return True
                except asyncio.TimeoutError:
                    return False
        except Exception as e:
            logger.error(f"等待槽位时出错: {e}")
            return False


# 全局并发限制器实例
code_review_limiter = ConcurrencyLimiter(max_concurrent=5)


class ConcurrencyLimitExceeded(Exception):
    """并发限制超出异常"""
    def __init__(self, max_concurrent: int, current_active: int):
        super().__init__(f"并发限制超出，最大允许 {max_concurrent} 个任务，当前有 {current_active} 个活跃任务")
        self.max_concurrent = max_concurrent
        self.current_active = current_active