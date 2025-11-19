"""
数据库服务模块
处理代码审查记录的CRUD操作
"""

import logging
from motor.motor_asyncio import AsyncIOMotorCollection
from typing import List, Optional, Dict, Any
from datetime import datetime
from bson import ObjectId

from app.models.codereview import (
    CodeReviewCreate, CodeReviewUpdate, CodeReviewResponse, 
    CodeReviewStats, CodeReviewListResponse, AgentOutput,
    ReviewStatus
)

logger = logging.getLogger(__name__)


class CodeReviewService:
    """代码审查服务类"""
    
    def __init__(self, collection):
        self.collection = collection
    
    async def create_review(self, review_data: CodeReviewCreate, username: str) -> str:
        """创建新的代码审查记录
        
        Args:
            review_data: 审查数据
            username: 用户ID（有效的ObjectId字符串）
            
        Returns:
            str: 创建的审查记录ID
        """
        logger.info("开始创建新的代码审查记录，用户ID: %s", username)
        logger.debug("审查数据字段: %s", list(review_data.dict().keys()))
        
        review_doc = {
            "github_action_id": review_data.github_action_id,
            "pr_number": review_data.pr_number,
            "repo_owner": review_data.repo_owner,
            "repo_name": review_data.repo_name,
            "author": review_data.author,
            "diff_content": review_data.diff_content,
            "pr_title": review_data.pr_title,
            "pr_body": review_data.pr_body,
            "readme_content": review_data.readme_content,
            "comments": review_data.comments,
            "status": ReviewStatus.PENDING,
            "agent_outputs": [],
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
            "username": review_data.username
        }
        
        logger.debug("准备插入的文档内容: %s", {k: v for k, v in review_doc.items() if k not in ['diff_base64', 'pr_title_b64', 'pr_body_b64', 'readme_b64', 'comments_b64']})
        
        result = await self.collection.insert_one(review_doc)
        review_id = str(result.inserted_id)
        
        logger.info("成功创建代码审查记录，审查ID: %s", review_id)
        return review_id
    
    async def get_review_by_id(self, review_id: str) -> Optional[CodeReviewResponse]:
        """根据ID获取代码审查记录"""
        try:
            doc = await self.collection.find_one({"_id": ObjectId(review_id)})
            if doc:
                return self._convert_to_response(doc)
            return None
        except Exception:
            return None
    
    async def get_review_by_github_action_id(self, github_action_id: str, username: str) -> Optional[CodeReviewResponse]:
        """根据GitHub Action ID获取代码审查记录"""
        doc = await self.collection.find_one({"github_action_id": github_action_id, "username": username})
        if doc:
            return self._convert_to_response(doc)
        return None
    
    async def update_review(self, review_id: str, update_data: CodeReviewUpdate) -> bool:
        """更新代码审查记录"""
        logger.info("开始更新代码审查记录，审查ID: %s", review_id)
        logger.debug("更新数据字段: %s", list(update_data.dict(exclude_unset=True).keys()))
        
        update_doc = {
            "updated_at": datetime.utcnow()
        }
        
        if update_data.status:
            update_doc["status"] = update_data.status
            logger.debug("更新状态为: %s", update_data.status)
        if update_data.agent_outputs is not None:
            update_doc["agent_outputs"] = update_data.agent_outputs
            logger.debug("更新agent_outputs，数量: %d", len(update_data.agent_outputs))
        if update_data.final_result is not None:
            update_doc["final_result"] = update_data.final_result
            logger.debug("更新final_result字段")
        
        logger.debug("更新文档内容: %s", update_doc)
        
        result = await self.collection.update_one(
            {"_id": ObjectId(review_id)},
            {"$set": update_doc}
        )
        
        if result.modified_count > 0:
            logger.info("成功更新代码审查记录，审查ID: %s，修改文档数: %d", review_id, result.modified_count)
        else:
            logger.warning("未找到需要更新的代码审查记录，审查ID: %s", review_id)
            
        return result.modified_count > 0
    
    async def add_agent_output(self, review_id: str, agent_output: AgentOutput) -> bool:
        """添加agent输出到审查记录"""
        logger.info("开始添加agent输出到审查记录，审查ID: %s", review_id)
        logger.debug("agent输出类型: %s，agent名称: %s", agent_output.agent_type, agent_output.agent_name)
        
        agent_output_dict = agent_output.dict()
        agent_output_dict["created_at"] = datetime.utcnow()
        
        logger.debug("agent输出数据: %s", {k: v for k, v in agent_output_dict.items() if k not in ['content', 'reasoning']})
        
        result = await self.collection.update_one(
            {"_id": ObjectId(review_id)},
            {
                "$push": {"agent_outputs": agent_output_dict},
                "$set": {
                    "updated_at": datetime.utcnow(),
                    "status": ReviewStatus.PROCESSING
                }
            }
        )
        
        if result.modified_count > 0:
            logger.info("成功添加agent输出到审查记录，审查ID: %s，agent类型: %s", review_id, agent_output.agent_type)
        else:
            logger.warning("未找到需要添加agent输出的审查记录，审查ID: %s", review_id)
            
        return result.modified_count > 0
    
    
    async def list_reviews(
        self, 
        username: Optional[str] = None,
        skip: int = 0,
        limit: int = 20
    ) -> CodeReviewListResponse:
        """获取代码审查记录列表"""
        query = {'username': username}

        
        # 获取总数
        total = await self.collection.count_documents(query)
        
        # 获取记录
        cursor = self.collection.find(query).sort("created_at", -1).skip(skip).limit(limit)
        docs = await cursor.to_list(length=limit)
        
        reviews = [self._convert_to_response(doc) for doc in docs if doc]
        
        has_next = skip + limit < total
        
        return CodeReviewListResponse(
            reviews=reviews,
            total=total,
            page=skip // limit + 1,
            size=len(reviews),
            has_next=has_next
        )
    
    async def get_review_stats(self, username: Optional[str] = None) -> CodeReviewStats:
        """获取审查统计信息"""
        query = {}
        if username:
            query["created_by"] = ObjectId(username)
        
        # 获取各种状态的统计
        total_reviews = await self.collection.count_documents(query)
        completed_reviews = await self.collection.count_documents({**query, "status": ReviewStatus.COMPLETED})
        failed_reviews = await self.collection.count_documents({**query, "status": ReviewStatus.FAILED})
        pending_reviews = await self.collection.count_documents({**query, "status": ReviewStatus.PENDING})
        
        # 最活跃的仓库
        repo_stats = await self.collection.aggregate([
            {"$match": query},
            {"$group": {"_id": {"repo_owner": "$repo_owner", "repo_name": "$repo_name"}, "count": {"$sum": 1}}},
            {"$sort": {"count": -1}},
            {"$limit": 1}
        ]).to_list(length=1)
        most_active_repo = f"{repo_stats[0]['_id']['repo_owner']}/{repo_stats[0]['_id']['repo_name']}" if repo_stats else None
        
        # 最活跃的用户
        user_stats = await self.collection.aggregate([
            {"$group": {"_id": "$author", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}},
            {"$limit": 1}
        ]).to_list(length=1)
        most_active_user = user_stats[0]["_id"] if user_stats else None
        
        return CodeReviewStats(
            total_reviews=total_reviews,
            completed_reviews=completed_reviews,
            failed_reviews=failed_reviews,
            pending_reviews=pending_reviews,
            most_active_repo=most_active_repo,
            most_active_user=most_active_user,
            top_issues=[],
            agent_performance={}
        )
    
    async def add_review_report(self, review_data: Dict[str, Any]) -> bool:
        """添加完整审查报告到数据库
        
        Args:
            review_data: 包含审查结果的字典
            
        Returns:
            bool: 操作是否成功
        """
        try:
            # 提取必要字段
            review_id = review_data.get("review_id")
            if not review_id:
                logger.error("审查报告缺少review_id字段")
                return False
            
            logger.debug("开始保存审查报告，审查ID: %s", review_id)
            logger.debug("审查报告数据字段: %s", list(review_data.keys()))
                
            # 构建更新文档
            update_doc = {
                "updated_at": datetime.utcnow(),
                "status": ReviewStatus.COMPLETED
            }
            
            # 添加可选字段
            if "final_result" in review_data:
                update_doc["final_result"] = review_data["final_result"]
                logger.debug("添加final_result字段")
            if "agent_outputs_meta" in review_data:
                update_doc["agent_outputs_meta"] = review_data["agent_outputs_meta"]
                logger.debug("添加agent_outputs_meta字段")
            if "task_preview" in review_data:
                update_doc["task_preview"] = review_data["task_preview"]
                logger.debug("添加task_preview字段")
            
            logger.debug("更新文档内容: %s", update_doc)
            
            # 检查记录是否存在
            existing_record = await self.collection.find_one({"_id": ObjectId(review_id)})
            if not existing_record:
                logger.error("审查记录不存在，审查ID: %s，将创建新记录", review_id)
                # 创建新的审查记录
                new_record = {
                    "_id": ObjectId(review_id),
                    "review_id": review_id,
                    "created_at": datetime.utcnow(),
                    "updated_at": datetime.utcnow(),
                    "status": ReviewStatus.COMPLETED,
                    "agent_outputs": []
                }
                new_record.update(update_doc)
                
                result = await self.collection.insert_one(new_record)
                success = result.inserted_id is not None
                if success:
                    logger.info("成功创建并保存审查报告到数据库，审查ID: %s", review_id)
                else:
                    logger.error("创建审查记录失败，审查ID: %s", review_id)
                return success
            
            # 执行数据库更新
            result = await self.collection.update_one(
                {"_id": ObjectId(review_id)},
                {"$set": update_doc}
            )
            
            success = result.modified_count > 0
            if success:
                logger.info("成功保存审查报告到数据库，审查ID: %s", review_id)
            else:
                logger.warning("未找到对应的审查记录，审查ID: %s", review_id)
                
            return success
            
        except Exception as e:
            logger.exception("保存审查报告到数据库失败: %s", e)
            return False

    async def delete_review(self, review_id: str) -> bool:
        """删除代码审查记录"""
        logger.info("开始删除代码审查记录，审查ID: %s", review_id)
        
        result = await self.collection.delete_one({"_id": ObjectId(review_id)})
        
        if result.deleted_count > 0:
            logger.info("成功删除代码审查记录，审查ID: %s", review_id)
        else:
            logger.warning("未找到需要删除的审查记录，审查ID: %s", review_id)
            
        return result.deleted_count > 0

    async def get_latest_review_by_username(self, username: str) -> Optional[CodeReviewResponse]:
        """根据用户名获取最近一条代码审查记录
        
        Args:
            username: 用户名（邮箱或用户名）
            
        Returns:
            Optional[CodeReviewResponse]: 最近一条审查记录，如果没有则返回None
        """
        logger.info("开始查询用户最近一条代码审查记录，用户名: %s", username)
        
        try:
            # 查询该用户的最新一条记录，按创建时间倒序排列
            cursor = self.collection.find({"username": username}).sort("created_at", -1).limit(1)
            docs = await cursor.to_list(length=1)
            
            if docs:
                review = self._convert_to_response(docs[0])
                logger.info("成功找到用户最近一条代码审查记录，审查ID: %s", review.github_action_id)
                return review
            else:
                logger.info("用户没有代码审查记录，用户名: %s", username)
                return None
                
        except Exception as e:
            logger.exception("查询用户最近一条代码审查记录时出错: %s", e)
            return None
    
    def _convert_to_response(self, doc: Dict[str, Any]) -> CodeReviewResponse:
        """将数据库文档转换为响应模型"""
        # 转换ObjectId
        doc["_id"] = str(doc["_id"])
        if "created_by" in doc and isinstance(doc["created_by"], ObjectId):
            doc["created_by"] = str(doc["created_by"])
        
        return CodeReviewResponse(**doc)