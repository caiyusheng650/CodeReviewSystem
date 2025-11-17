from typing import Dict, List, Optional
from app.utils.database import programmers_collection
from app.models.programmer import ProgrammerInDB
import logging

# 配置日志
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class ReputationService:
    """信誉服务类，用于处理用户信誉分的计算和更新"""
    
    @staticmethod
    async def get_programmer_reputation(username: str) -> Dict:
        """
        获取程序员的信誉信息
        
        Args:
            username: 用户名
            
        Returns:
            包含信誉分数和历史记录的字典
        """
        # 从数据库中查找程序员
        programmer_doc = await programmers_collection.find_one({"username": username})
        
        if not programmer_doc:
            # 如果程序员不存在，返回默认信誉值
            return {"score": 60, "history": []}
        
        # 返回程序员的信誉信息
        return {
            "score": programmer_doc.get("reputation_score", 60),
            "history": programmer_doc.get("reputation_history", [])
        }
    
    @staticmethod
    async def update_programmer_reputation(username: str, event: str = None, delta_reputation: int = None) -> Dict:
        """
        根据事件或数值变化更新程序员的信誉分数
        
        Args:
            username: 用户名
            event: 事件类型 (passed / minor_issue / severe_bug / rejected)
            delta_reputation: 信誉分数的变化值
            
        Returns:
            更新后的信誉信息
        """
        # 获取当前用户信誉
        current_reputation = await ReputationService.get_programmer_reputation(username)
        score = current_reputation["score"]
        history = current_reputation["history"]
        
        score += delta_reputation

        
        history.append(event)
        
        # 更新数据库中的程序员信誉信息
        await programmers_collection.update_one(
            {"username": username},
            {
                "$set": {
                    "reputation_score": score,
                    "reputation_history": history
                },
                "$currentDate": {"updated_at": True}
            },
            upsert=True
        )
        
        logger.info(f"用户 {username} 的信誉分已更新: {score}, 事件: {event}, 变化值: {delta_reputation}")
        
        return {
            "status": "updated",
            "author": username,
            "new_score": score,
            "history": history
        }
    

# 创建全局实例
reputation_service = ReputationService()