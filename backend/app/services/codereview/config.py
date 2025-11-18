# review/config.py
# 配置和常量模块

import os
import dotenv
import logging
from typing import Dict

# 加载环境变量
dotenv.load_dotenv()

# ---------------------------
# Logger 配置
# ---------------------------
logger = logging.getLogger("ai_code_review")

# 初始化logger（避免重复创建handler）
def setup_logger():
    """设置日志配置"""
    if not logger.handlers:
        handler = logging.StreamHandler()
        handler.setFormatter(logging.Formatter("%(asctime)s [%(levelname)s] %(message)s"))
        logger.addHandler(handler)
        logger.setLevel(logging.INFO)

# 静音 AutoGen 控制台输出
def silence_autogen_console():
    """静音AutoGen控制台输出"""
    SILENCE_AGENT_CONSOLE = os.getenv("SILENCE_AGENT_CONSOLE", "1").lower() in ("1", "true")
    
    if SILENCE_AGENT_CONSOLE:
        # 静音 autogen 相关日志
        for lib_name in ["autogen_agentchat", "autogen_core"]:
            logging.getLogger(lib_name).setLevel(logging.WARNING)
        
        # 静音 Console 输出
        from autogen_agentchat.ui import Console
        for method_name in ["log", "print"]:
            if hasattr(Console, method_name):
                setattr(Console, method_name, lambda *a, **k: None)

# ---------------------------
# API 配置
# ---------------------------
API_MODEL_NAME = os.getenv("AI_MODEL")
API_API_KEY = os.getenv("AI_API_KEY")
API_API_BASE = os.getenv("AI_API_URL")

# ---------------------------
# 系统提示词
# ---------------------------
JSON_ONLY_INSTRUCTION = "\n\n重要提示：您必须仅输出一个有效的 JSON 对象，除此之外不要输出任何内容。如遇优质代码，也可给予表扬。"

SYSTEM_PROMPTS: Dict[str, str] = {
    "reputation_assessment_agent": (
        """
You are ReputationAssessmentAgent — a code-review reputation & risk assessor.
Output schema:
{
  "risk_level": "high|medium|low|praise",
  "focus_areas": ["security","logic","performance",...],
  "notes": "short explanation"
}
""" + JSON_ONLY_INSTRUCTION
    ),

    "review_task_dispatcher_agent": (
        """
You are ReviewTaskDispatcherAgent.
You must output tasks with correct labels.
Output schema:
{
  "tasks": {
    "static": {"label":"[TO:static]","instruction":"..."},
    "logic": {"label":"[TO:logic]","instruction":"..."},
    "memory": {"label":"[TO:memory]","instruction":"..."},
    "security": {"label":"[TO:security]","instruction":"..."},
    "performance": {"label":"[TO:performance]","instruction":"..."},
    "maintainability": {"label":"[TO:maintainability]","instruction":"..."},
    "architecture": {"label":"[TO:architecture]","instruction":"..."},
  }
}
""" + JSON_ONLY_INSTRUCTION
    ),

    "static_analysis_agent": (
        """
You are StaticAnalysisReviewAgent.
Output: JSON array of issues.
Each item:
{
  "file":"...",
  "line": 123,
  "bug_type": "static_defect",
  "description":"...",
  "suggestion":"...",
  "severity":"轻度|中等|严重|表扬"
}
""" + JSON_ONLY_INSTRUCTION
    ),

    "logic_error_agent": (
        """
You are LogicErrorReviewAgent.
Use bug_type:"logical_defect".
""" + JSON_ONLY_INSTRUCTION
    ),

    "memory_safety_agent": (
        """
You are MemorySafetyReviewAgent.
Use bug_type:"memory_defect".
""" + JSON_ONLY_INSTRUCTION
    ),

    "security_vulnerability_agent": (
        """
You are SecurityVulnerabilityReviewAgent.
Use bug_type:"security_vulnerability".
""" + JSON_ONLY_INSTRUCTION
    ),

    "performance_optimization_agent": (
        """
You are PerformanceOptimizationReviewAgent.
Use bug_type:"performance_issue".
""" + JSON_ONLY_INSTRUCTION
    ),

    "maintainability_agent": (
        """
You are MaintainabilityReviewer.
Use bug_type:"maintainability_issue".
""" + JSON_ONLY_INSTRUCTION
    ),

    "architecture_agent": (
        """
You are ArchitectureReviewer.
Use bug_type:"architecture_issue".
""" + JSON_ONLY_INSTRUCTION
    ),

    "final_review_aggregator_agent": (
        """
You are FinalReviewAggregatorAgent.
You merge all JSON arrays into a single list.

Rules:
1. Parse every message as JSON array. Ignore if fail.
2. Merge arrays.
3. Deduplicate by (file, line, bug_type).
4. If duplicates exist, keep the one with highest severity.
5. Minimize duplicate comments
6. Output only the final JSON array.

IMPORTANT: Output ONLY JSON. 最后的输出json的value值请用中文，键值对的键请用原英文。万分感谢。
"""
    ),
}

def get_system_prompt(key: str) -> str:
    """获取系统提示词"""
    return SYSTEM_PROMPTS.get(key, "")