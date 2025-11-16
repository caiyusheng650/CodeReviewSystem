from fastapi import APIRouter, Header, HTTPException, status
from pydantic import BaseModel
from typing import Optional, Dict, Any, List
import json
import logging

# 配置日志
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter()

class CodeReviewPayload(BaseModel):
    diff: str
    pr_number: str
    pr_title: str
    pr_body: str
    repo_owner: str
    repo_name: str
    comments: List[Dict[str, Any]]

@router.post("/review", summary="接收GitHub Actions代码审查请求")
async def receive_code_review(
    payload: CodeReviewPayload,
    authorization: str = Header(None)
):
    """
    接收来自GitHub Actions的代码审查请求并打印到控制台
    用于测试目的
    """
    # 记录收到的请求
    logger.info("=== 收到代码审查请求 ===")
    logger.info(f"PR编号: {payload.pr_number}")
    logger.info(f"PR标题: {payload.pr_title}")
    logger.info(f"仓库: {payload.repo_owner}/{payload.repo_name}")
    logger.info(f"差异内容长度: {len(payload.diff)} 字符")
    logger.info(f"评论数量: {len(payload.comments)}")
    
    # 如果有PR正文，记录前100个字符
    if payload.pr_body:
        logger.info(f"PR正文 (前100字符): {payload.pr_body[:100]}...")
    
    # 记录前500个字符的差异内容
    logger.info(f"差异内容 (前500字符): {payload.diff[:500]}...")
    
    # 如果有评论，记录评论摘要
    if payload.comments:
        logger.info("评论摘要:")
        for i, comment in enumerate(payload.comments[:3]):  # 只显示前3条评论
            logger.info(f"  评论 {i+1}: {comment.get('body', '')[:100]}...")
        if len(payload.comments) > 3:
            logger.info(f"  ... 还有 {len(payload.comments) - 3} 条评论")
    
    # 验证授权头（简化版）
    if authorization:
        logger.info(f"授权头: {authorization[:20]}...")  # 只记录前20个字符
    else:
        logger.warning("缺少授权头")
    
    # 返回成功响应，包含模拟的代码审查结果
    # 确保响应格式与GitHub Actions工作流期望的格式完全一致
    issues = [
        {
            "file": "frontend/README.md",
            "line": 15,
            "description": "检测到未使用的变量 'unusedVar'，建议移除以提高代码可读性。",
            "suggestion": "移除未使用的变量声明",
            "severity": "低",
            "category": "静态缺陷"
        },
        {
            "file": "frontend/README.md",
            "line": 23,
            "description": "数据库查询缺少异常处理，可能导致程序崩溃。",
            "suggestion": "添加 try-catch 块来处理可能的数据库异常",
            "severity": "高",
            "category": "逻辑缺陷"
        },
        {
            "file": "frontend/README.md",
            "line": 42,
            "description": "使用了危险的 innerHTML 属性，可能存在 XSS 风险。",
            "suggestion": "使用安全的 DOM 操作方法或确保内容已正确转义",
            "severity": "中",
            "category": "安全漏洞"
        }
    ]
    
    # 计算各类问题的数量
    high_severity_count = sum(1 for issue in issues if issue["severity"] == "高")
    medium_severity_count = sum(1 for issue in issues if issue["severity"] == "中")
    low_severity_count = sum(1 for issue in issues if issue["severity"] == "低")
    
    # 按类别统计问题
    category_counts = {}
    for issue in issues:
        category = issue.get("category", "其他")
        category_counts[category] = category_counts.get(category, 0) + 1
    
    return {
        "message": "代码审查请求已接收",
        "status": "success",
        "received_data": {
            "pr_number": payload.pr_number,
            "pr_title": payload.pr_title,
            "repo": f"{payload.repo_owner}/{payload.repo_name}",
            "diff_length": len(payload.diff),
            "comments_count": len(payload.comments)
        },
        "issues": issues,
        "summary": {
            "total_issues": len(issues),
            "high_severity": high_severity_count,
            "medium_severity": medium_severity_count,
            "low_severity": low_severity_count,
            "by_category": category_counts,
            "summary_comments": "本次代码审查发现了多个问题，包括静态缺陷、逻辑缺陷和安全漏洞，请及时修复。"
        }
    }

@router.get("/health", summary="健康检查")
async def health_check():
    """健康检查端点"""
    return {"status": "healthy", "service": "code-review-receiver"}