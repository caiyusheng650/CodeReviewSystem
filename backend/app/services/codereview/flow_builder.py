# codereview/flow_builder.py

from typing import List
from autogen_agentchat.agents import AssistantAgent
from autogen_agentchat.teams import SelectorGroupChat
from autogen_ext.models.openai import OpenAIChatCompletionClient
from autogen_core.models import ModelFamily
from autogen_core.tools import FunctionTool
from autogen_agentchat.conditions import MaxMessageTermination, TextMentionTermination

try:
    # 尝试相对导入（当作为包的一部分时）
    from .config import API_MODEL_NAME, API_API_KEY, API_API_BASE, get_system_prompt
    from .line_number_calculator import LineNumberAgent
except ImportError:
    # 绝对导入（当直接运行脚本时）
    from config import API_MODEL_NAME, API_API_KEY, API_API_BASE, get_system_prompt
    from line_number_calculator import LineNumberAgent

# 全局行号智能体实例
line_number_agent = LineNumberAgent()

def calculate_line_number_tool(diff_content: str, target_content: str) -> dict:
    """
    从diff内容中直接找出目标行内容的位置
    
    Args:
        diff_content: PR的diff内容
        target_content: 要查找的目标行内容
        
    Returns:
        dict: 包含行号信息的查找结果
        contexts: 包含目标行上下文三行，分别为目标行前一行、目标行和目标行后一行

    """
    # 添加详细的日志记录
    print(f"🔍 计算器工具被调用 - 目标内容: '{target_content}'")
    print(f"📊 Diff内容长度: {len(diff_content)} 字符")
    
    # 使用严格的diff解析器查找目标行
    results = line_number_agent.calculator.find_line_by_content(diff_content, target_content)
    
    # 如果没有找到匹配的行，返回失败
    if not results:
        print(f"❌ 未找到匹配的目标内容: '{target_content}'")
        return {
            "success": False,
            "file_path": "",
            "line_number": -1,
            "context": [],
            "error": "未找到匹配的行"
        }
    
    file_path = results["file_path"]
    line_number = results["line_number"]
    exact_match = results.get("exact_match", False)
    matched_content = results.get("matched_content", "")
    
    print(f"✅ 找到匹配 - 文件: {file_path}, 行号: {line_number}")
    print(f"📝 匹配内容: '{matched_content}' (精确匹配: {exact_match})")
    
    # 获取上下文（前后各一行）
    context = line_number_agent.calculator.get_context_lines(diff_content, file_path, line_number, context_size=1)
    
    return {
        "success": True,
        "file_path": file_path,
        "line_number": line_number,
        "context": context,
        "exact_match": exact_match,
        "matched_content": matched_content
    }
        


def build_agent(name: str, key: str) -> AssistantAgent:
    # 创建工具列表
    tools = [
        FunctionTool(calculate_line_number_tool, description="从pull request diff内容中直接查找目标行内容的位置，支持文件过滤。注意：target参数只能接收单行内容，不支持多行内容，请输入简短的target参数。"),
    ]
    
    # 为关键agent设置更具体的描述
    descriptions = {
        "ReviewTaskDispatcherAgent": "代码审查任务调度器，负责分析PR内容并将审查任务分配给合适的专业审查agent",
        "FinalReviewAggregatorAgent": "最终审查结果聚合器，负责收集和整合所有专业审查agent的意见，生成完整的最终审查报告"
    }
    
    return AssistantAgent(
        name,
        description=descriptions.get(name, f"{name}"),
        model_client=model_client,
        system_message=get_system_prompt(key),
        tools=tools
    )

def build_deepseek_agent(name: str, key: str) -> AssistantAgent:
    # 创建工具列表
    tools = [
        FunctionTool(calculate_line_number_tool, description="从diff内容中直接查找目标行内容的位置，支持文件过滤。注意：target参数只能接收单行内容，不支持多行内容。")
    ]
    
    # 根据agent名称设置描述
    descriptions = {
        "ReputationAssessmentAgent": "负责评估开发者声誉和历史表现",
        "StaticAnalysisReviewAgent": "负责进行代码静态分析，检查语法和格式问题",
        "LogicErrorReviewAgent": "负责检查代码逻辑错误和边界条件",
        "MemorySafetyReviewAgent": "负责检查内存使用安全和资源管理问题",
        "SecurityVulnerabilityReviewAgent": "负责识别潜在的安全漏洞和风险",
        "PerformanceOptimizationReviewAgent": "负责评估代码性能和优化建议",
        "MaintainabilityReviewAgent": "负责评估代码可维护性和最佳实践",
        "ArchitectureReviewAgent": "负责评估系统架构和设计模式"
    }
    
    return AssistantAgent(
        name,
        description=descriptions.get(name, f"{name} - specialized in code review"),
        model_client=deepseek_model_client,
        system_message=get_system_prompt(key),
        tools=tools
    )

model_client = OpenAIChatCompletionClient(
    #model=API_MODEL_NAME,
    model="MiniMaxAI/MiniMax-M2",
    api_key=API_API_KEY,
    base_url=API_API_BASE,
    model_info={
        "vision": False,
        "function_calling": True,
        "json_output": True,
        "family": ModelFamily.UNKNOWN,
        "structured_output": True,
    },
    max_retries=2,
    max_tokens=202750
    # 移除response_format参数，以避免与前缀冲突
    # 如果需要JSON输出，可以在系统提示中明确要求而不是使用response_format
)

# DeepSeek-V3.1-Terminus model client for analysis agents
deepseek_model_client = OpenAIChatCompletionClient(
    model="MiniMaxAI/MiniMax-M2",
    api_key=API_API_KEY,
    base_url=API_API_BASE,
    model_info={
        "vision": False,
        "function_calling": True,
        "json_output": True,
        "family": ModelFamily.UNKNOWN,
        "structured_output": True,
    },
    max_retries=2,
    max_tokens=163839
    # 移除response_format参数，以避免与前缀冲突
    # 如果需要JSON输出，可以在系统提示中明确要求而不是使用response_format
)

# 使用默认模型的agent
review_task_dispatcher_agent = build_agent("ReviewTaskDispatcherAgent", "review_task_dispatcher_agent")

final_review_aggregator_agent = build_agent("FinalReviewAggregatorAgent", "final_review_aggregator_agent")

# 使用DeepSeek模型的8个分析agent
reputation_assessment_agent = build_deepseek_agent("ReputationAssessmentAgent", "reputation_assessment_agent")
static_analysis_agent = build_deepseek_agent("StaticAnalysisReviewAgent", "static_analysis_agent")
logic_error_agent = build_deepseek_agent("LogicErrorReviewAgent", "logic_error_agent")
memory_safety_agent = build_deepseek_agent("MemorySafetyReviewAgent", "memory_safety_agent")
security_vulnerability_agent = build_deepseek_agent("SecurityVulnerabilityReviewAgent", "security_vulnerability_agent")
performance_optimization_agent = build_deepseek_agent("PerformanceOptimizationReviewAgent", "performance_optimization_agent")
maintainability_agent = build_deepseek_agent("MaintainabilityReviewAgent", "maintainability_agent")
architecture_agent = build_deepseek_agent("ArchitectureReviewAgent", "architecture_agent")

def create_default_flow() -> SelectorGroupChat:
    
    # 收集所有参与者
    participants = [
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
    
    # 自定义选择器提示，帮助模型更好地选择下一个发言者
    custom_selector_prompt = """
    基于当前对话历史和参与者的角色描述，选择最合适的下一个发言者。
    
    可用角色：
    {roles}
    
    他们的职责描述：
    {participants}
    
    当前对话历史：
    {history}
    
    请根据以下规则选择下一个发言者：
    1. 第一步：必须选择ReviewTaskDispatcherAgent分析任务并分配工作
    2. 第二步：所有专业审查agent（除了ReviewTaskDispatcherAgent和FinalReviewAggregatorAgent）必须依次发言，提供他们的专业分析
    3. 第三步：只有当所有专业审查agent都已发言完成后，才能选择FinalReviewAggregatorAgent来汇总最终结果
    4. 确保不同的专业审查agent都有机会参与，避免重复选择同一专业领域的agent
    5. 如果最后一个发言者是ReviewTaskDispatcherAgent，必须选择一个尚未发言的专业审查agent
    6. 如果所有专业审查agent都已发言，则必须选择FinalReviewAggregatorAgent来结束讨论
    7. 在专业审查阶段，优先选择与当前讨论主题最相关的专业agent
    
    请直接返回所选agent的名称，不要包含其他内容。
    """
    termination = TextMentionTermination("```json",sources=["FinalReviewAggregatorAgent"])
    # 创建SelectorGroupChat实例
    flow = SelectorGroupChat(
        participants=participants,
        allow_repeated_speaker=False,
        model_client=model_client,
        selector_prompt=custom_selector_prompt,
        termination_condition=termination,
    )
    
    return flow


async def main():
    """
    主函数 - 运行代码审查流程并添加详细日志
    """
    print("🚀 开始创建默认流程...")
    flow = create_default_flow()
    print("✅ 流程创建完成")
    
    # 创建更复杂的测试任务，包含多个文件和复杂变更
    print("📝 创建复杂测试任务...")
    test_task = """
    {
        "code_diff": "diff --git a/src/main.py b/src/main.py\\nindex 123abc..456def 100644\\n--- a/src/main.py\\n+++ b/src/main.py\\n@@ -10,15 +10,18 @@ class UserService:\\n     def __init__(self, db_connection):\\n         self.db = db_connection\\n         self.cache = {}\\n \\n-    def get_user(self, user_id):\\n+    def get_user(self, user_id, include_deleted=False):\\n         \\\"\\\"\\\"Get user by ID\\\"\\\"\\\"\\n         if user_id in self.cache:\\n             return self.cache[user_id]\\n         \\n         query = \\\"SELECT * FROM users WHERE id = %s\\\"\\n+        if not include_deleted:\\n+            query += \\\" AND deleted_at IS NULL\\\"\\n+        \\n         result = self.db.execute(query, (user_id,))\\n         user = result.fetchone()\\n         \\n         if user:\\n+            user['last_accessed'] = datetime.now()\\n             self.cache[user_id] = user\\n             return user\\n         return None\\ndiff --git a/src/utils.py b/src/utils.py\\nindex 789abc..012def 100644\\n--- a/src/utils.py\\n+++ b/src/utils.py\\n@@ -5,8 +5,12 @@ def calculate_discount(price, discount_rate):\\n     Calculate discount amount\\n     \\\"\\\"\\\"\\n     if discount_rate < 0 or discount_rate > 1:\\n-        raise ValueError(\\\"Discount rate must be between 0 and 1\\\")\\n+        return 0\\n     \\n-    return price * discount_rate\\n+    if price < 0:\\n+        return 0\\n+        \\n+    discount_amount = price * discount_rate\\n+    return max(0, min(discount_amount, price))\\n \\n def format_currency(amount):\\n     \\\"\\\"\\\"Format amount as currency\\\"\\\"\\\"\\ndiff --git a/src/auth.py b/src/auth.py\\nindex 345abc..678def 100644\\n--- a/src/auth.py\\n+++ b/src/auth.py\\n@@ -20,7 +20,11 @@ def validate_token(token):\\n         payload = jwt.decode(token, SECRET_KEY, algorithms=['HS256'])\\n         return payload\\n     except jwt.ExpiredSignatureError:\\n-        raise AuthenticationError(\\\"Token has expired\\\")\\n+        # Check if token is in grace period\\\n+        grace_payload = jwt.decode(token, SECRET_KEY, options={'verify_exp': False})\\n+        if time.time() - grace_payload['exp'] < 300:  # 5 minute grace period\\n+            return grace_payload\\n+        raise AuthenticationError(\\\"Token has expired\\\")\\n     except jwt.InvalidTokenError:\\n         raise AuthenticationError(\\\"Invalid token\\\")",
        "pr_comments": ["这个PR看起来有很多复杂的逻辑变更", "需要仔细审查数据库查询和用户认证逻辑的变更"],
        "developer_reputation_score": 75,
        "developer_reputation_history": ["PR#1: 代码质量良好", "PR#2: 引入了小的性能优化"],
        "repository_readme": "# 复杂的Web应用项目\\n\\n这是一个包含用户管理、认证和支付功能的复杂Web应用。"
    }
    """
    
    print("🎯 开始运行复杂流程...")
    print("📊 预期将调用计算器工具进行行号计算...")
    print("🔍 监控工具调用情况...")
    
    # 运行流程并收集日志
    stream = flow.run_stream(task=test_task)
    
    print("🔥 开始Console输出监控...")
    
    # 使用Console监控输出
    await Console(stream)

if __name__ == "__main__":
    import asyncio
    from autogen_agentchat.ui import Console
    print("🎯 启动代码审查流程测试...")
    asyncio.run(main())

    