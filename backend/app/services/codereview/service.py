# review/service.py
# 核心服务模块

import json5 as json
import time
import asyncio
from pathlib import Path
from typing import Dict, Any, Optional, List
from autogen_agentchat.teams import GraphFlow
import re
from .config import logger, setup_logger, silence_autogen_console
from .models import AgentBuffer, ReviewResult, ReviewRequest
from .utils import JSONParser, ContentAnalyzer, ResultFormatter
from .database import AICodeReviewDatabaseService
from app.models.codereview import AgentOutput, CodeReviewUpdate
from autogen_agentchat.ui import Console
from bson import ObjectId
import sys
import os
# 添加项目根目录到Python路径
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))))
from app.services.jira import create_issue



class AICodeReviewService:

    def __init__(self, code_review_service: AICodeReviewDatabaseService, flow: Optional[GraphFlow] = None, silence_agent_console: bool = True):
        # 初始化配置
        setup_logger()
        if silence_agent_console:
            silence_autogen_console()
        
        # 服务依赖
        self.code_review_service:AICodeReviewDatabaseService = code_review_service
        self.flow = flow
        self.silence_agent_console = silence_agent_console
        
    # ---------------------------
    # 主入口方法
    # ---------------------------
    async def run_ai_code_review(
        self,
        review_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        
        Args:
            review_data: 审查数据字典，包含所有必要信息
            
        Returns:
            Dict[str, Any]: 审查结果
        """

        
        review_id = review_data.get("review_id", "unknown-review-id")
        logger.info("开始AI代码审查流程，审查ID: %s", review_id)

        # 2. 构建请求对象
        request = ReviewRequest(**review_data)

        
        try:

            # 3. 构建任务提示词
            task = ContentAnalyzer.build_prompt(
                request.code_diff,
                request.pr_comments,
                request.developer_reputation_score,
                request.developer_reputation_history,
                request.repository_readme
            )

            # 确保flow存在
            if self.flow is None:
                try:
                    from .flow_builder import create_default_flow
                    self.flow = create_default_flow()
                except Exception as e:
                    logger.exception("无法创建默认GraphFlow: %s", e)
                    return {"status": "error", "reason": "no_graphflow_available"}

            # 4. 收集agent输出（不实时保存）
            agent_outputs = await self.collect_agent_outputs(request.review_id, task)

            # 5. 格式化最终结果
            final_result = agent_outputs.get("FinalReviewAggregatorAgent", "")
            
            # 使用正则表达式提取 ```json 和 ``` 之间的内容
            
            # 匹配 ```json 和 ``` 之间的内容
            json_pattern = r'```json\s*(.*?)\s*```'
            match = re.search(json_pattern, final_result, re.DOTALL)
            
            if match:
                # 如果找到 ```json 和 ``` 标记，提取中间的内容
                final_result = match.group(1).strip()
            else:
                # 如果没有找到标记，保持原样
                final_result = final_result.strip()

            # 6. 一次性保存完整结果
            await self._save_complete_review_result(request.review_id, agent_outputs, final_result)
            
            # 7. 返回结果
            return ReviewResult(
                review_id=request.review_id,
                agent_outputs=agent_outputs,
                final_result=final_result,
                timestamp=time.strftime("%Y-%m-%d %H:%M:%S")
            ).to_dict()
            
        except Exception as e:
            logger.exception("AI代码审查流程执行失败: %s", e)
            return {
                "review_id": review_id,
                "status": "error",
                "error": str(e),
                "agent_outputs": {},
                "final_result": {}
            }

    # ---------------------------
    # Agent输出收集（优化版本）
    # ---------------------------
    async def collect_agent_outputs(self, review_id: str, task: str) -> Dict[str, str]:
        if self.flow is None:
            raise RuntimeError("GraphFlow 未初始化")

        agent_buffers: Dict[str, AgentBuffer] = {}
        agent_outputs: Dict[str, str] = {}

        stream = self.flow.run_stream(task=task)
        async for message in stream:
            try:
                ts = time.time()
                agent_name = getattr(message, "source", None) or getattr(message, "agent_name", None) or "unknown_agent"
                content = str(getattr(message, "content", "")).strip()
                
                if not content:
                    continue

                # 直接使用原始内容，不进行JSON规范化
                content_to_append = content
                
                # 获取或创建buffer
                if agent_name not in agent_buffers:
                    agent_buffers[agent_name] = AgentBuffer(agent_name=agent_name)
                agent_buffers[agent_name].append(content_to_append, ts)

                # 检查是否应该标记为final
                buf = agent_buffers[agent_name]
                if ContentAnalyzer.should_mark_as_final(content_to_append, agent_name):
                    buf.status = "final"

            except Exception as e:
                logger.exception("处理消息时出错: %s", e)

        # 收集所有buffer的最终文本
        for agent_name, buf in agent_buffers.items():
            agent_outputs[agent_name] = buf.full_text()

        logger.info("AI代码审查完成，收集到 %d 个agent输出", len(agent_outputs))
        return agent_outputs

    async def _save_complete_review_result(self, review_id: str, agent_outputs: Dict[str, str], final_result: str) -> bool:
        """一次性保存完整的审查结果"""
        try:
            
            
            agent_output_list = []
            for agent_name, content in agent_outputs.items():
                # 解析agent类型
                
                # 直接存储原始内容作为JSON字符串
                output_content = str(content)
                
                # 创建AgentOutput对象
                agent_output = AgentOutput(
                    agent_name=agent_name,
                    output_content=output_content,
                ).to_dict()

                agent_output_list.append(agent_output)
            
            # 构建更新数据（直接存储原始final_result字符串）
            update_data3 = CodeReviewUpdate(status="completed")
            success = await self.code_review_service.update_review(review_id, update_data3)
            
            update_data1 = CodeReviewUpdate(agent_outputs=agent_output_list)
            success = await self.code_review_service.update_review(review_id, update_data1)

            update_data2 = CodeReviewUpdate(final_result=json.loads(final_result))
            success = await self.code_review_service.update_review(review_id, update_data2)

            if success:
                logger.info("成功保存完整审查结果，审查ID: %s", review_id)
            else:
                logger.error("保存完整审查结果失败，审查ID: %s", review_id)
            
            return success
                
        except Exception as e:
            logger.exception("保存完整审查结果时出错: %s", e)
            update_data3 = CodeReviewUpdate(status="failed")
            success = await self.code_review_service.update_review(review_id, update_data3)
            return False
    