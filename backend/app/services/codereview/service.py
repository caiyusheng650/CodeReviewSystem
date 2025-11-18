# review/service.py
# 核心服务模块

import json
import time
import asyncio
from pathlib import Path
from typing import Dict, Any, Optional, List
from autogen_agentchat.teams import GraphFlow

from .config import logger, setup_logger, silence_autogen_console
from .models import AgentBuffer, ReviewResult, ReviewRequest
from .utils import JSONParser, ContentAnalyzer, ResultFormatter
from .database_service import CodeReviewService

class AICodeReviewService:
    """AI代码审查服务（模块化版本）"""

    def __init__(self, code_review_service: CodeReviewService, flow: Optional[GraphFlow] = None, silence_agent_console: bool = True):
        # 初始化配置
        setup_logger()
        if silence_agent_console:
            silence_autogen_console()
        
        # 服务依赖
        self.code_review_service:CodeReviewService = code_review_service
        self.flow = flow
        self.silence_agent_console = silence_agent_console
        
        logger.info("AICodeReviewService initialized (silence_agent_console=%s)", silence_agent_console)

    # ---------------------------
    # 主入口方法
    # ---------------------------
    async def run_ai_code_review(
        self,
        review_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """运行AI代码审查流程（简化版本）
        
        Args:
            review_data: 审查数据字典，包含所有必要信息
            
        Returns:
            Dict[str, Any]: 审查结果
        """
        review_id = review_data.get("review_id", "unknown-review-id")
        logger.info("开始AI代码审查流程，审查ID: %s", review_id)
        
        try:
            
            # 2. 构建请求对象
            request = ReviewRequest(**review_data)
            
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

            logger.info("最终结果: %s", final_result)

            # 6. 一次性保存完整结果
            await self._save_complete_review_result(request.review_id, agent_outputs, final_result)
            
            # 7. 返回结果
            return ReviewResult(
                review_id=request.review_id,
                status="success",
                agent_outputs=agent_outputs,
                final_result=final_result,
                author=request.author,
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
        """收集agent输出（不实时保存）"""
        if self.flow is None:
            raise RuntimeError("GraphFlow 未初始化")

        agent_buffers: Dict[str, AgentBuffer] = {}
        agent_outputs: Dict[str, str] = {}

        async for message in self.flow.run_stream(task=task):
            try:
                ts = time.time()
                agent_name = getattr(message, "source", None) or getattr(message, "agent_name", None) or "unknown_agent"
                content = str(getattr(message, "content", "")).strip()
                
                if not content:
                    continue

                # 规范化内容
                content_to_append = JSONParser.normalize_content(content)
                
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
            agent_outputs[agent_name] = buf.to_json()

        logger.info("AI代码审查完成，收集到 %d 个agent输出", len(agent_outputs))
        return agent_outputs

    async def collect_and_save_agent_outputs(self, review_id: str, task: str) -> Dict[str, str]:
        """收集并保存agent输出（兼容旧版本）"""
        return await self.collect_agent_outputs(review_id, task)

    # ---------------------------
    # 数据库操作（优化版本）
    # ---------------------------
    async def _create_initial_review_record(
        self, 
        review_data: Dict[str, Any]
    ) -> bool:
        """创建初始化审查记录（简化版本）"""
        try:
            from app.models.codereview import CodeReviewCreate
            
            # 提取数据或使用默认值
            github_action_id = review_data.get("github_action_id") or review_data.get("review_id")
            pr_number = review_data.get("pr_number") or 0  # 默认使用0作为未知PR编号
            repo_owner = review_data.get("repo_owner") or "unknown-owner"
            repo_name = review_data.get("repo_name") or "unknown-repo"
            author = review_data.get("author") or "unknown-author"
            diff_content = review_data.get("code_diff") or ""
            pr_title = review_data.get("pr_title") or ""
            pr_body = review_data.get("pr_body") or ""
            readme_content = review_data.get("repository_readme") or ""
            comments = review_data.get("pr_comments") or []
            user_id = review_data.get("user_id") or "anonymous"
            
            # 构建初始化数据
            review_data = CodeReviewCreate(
                github_action_id=github_action_id,
                pr_number=pr_number,
                repo_owner=repo_owner,
                repo_name=repo_name,
                author=author,
                diff_content=diff_content,
                pr_title=pr_title,
                pr_body=pr_body,
                readme_content=readme_content,
                comments=comments
            )
            
            # 创建记录
            result = await self.code_review_service.create_review(review_data, user_id)
            if result:
                logger.info("成功创建初始化审查记录，审查ID: %s", github_action_id)
                return True
            else:
                logger.error("创建初始化审查记录失败")
                return False
                
        except Exception as e:
            logger.exception("创建初始化审查记录时出错: %s", e)
            return False

    async def _save_complete_review_result(self, review_id: str, agent_outputs: Dict[str, str], final_result: Dict[str, Any]) -> bool:
        """一次性保存完整的审查结果"""
        try:
            from app.models.codereview import AgentOutput, CodeReviewUpdate
            
            # 构建agent输出列表（转换为字典格式）
            agent_output_list = []
            for agent_name, content in agent_outputs.items():
                # 解析agent类型
                agent_type = "reviewer" if "reviewer" in agent_name.lower() else "aggregator" if "aggregator" in agent_name.lower() else "assessor" if "assess" in agent_name.lower() else "dispatcher" if "dispatch" in agent_name.lower() else "general"
                
                # 尝试解析为JSON，否则作为字符串处理
                try:
                    import json
                    parsed_content = json.loads(content)
                    # 如果解析结果是列表，将其包装在字典中
                    if isinstance(parsed_content, list):
                        output_content = {"content": parsed_content}
                    elif isinstance(parsed_content, dict):
                        output_content = parsed_content
                    else:
                        output_content = {"raw_output": str(parsed_content)}
                except:
                    output_content = {"raw_output": content}
                
                # 创建AgentOutput对象并转换为字典
                agent_output = AgentOutput(
                    agent_name=agent_name,
                    agent_type=agent_type,
                    output_content=output_content,
                    status="final"
                )
                # 转换为字典格式以符合Pydantic模型要求
                agent_output_dict = agent_output.model_dump()
                agent_output_list.append(agent_output_dict)
            
            # 确保final_result是字典格式
            if isinstance(final_result, str):
                try:
                    import json
                    final_result = json.loads(final_result)
                except:
                    final_result = {"raw_result": final_result}
            
            # 构建更新数据
            update_data = CodeReviewUpdate(
                agent_outputs=agent_output_list,
                final_result=final_result,
                status="completed"
            )
            
            # 一次性更新记录
            success = await self.code_review_service.update_review(review_id, update_data)
            if success:
                logger.info("成功保存完整审查结果，审查ID: %s", review_id)
            else:
                logger.error("保存完整审查结果失败，审查ID: %s", review_id)
            
            return success
                
        except Exception as e:
            logger.exception("保存完整审查结果时出错: %s", e)
            return False
    
    async def _save_agent_buffer_to_db(self, review_id: str, buf: AgentBuffer, final: bool = False):
        """保存agent buffer到数据库"""
        try:
            from app.models.codereview import AgentOutput  # 你的 ORM model
        except Exception:
            AgentOutput = None

        full_content = buf.full_text()
        status = "final" if final else "completed"

        if AgentOutput is not None and hasattr(self.code_review_service, "add_agent_output"):
            try:
                # 解析agent类型（从agent_name推断）
                agent_type = "reviewer" if "reviewer" in buf.agent_name.lower() else "aggregator" if "aggregator" in buf.agent_name.lower() else "assessor" if "assess" in buf.agent_name.lower() else "dispatcher" if "dispatch" in buf.agent_name.lower() else "general"
                
                # 尝试解析output_content为字典或列表，如果失败则作为字符串处理
                try:
                    import json
                    parsed_content = json.loads(full_content)
                    # 如果解析结果是列表，将其包装在字典中
                    if isinstance(parsed_content, list):
                        output_content = {"content": parsed_content}
                    elif isinstance(parsed_content, dict):
                        output_content = parsed_content
                    else:
                        output_content = {"raw_output": str(parsed_content)}
                except:
                    output_content = {"raw_output": full_content}
                
                # 创建AgentOutput对象并转换为字典格式
                agent_output = AgentOutput(
                    agent_name=buf.agent_name,
                    agent_type=agent_type,
                    output_content=output_content,
                    status=status
                )
                # 转换为字典格式以符合Pydantic模型要求
                agent_output_dict = agent_output.model_dump()
                await self.code_review_service.add_agent_output(review_id, agent_output_dict)
                logger.debug("已保存 %s 输出到数据库", buf.agent_name)
            except Exception:
                logger.exception("保存 agent 输出到数据库失败（将跳过）")
        else:
            # 兜底：如果没有你的 ORM，可尝试将结果写到本地文件夹以便调试
            try:
                safe_name = buf.agent_name.replace(" ", "_").replace("/", "_")
                path = Path(".") / f"debug_{safe_name}_{int(time.time())}.txt"
                with open(path, "w", encoding="utf-8") as f:
                    f.write(full_content)
                logger.warning("code_review_service or AgentOutput 模型不可用，已写入本地文件：%s", path)
            except Exception:
                logger.exception("写本地文件也失败了")

    async def save_complete_review_report(self, review_data: Dict[str, Any], output_dir: Path) -> bool:
        """保存完整审查报告
        
        Args:
            review_data: 审查报告数据
            output_dir: 输出目录（用于兜底保存）
            
        Returns:
            bool: 操作是否成功
        """
        try:
            logger.debug("开始保存完整审查报告，审查ID: %s", review_data.get("review_id"))
            logger.debug("agent输出数量: %d", len(review_data.get("agent_outputs_meta", {})))
            
            logger.debug("构建的审查报告数据: %s", {
                "review_id": review_data.get("review_id"),
                "final_result_length": len(review_data.get("final_result", "")) if review_data.get("final_result") else 0,
                "agent_outputs_count": len(review_data.get("agent_outputs_meta", {})),
                "task_preview_length": len(review_data.get("task_preview", "")) if review_data.get("task_preview") else 0
            })
            
            if hasattr(self.code_review_service, "add_review_report"):
                success = await self.code_review_service.add_review_report(review_data)
                if success:
                    logger.info("成功保存完整审查报告到数据库，审查ID: %s", review_data.get("review_id"))
                else:
                    logger.error("保存完整审查报告到数据库失败，审查ID: %s", review_data.get("review_id"))
                return success
            else:
                # 兜底：写到本地（仅在测试时使用）
                p = output_dir / f"review_{review_data.get('review_id', int(time.time()))}.json"
                with open(p, "w", encoding="utf-8") as f:
                    json.dump(review_data, f, ensure_ascii=False, indent=2)
                logger.warning("code_review_service lacks add_review_report; wrote local file: %s", p)
                return True  # 本地保存视为成功
        except Exception as e:
            logger.exception("保存完整审查报告失败: %s", e)
            return False

    # ---------------------------
    # 辅助方法
    # ---------------------------
    def _build_complete_report(self, request: ReviewRequest, agent_outputs: Dict[str, str]) -> Dict[str, Any]:
        """构建完整报告"""
        return {
            "review_id": request.review_id,
            "author": request.author,
            "github_action_id": request.github_action_id,
            "pr_number": request.pr_number,
            "repo_owner": request.repo_owner,
            "repo_name": request.repo_name,
            "pr_title": request.pr_title,
            "pr_body": request.pr_body,
            "user_id": request.user_id,
            "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
            "task_preview": request.code_diff[:200] + "..." if len(request.code_diff) > 200 else request.code_diff,
            "agent_outputs_meta": {k: {"len": len(v)} for k, v in agent_outputs.items()},
            "final_result": agent_outputs.get("FinalReviewAggregatorAgent", "未生成")
        }