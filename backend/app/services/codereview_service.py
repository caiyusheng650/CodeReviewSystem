from typing import Dict, List, Optional, Any
import os
import autogen
import json
import re
from fastapi import HTTPException

class CodeReviewService:
    @staticmethod
    def generate_review_issues(diff: str, comments: List[Dict[str, Any]], reputation_score: int, programmer_reputation_history: List[str], readme: Optional[str] = None) -> List[Dict[str, Any]]:
        # 配置autogen
        openai_api_key = os.getenv("OPENAI_API_KEY")
        if not openai_api_key:
            raise HTTPException(status_code=500, detail="OpenAI API key is not configured")

        config_list = [
            {
                "model": "gpt-4",
                "api_key": openai_api_key
            }
        ]

        # 创建代理
        assistant = autogen.AssistantAgent(
            name="assistant",
            llm_config={
                "config_list": config_list,
                "temperature": 0.7,
                "top_p": 0.9,
                "max_tokens": 1500
            }
        )

        user_proxy = autogen.UserProxyAgent(
            name="user_proxy",
            code_execution_config=False,
            human_input_mode="NEVER"
        )

        # 生成代码审查请求
        prompt = f"""
        请对以下代码进行审查，并按照指定格式返回结果。

        代码差异：
        {diff}

        已有评论：
        {comments}

        程序员 reputation 分数：{reputation_score}
        程序员 reputation 历史：{programmer_reputation_history}
        README 文件内容：{readme if readme else '无'}

        请从以下几个方面进行审查：
        1. 代码质量（命名规范、注释、可读性）
        2. 安全性（潜在漏洞）
        3. 性能（优化建议）
        4. 逻辑完整性（异常处理、边界情况）
        5. 最佳实践（设计模式、模块化）

        对于每个问题/优点，请返回以下格式的 JSON 对象列表：
        [
            {
                "file": "文件名",
                "line": 行号,
                "bug_type": "bug类型",
                "description": "问题/优点描述",
                "suggestion": "建议/鼓励",
                "severity": "严重程度（高/中/低/表扬）"
            },
            ...
        ]

        注意：
        - 确保返回的是严格的 JSON 格式
        - bug_type 可以是：static_defect、logical_defect、security_vulnerability、performance_issue、praise
        - severity 可以是：高、中、低、表扬
        - 行号如果不确定可以写 0
        - 如果没有发现问题，返回空列表
        """

        # 发起对话
        response = user_proxy.initiate_chat(
            assistant,
            message=prompt,
            max_turns=1
        )

        # 解析响应
        try:
            # 获取最后一条消息
            last_message = response.chat_history[-1].content
            # 提取JSON部分
            json_match = re.search(r'\[.*\]', last_message, re.DOTALL)
            if json_match:
                json_str = json_match.group()
                return json.loads(json_str)
            else:
                # 如果没有JSON格式，返回空列表
                return []
        except Exception as e:
            # 解析失败，返回空列表
            return []

# 创建全局实例
codereview_service = CodeReviewService()