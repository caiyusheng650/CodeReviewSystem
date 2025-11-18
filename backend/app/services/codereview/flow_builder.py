# codereview/flow_builder.py

from typing import List
from autogen_agentchat.agents import AssistantAgent
from autogen_agentchat.teams import DiGraphBuilder, GraphFlow
from autogen_ext.models.openai import OpenAIChatCompletionClient
from autogen_core.models import ModelFamily

from .config import API_MODEL_NAME, API_API_KEY, API_API_BASE, get_system_prompt

def build_agent(name: str, key: str) -> AssistantAgent:
    return AssistantAgent(
        name,
        model_client=model_client,
        system_message=get_system_prompt(key)
    )

model_client = OpenAIChatCompletionClient(
    model=API_MODEL_NAME,
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
    response_format={"type": "json_object"}
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

def create_default_flow() -> GraphFlow:
    
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
    
    flow = GraphFlow(
        participants=builder.get_participants(),
        graph=execution_graph,
    )
    
    return flow

def get_flow_builder():
    return DiGraphBuilder()