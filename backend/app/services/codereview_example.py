import os
import json
import dotenv
import asyncio
import time
import aiofiles
from pathlib import Path
from typing import List, Dict, Any

# AutoGen v0.7.5 imports
from autogen_agentchat.agents import AssistantAgent
from autogen_agentchat.teams import DiGraphBuilder, GraphFlow
from autogen_agentchat.ui import Console

from autogen_ext.models.openai import OpenAIChatCompletionClient
from autogen_core.models import ModelFamily


# Load .env
dotenv.load_dotenv()

# ---------------------------
# 1) Model client
# ---------------------------
API_MODEL_NAME = os.getenv("AI_MODEL")
API_API_KEY = os.getenv("AI_API_KEY")
API_API_BASE = os.getenv("AI_API_URL")

print(API_MODEL_NAME)
print(API_API_KEY)
print(API_API_BASE)

model_client = OpenAIChatCompletionClient(
    model=API_MODEL_NAME,
    api_key=API_API_KEY,
    base_url=API_API_BASE,
    model_info={
        "vision": False,
        "function_calling": True,
        "json_output": True,
        "family": ModelFamily.UNKNOWN,
        "structured_output": False,
    },
    max_retries=2,
    response_format={"type": "json_object"}

)

# ---------------------------
# 2) Prompts
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

IMPORTANT: Output ONLY JSON. 最后的输出请用中文，万分感谢。
"""
    ),
}

# ---------------------------
# 3) Agents
# ---------------------------

def build_agent(name: str, key: str):
    return AssistantAgent(
        name,
        model_client=model_client,
        system_message=SYSTEM_PROMPTS[key],
    )

reputation_assessment_agent = build_agent("ReputationAssessmentAgent", "reputation_assessment_agent")
review_task_dispatcher_agent = build_agent("ReviewTaskDispatcherAgent", "review_task_dispatcher_agent")
static_analysis_agent = build_agent("StaticAnalysisReviewAgent", "static_analysis_agent")
logic_error_agent = build_agent("LogicErrorReviewAgent", "logic_error_agent")
memory_safety_agent = build_agent("MemorySafetyReviewAgent", "memory_safety_agent")
security_vulnerability_agent = build_agent("SecurityVulnerabilityReviewAgent", "security_vulnerability_agent")
performance_optimization_agent = build_agent("PerformanceOptimizationReviewAgent", "performance_optimization_agent")
maintainability_agent = build_agent("MaintainabilityReviewer", "maintainability_agent")
architecture_agent = build_agent("ArchitectureReviewer", "architecture_agent")
final_review_aggregator_agent = build_agent("FinalReviewAggregatorAgent", "final_review_aggregator_agent")

# ---------------------------
# 4) Graph
# ---------------------------

builder = DiGraphBuilder()

agents = [
    reputation_assessment_agent,
    review_task_dispatcher_agent,
    static_analysis_agent,
    logic_error_agent,
    memory_safety_agent,
    security_vulnerability_agent,
    performance_optimization_agent,
    maintainability_agent,
    architecture_agent,
    final_review_aggregator_agent,
]

for a in agents:
    builder.add_node(a)

# Execution edges
builder.add_edge(reputation_assessment_agent, review_task_dispatcher_agent)

reviewers = [
    static_analysis_agent,
    logic_error_agent,
    memory_safety_agent,
    security_vulnerability_agent,
    performance_optimization_agent,
    maintainability_agent,
    architecture_agent,
]

for r in reviewers:
    builder.add_edge(review_task_dispatcher_agent, r)
    builder.add_edge(r, final_review_aggregator_agent)

execution_graph = builder.build()

# ---------------------------
# 5) Build prompt
# ---------------------------

def build_prompt(
    code_diff: str,
    pr_comments: List[Dict[str, Any]],
    developer_reputation_score: int,
    developer_reputation_history: List[str],
    repository_readme: str,
) -> str:

    comments_preview = pr_comments[:20]
    history_preview = developer_reputation_history[:10]

    if developer_reputation_score >= 80:
        rep_label = "high"
    elif developer_reputation_score >= 60:
        rep_label = "medium"
    else:
        rep_label = "low"

    payload = {
        "metadata": {
            "developer_reputation_label": rep_label,
            "developer_reputation_history": history_preview,
        },
        "repository_readme_excerpt": repository_readme[:4000],
        "pr_comments": comments_preview,
        "code_diff": code_diff[:40000],
    }
    return json.dumps(payload, ensure_ascii=False, indent=2)

# ---------------------------
# 6) GraphFlow (修复版)
# ---------------------------

flow = GraphFlow(
    participants=builder.get_participants(),
    graph=execution_graph,
)

# ---------------------------
# 7) 文件保存功能
# ---------------------------

def create_output_directory(project_name: str = "default") -> Path:
    """创建输出目录"""
    output_dir = Path("output") / project_name
    output_dir.mkdir(parents=True, exist_ok=True)
    return output_dir

async def save_agent_output(agent_name: str, content: str, output_dir: Path):
    """保存agent输出到文件"""
    try:
        filename = f"{agent_name}.json"
        filepath = output_dir / filename
        
        # 尝试解析JSON，如果失败则作为文本保存
        try:
            parsed_content = json.loads(content)
            async with aiofiles.open(filepath, 'w', encoding='utf-8') as f:
                await f.write(json.dumps(parsed_content, ensure_ascii=False, indent=2))
        except json.JSONDecodeError:
            # 如果不是JSON，则作为文本保存
            text_filename = filename.replace('.json', '.txt')
            text_filepath = output_dir / text_filename
            async with aiofiles.open(text_filepath, 'w', encoding='utf-8') as f:
                await f.write(content)
        
        print(f"✅ 已保存 {agent_name} 输出到: {filepath}")
        return str(filepath)
    except Exception as e:
        print(f"❌ 保存 {agent_name} 输出失败: {str(e)}")
        return None

async def save_complete_review_report(review_data: Dict[str, Any], output_dir: Path):
    """保存完整的审查报告"""
    try:
        timestamp = int(time.time())
        filename = f"完整审查报告_{timestamp}.json"
        filepath = output_dir / filename
        
        async with aiofiles.open(filepath, 'w', encoding='utf-8') as f:
            await f.write(json.dumps(review_data, ensure_ascii=False, indent=2))
        print(f"✅ 已保存完整审查报告到: {filepath}")
        return str(filepath)
    except Exception as e:
        print(f"❌ 保存完整审查报告失败: {str(e)}")
        return None

# ---------------------------
# 8) Example tasks
# ---------------------------

async def complex_business_logic_example() -> str:
    code_diff = """
diff --git a/services/data_pipeline.py b/services/data_pipeline.py
new file mode 100644
index 0000000..bcdefg1
--- /dev/null
+++ b/services/data_pipeline.py
@@ -0,0 +1,35 @@
import pandas as pd
import json
from typing import List, Dict, Any
import asyncio
import aiofiles

class DataPipeline:
    def __init__(self, source_path: str):
        self.source_path = source_path
        self.processed_data = []
        self.errors = []
    
    async def load_data(self) -> List[Dict[str, Any]]:
        "异步加载JSON数据文件"
        try:
            async with aiofiles.open(self.source_path, 'r') as f:
                content = await f.read()
                return json.loads(content)
        except Exception as e:
            self.errors.append(f"加载数据失败: {str(e)}")
            return []
    
    def transform_data(self, raw_data: List[Dict]) -> pd.DataFrame:
        "转换数据为DataFrame格式"
        if not raw_data:
            return pd.DataFrame()
        
        # 提取特定字段并转换
        transformed = []
        for item in raw_data:
            try:
                new_item = {
                    'id': item.get('id'),
                    'name': item.get('name', '').upper(),
                    'value': float(item.get('value', 0)),
                    'category': item.get('category', 'unknown')
                }
                transformed.append(new_item)
            except (ValueError, TypeError) as e:
                self.errors.append(f"数据转换错误: {str(e)}")
        
        return pd.DataFrame(transformed)
    
    async def run_pipeline(self) -> Dict[str, Any]:
        "执行完整的数据处理管道"
        raw_data = await self.load_data()
        df = self.transform_data(raw_data)
        
        return {
            'data': df.to_dict('records'),
            'count': len(df),
            'errors': self.errors
        }
"""
    pr_comments = [
        {'body': '缺少数据验证机制，可能导致空值或异常数据', 'id': 1, 'line': 18, 'path': 'services/data_pipeline.py'},
        {'body': 'transform_data方法中的异常处理过于宽泛', 'id': 2, 'line': 26, 'path': 'services/data_pipeline.py'},
        {'body': '建议添加数据备份和恢复机制', 'id': 3, 'line': 10, 'path': 'services/data_pipeline.py'},
        {'body': '异步处理实现良好，但可以添加进度回调', 'id': 4, 'line': 33, 'path': 'services/data_pipeline.py'}
    ]
    developer_reputation_score = 72
    developer_reputation_history = [
        'PR#25：1个严重问题，2个中等问题',
        'PR#24：代码质量良好，无严重问题',
        'PR#23：3个中等问题，1个轻度问题'
    ]
    repository_readme = "# 数据处理平台\n\n本平台提供高效的数据ETL管道，支持多种数据源和格式转换。\n\n## 特性\n- 异步数据处理\n- 多格式数据支持\n- 实时监控和日志记录"

    return build_prompt(
        code_diff,
        pr_comments,
        developer_reputation_score,
        developer_reputation_history,
        repository_readme,
    )

# ---------------------------
# 9) Main
# ---------------------------

async def collect_and_save_agent_outputs(flow, task: str):
    """收集并保存所有agent的输出"""
    output_dir = create_output_directory()
    agent_outputs = {}
    
    print("\n=== 开始代码审查分析 ===\n")
    
    # 使用流式方式收集输出，同时保存到文件
    current_agent = None
    current_content = []
    all_messages = []
    
    async for message in flow.run_stream(task=task):
        # 收集所有消息
        all_messages.append(message)
        
        # 提取agent名称和内容
        if hasattr(message, 'source') and message.source:
            current_agent = message.source
            
        if hasattr(message, 'content') and message.content:
            content = str(message.content).strip()
            if content:
                # 如果是新的agent开始发言，先保存上一个agent的输出
                if current_agent and len(current_content) > 0:
                    full_content = '\n'.join(current_content)
                    if current_agent not in agent_outputs:
                        await save_agent_output(current_agent, full_content, output_dir)
                        agent_outputs[current_agent] = full_content
                        current_content = []
                
                current_content.append(content)
                
                # 对于FinalReviewAggregatorAgent，特别处理其最终输出
                if current_agent == "FinalReviewAggregatorAgent":
                    # FinalReviewAggregatorAgent的输出通常是最长的，包含了所有聚合内容
                    # 如果内容很长且包含JSON格式，认为是最终输出
                    if len(content) > 100 and ('{' in content or '[' in content):
                        full_content = '\n'.join(current_content)
                        await save_agent_output(current_agent, full_content, output_dir)
                        agent_outputs[current_agent] = full_content
                        current_content = []
                else:
                    # 对于其他agent，检查是否是最终输出（JSON格式）
                    if content.startswith('{') or content.startswith('['):
                        full_content = '\n'.join(current_content)
                        if current_agent and current_agent not in agent_outputs:
                            await save_agent_output(current_agent, full_content, output_dir)
                            agent_outputs[current_agent] = full_content
                        current_content = []
    
    # 保存剩余的内容
    if current_content and current_agent:
        full_content = '\n'.join(current_content)
        if current_agent not in agent_outputs:
            await save_agent_output(current_agent, full_content, output_dir)
            agent_outputs[current_agent] = full_content
    
    # 保存完整报告
    complete_report = {
        "时间戳": time.strftime("%Y-%m-%d %H:%M:%S"),
        "任务": task[:200] + "..." if len(task) > 200 else task,
        "agent输出": agent_outputs,
        "审查结果汇总": {
            "参与的agent数量": len(agent_outputs),
            "包含的agent": list(agent_outputs.keys()),
        },
        "最终审查结果": agent_outputs.get("FinalReviewAggregatorAgent", "未生成")
    }
    
    await save_complete_review_report(complete_report, output_dir)
    
    return agent_outputs

async def main():
    task = await complex_business_logic_example()

    print("\n--- 准备运行代码审查系统 ---\n")
    print("📋 任务内容:")
    print(task[:300] + "..." if len(task) > 300 else task)
    
    # 收集并保存agent输出
    agent_outputs = await collect_and_save_agent_outputs(flow, task)
    
    print("\n--- 审查完成 ---\n")
    print(f"📊 总共收集到 {len(agent_outputs)} 个agent的输出")
    print("📁 所有输出已保存到 'output' 目录")

if __name__ == "__main__":
    asyncio.run(main())
