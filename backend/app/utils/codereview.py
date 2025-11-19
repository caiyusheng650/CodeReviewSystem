"""
代码审查工具函数模块

包含代码审查相关的辅助函数、解析器、统计计算等工具函数
"""

import json
import base64
import logging
from typing import List, Dict, Any, Tuple, Optional

# 配置日志
logger = logging.getLogger(__name__)


def parse_base64_content(base64_str: str) -> str:
    """
    解析Base64编码的内容
    
    Args:
        base64_str: Base64编码的字符串
        
    Returns:
        str: 解码后的内容
    """
    try:
        return base64.b64decode(base64_str.encode()).decode('utf-8')
    except Exception as e:
        logger.error(f"Base64解码失败: {str(e)}")
        return ""


def parse_comments_from_base64(comments_b64: str) -> List[Dict[str, Any]]:
    """
    从Base64编码的字符串解析评论列表
    
    Args:
        comments_b64: Base64编码的评论内容
        
    Returns:
        List[Dict[str, Any]]: 解析后的评论列表
    """
    comments_text = parse_base64_content(comments_b64)
    
    # 尝试解析为JSON，如果不是有效的JSON，则作为单条评论处理
    try:
        comments_data = json.loads(comments_text)
        # 如果是字典，包装成列表
        if isinstance(comments_data, dict):
            return [comments_data]
        # 如果是列表，直接返回
        elif isinstance(comments_data, list):
            return comments_data
        # 其他情况，包装成列表
        else:
            return [{"text": str(comments_data)}]
    except json.JSONDecodeError:
        # 如果不是有效的JSON，作为单条评论处理
        return [{"text": comments_text}]


def parse_ai_output(final_ai_output: str) -> Tuple[List[Dict[str, Any]], Dict[str, int], Dict[str, int]]:
    """
    解析AI输出的代码审查结果
    
    Args:
        final_ai_output: AI输出的JSON字符串
        
    Returns:
        Tuple[List[Dict[str, Any]], Dict[str, int], Dict[str, int]]: 
            (问题列表, 严重性统计, 缺陷类型统计)
    """
    issues = []
    summary = {}
    defect_types = {}

    if not final_ai_output:
        return issues, summary, defect_types

    try:
        issues = json.loads(final_ai_output)
    except json.JSONDecodeError as e:
        logger.error(f"AI输出JSON解析失败: {str(e)}")
        return issues, summary, defect_types

    # 统计部分
    for bug in issues.values():
        if not isinstance(bug, dict):
            continue
        
        severity = bug.get("severity", "")
        bug_type = bug.get("bug_type", "")

        summary[severity] = summary.get(severity, 0) + 1
        defect_types[bug_type] = defect_types.get(bug_type, 0) + 1

    logger.info(f"解析出 {len(issues)} 个问题，{summary}，{defect_types}")
    return issues, summary, defect_types


def calculate_reputation_delta(summary: Dict[str, int]) -> int:
    """
    根据审查结果计算信誉值变化
    
    Args:
        summary: 包含各严重级别问题数量的字典
        
    Returns:
        int: 信誉值变化量
    """
    # 兼容中英文字段，使用get方法避免KeyError
    critical_count = summary.get("严重", 0) + summary.get("critical", 0)
    high_count = summary.get("中等", 0) + summary.get("medium", 0) + summary.get("high", 0)
    low_count = summary.get("轻度", 0) + summary.get("minor", 0)
    praise_count = summary.get("表扬", 0) + summary.get("praise", 0)
    
    # 计算信誉变化量
    delta = (
        critical_count * (-10) + 
        high_count * (-5) + 
        praise_count * 10 + 
        5  # 基础分
    )
    
    return delta


def build_final_result(
    issues: List[Dict[str, Any]], 
    summary: Dict[str, int], 
    defect_types: Dict[str, int], 
    reputation_score: int, 
    delta_reputation: int,
    agent_outputs_count: int
) -> Dict[str, Any]:
    """
    构建最终的审查结果
    
    Args:
        issues: 问题列表
        summary: 统计信息
        defect_types: 缺陷类型统计
        reputation_score: 当前信誉分
        delta_reputation: 信誉变化量
        agent_outputs_count: AI代理输出数量
        
    Returns:
        Dict[str, Any]: 构建的最终结果
    """
    return {
        "issues": issues,
        "summary": summary,
        "defect_types": defect_types,
        "reputation_before": reputation_score,
        "reputation_change": delta_reputation,
        "reputation_after": reputation_score + delta_reputation,
        "recommendation_reason": (
            "代码整体质量良好，未发现严重问题，适合合并。"
            if delta_reputation >= 0
            else "检测到严重问题，可能影响系统稳定性，暂不建议合并。"
        ),
        "conclusion": (
            "智能审查系统建议合并"
            if delta_reputation >= 0
            else f"存在{summary.get('严重', 0)+summary.get('critical', 0)+summary.get('中等', 0)+summary.get('medium', 0)+summary.get('high', 0)}个严重问题，建议谨慎合并"
        ),
        "agent_outputs_count": agent_outputs_count
    }


def log_review_request(
    author: str, 
    reputation_score: int, 
    reputation_history: List[Any],
    diff_text: str, 
    comments: List[Dict[str, Any]], 
    readme_content: str, 
    username: str
) -> None:
    """
    记录代码审查请求的日志信息
    
    Args:
        author: PR作者
        reputation_score: 信誉分数
        reputation_history: 信誉历史
        diff_text: 代码差异文本
        comments: PR评论
        readme_content: README内容
        username: 当前用户名
    """
    logger.info("=== 收到代码审查请求 ===")
    logger.info(f"PR作者: {author}")
    logger.info(f"代码差异长度: {len(diff_text)}")
    logger.info(f"评论数量: {len(comments)}")
    logger.info(f"信誉分数: {reputation_score}")
    logger.info(f"信誉历史长度: {len(reputation_history)}")
    logger.info(f"README长度: {len(readme_content)}")
    logger.info(f"服务用户: {username}")
    logger.info("=== 以上是审查请求 ===")


def calculate_review_summary(issues: List[Dict[str, Any]]) -> Tuple[Dict[str, int], Dict[str, int]]:
    """
    计算代码审查的统计摘要
    
    Args:
        issues: 问题列表
        
    Returns:
        Tuple[Dict[str, int], Dict[str, int]]: (严重性统计, 缺陷类型统计)
    """
    summary = {
        "总计": len(issues),
        "严重": sum(1 for i in issues if i["severity"] in ["严重","critical"]),
        "中等": sum(1 for i in issues if i["severity"] in ["中等","medium","high"]),
        "轻度": sum(1 for i in issues if i["severity"] in ["轻度","minor"]),
        "表扬": sum(1 for i in issues if i["severity"] in ["表扬","praise"]),
    }

    # 动态统计所有缺陷类型
    defect_types = {}
    for issue in issues:
        bug_type = issue.get("bug_type")
        if bug_type:
            defect_types[bug_type] = defect_types.get(bug_type, 0) + 1
    
    return summary, defect_types


def build_event_description(
    summary: Dict[str, int], 
    defect_types: Dict[str, int], 
    delta_reputation: int, 
    pr_number: str
) -> str:
    """
    构建信誉更新的事件描述
    
    Args:
        summary: 统计摘要
        defect_types: 缺陷类型统计
        delta_reputation: 信誉变化量
        pr_number: PR编号
        
    Returns:
        str: 自然语言描述
    """
    # 计算总问题数
    total_issues = sum(count for severity, count in summary.items() 
                      if severity != "总计" and count > 0)
    
    if total_issues == 0:
        issue_desc = "无问题或表扬"
    else:
        # 简化的描述，只显示问题总数
        issue_desc = f"发现{total_issues}个问题"
        
        # 如果有缺陷类型信息，添加主要缺陷类型
        if defect_types:
            # 找出最常见的缺陷类型
            main_defect = max(defect_types.items(), key=lambda x: x[1]) if defect_types else None
            if main_defect and main_defect[1] > 0:
                defect_type_map = {
                    "static_defect": "静态缺陷",
                    "logical_defect": "逻辑缺陷",
                    "memory_issue": "内存问题",
                    "security_vulnerability": "安全漏洞",
                    "performance_issue": "性能问题",
                    "code_style": "代码风格",
                    "documentation": "文档问题",
                    "testing": "测试问题",
                    "error_handling": "错误处理",
                    "api_design": "API设计",
                    "data_structure": "数据结构",
                    "algorithm": "算法问题"
                }
                defect_name = defect_type_map.get(main_defect[0], main_defect[0])
                issue_desc += f"，主要是{defect_name}"

    # 构建信誉变化描述
    if delta_reputation == 0:
        return f"在PR #{pr_number}中，由于{issue_desc}，用户信誉保持不变"
    else:
        change_type = "提高" if delta_reputation > 0 else "降低"
        return f"在PR #{pr_number}中，由于{issue_desc}，用户信誉{change_type}了{abs(delta_reputation)}分"