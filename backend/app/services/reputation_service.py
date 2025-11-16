from typing import Dict, List, Optional
from app.utils.database import users_collection
from app.models.user import UserInDB
import logging

# 配置日志
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class ReputationService:
    """信誉服务类，用于处理用户信誉分的计算和更新"""
    
    @staticmethod
    async def get_user_reputation(username: str) -> Dict:
        """
        获取用户的信誉信息
        
        Args:
            username: 用户名
            
        Returns:
            包含信誉分数和历史记录的字典
        """
        # 从数据库中查找用户
        user_doc = await users_collection.find_one({"username": username})
        
        if not user_doc:
            # 如果用户不存在，返回默认信誉值
            return {"score": 60, "history": []}
        
        # 返回用户的信誉信息
        return {
            "score": user_doc.get("reputation_score", 60),
            "history": user_doc.get("reputation_history", [])
        }
    
    @staticmethod
    async def update_user_reputation(username: str, event: str) -> Dict:
        """
        根据事件更新用户的信誉分数
        
        Args:
            username: 用户名
            event: 事件类型 (passed / minor_issue / severe_bug / rejected)
            
        Returns:
            更新后的信誉信息
        """
        # 获取当前用户信誉
        current_reputation = await ReputationService.get_user_reputation(username)
        score = current_reputation["score"]
        history = current_reputation["history"]
        
        # 根据事件类型更新信誉分
        if event == "passed":
            score += 2
        elif event == "minor_issue":
            score -= 3
        elif event == "severe_bug":
            score -= 10
        elif event == "rejected":
            score -= 15
        
        # 确保信誉分在0-100范围内
        score = max(0, min(100, score))
        
        # 更新历史记录
        history.append(event)
        
        # 更新数据库中的用户信誉信息
        await users_collection.update_one(
            {"username": username},
            {
                "$set": {
                    "reputation_score": score,
                    "reputation_history": history
                }
            },
            upsert=True
        )
        
        logger.info(f"用户 {username} 的信誉分已更新: {score}, 事件: {event}")
        
        return {
            "status": "updated",
            "author": username,
            "new_score": score,
            "history": history
        }
    

# 创建全局实例
reputation_service = ReputationService()