import code
from fastapi import APIRouter, Depends, Header, HTTPException, status, Query
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List, Tuple
import logging
import base64
import json
from app.services.reputation import reputation_service
from app.services.codereview import CodeReviewService
from app.models.reputation import ReputationUpdatePayload
from app.models.user import UserResponse
from app.models.codereview import (
    CodeReviewCreate, CodeReviewUpdate, CodeReviewResponse, 
    CodeReviewStats, CodeReviewListResponse, AgentOutput,
    ReviewStatus
)
from app.utils.auth import get_current_user_optional
from app.utils.database import get_database


# 配置日志
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter()


# ==============================
# ⭐ 数据库依赖
# ==============================
async def get_code_review_service(db=Depends(get_database)):
    """获取代码审查服务的依赖函数"""
    collection = db.codereviews
    return CodeReviewService(collection)


# ==============================
# ⭐ 请求模型
# ==============================
class CodeReviewPayload(BaseModel):
    
    # Base64编码字段（新支持）
    diff_base64: str = Field(..., description="Base64编码的代码差异内容")
    pr_title_b64: str = Field(..., description="Base64编码的PR标题")
    pr_body_b64: str = Field(..., description="Base64编码的PR正文")
    readme_b64: Optional[str] = Field(None, description="Base64编码的README内容")
    comments_b64: str = Field(..., description="Base64编码的评论列表")
    
    # 其他必需字段
    pr_number: str = Field(..., description="Pull Request编号")
    githubactionid: str = Field(..., description="GitHub Action ID")
    repo_owner: str = Field(..., description="仓库所有者")
    repo_name: str = Field(..., description="仓库名称")
    author: str = Field(..., description="PR作者")
    
    @property
    def diff_content(self) -> str:
       return base64.b64decode(self.diff_base64.encode()).decode('utf-8')
    
    @property
    def pr_title(self) -> str:
        return base64.b64decode(self.pr_title_b64.encode()).decode('utf-8')
    
    @property
    def pr_body(self) -> str:
        return base64.b64decode(self.pr_body_b64.encode()).decode('utf-8')
    
    @property
    def readme_content(self) -> Optional[str]:
        if self.readme_b64:
            return base64.b64decode(self.readme_b64.encode()).decode('utf-8')
        else:
            return "无README.md文档"
    
    @property
    def comments(self) -> List[Dict[str, Any]]:
        import json
        comments_text = base64.b64decode(self.comments_b64.encode()).decode('utf-8')
        
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
    



# ==============================
# ⭐ 辅助函数
# ==============================

def parse_ai_output(ai_output: str) -> tuple[list, dict, dict]:
    """
    解析AI输出的代码审查结果
    
    Args:
        ai_output: AI代理的输出内容
        
    Returns:
        tuple: (issues列表, summary统计, defect_types缺陷类型统计)
    """
    issues = []
    summary = {"总计": 0, "严重": 0, "中等": 0, "轻度": 0, "表扬": 0}
    defect_types = {}
    
    if not ai_output:
        return issues, summary, defect_types
        
    try:
        import json
        ai_data = json.loads(ai_output)
        
        # 如果是数组格式（通常的AI输出格式）
        if isinstance(ai_data, list):
            for issue in ai_data:
                if isinstance(issue, dict) and 'severity' in issue:
                    issues.append(issue)
                    
                    # 计算统计信息
                    severity = issue.get('severity', '轻度')
                    if severity in summary:
                        summary[severity] += 1
                    summary["总计"] += 1
                    
                    # 记录缺陷类型
                    defect_type = issue.get('bug_type', 'unknown')
                    if defect_type in defect_types:
                        defect_types[defect_type] += 1
                    else:
                        defect_types[defect_type] = 1
        
        # 如果是对象格式
        elif isinstance(ai_data, dict):
            # 尝试从不同字段提取issues
            issues_list = (
                ai_data.get('issues') or 
                ai_data.get('static_issues') or 
                ai_data.get('issues_list') or 
                []
            )
            
            if isinstance(issues_list, list):
                for issue in issues_list:
                    if isinstance(issue, dict) and 'severity' in issue:
                        issues.append(issue)
                        
                        # 计算统计信息
                        severity = issue.get('severity', '轻度')
                        if severity in summary:
                            summary[severity] += 1
                        summary["总计"] += 1
                        
                        # 记录缺陷类型
                        defect_type = issue.get('bug_type', 'unknown')
                        if defect_type in defect_types:
                            defect_types[defect_type] += 1
                        else:
                            defect_types[defect_type] = 1
            
            # 如果没有明确的issues字段，则将整个对象视为一个结果
            elif 'severity' in ai_data:
                issues.append(ai_data)
                severity = ai_data.get('severity', '轻度')
                if severity in summary:
                    summary[severity] += 1
                summary["总计"] += 1
                defect_type = ai_data.get('bug_type', 'unknown')
                if defect_type in defect_types:
                    defect_types[defect_type] += 1
                else:
                    defect_types[defect_type] = 1
                    
    except json.JSONDecodeError:
        # 如果AI输出不是有效的JSON，记录为文本结果
        print(f"⚠️ AI输出不是有效的JSON格式，将作为文本处理")
        issues.append({
            "description": f"AI分析结果：{ai_output[:500]}...",
            "severity": "中等",
            "bug_type": "ai_analysis_result",
            "suggestion": "请查看AI分析输出的详细内容"
        })
        summary["中等"] = 1
        summary["总计"] = 1
        defect_types = {"ai_analysis_result": 1}
    except Exception as e:
        print(f"⚠️ 处理AI输出时出现错误: {str(e)}")
        issues.append({
            "description": f"AI处理过程中出现问题: {str(e)}",
            "severity": "中等",
            "bug_type": "ai_processing_error",
            "suggestion": "请重新运行AI审查"
        })
        summary["中等"] = 1
        summary["总计"] = 1
        defect_types = {"ai_processing_error": 1}
    
    return issues, summary, defect_types


def calculate_reputation_delta(summary: dict) -> int:
    """
    根据审查结果计算信誉值变化
    
    Args:
        summary: 包含各严重级别问题数量的字典
        
    Returns:
        int: 信誉值变化量
    """
    return (summary["严重"] * (-10) + 
            summary["中等"] * (-5) + 
            summary["表扬"] * 10 + 
            5)


def build_final_result(issues: list, summary: dict, defect_types: dict, 
                      reputation_score: int, delta_reputation: int,
                      agent_outputs_count: int) -> dict:
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
        dict: 构建的最终结果
    """
    return {
        "issues": issues,
        "summary": summary,
        "defect_types": defect_types,
        "reputation_before": reputation_score,
        "reputation_change": delta_reputation,
        "reputation_after": reputation_score + delta_reputation,
        "risk_score": max(0, min(100, summary["严重"] * 30 + summary["中等"] * 10 + summary["轻度"] * 3)),
        "confidence_index": max(0, 100 - (summary["严重"] * 15 + summary["中等"] * 8)),
        "merge_recommendation": (
            "merge"
            if delta_reputation >= 0 else
            "request_changes" if summary["严重"] > 0 else
            "caution"
        ),
        "recommendation_reason": (
            "代码整体质量良好，未发现严重问题，适合合并。"
            if delta_reputation >= 0
            else "检测到严重问题，可能影响系统稳定性，暂不建议合并。"
        ),
        "overall_suggestion": (
            "本次提交展现出良好的代码质量，但可进一步完善异常处理与安全边界。"
            if delta_reputation >= 0
            else "请重点关注高危险代码段，检查异常处理、依赖边界和输入校验逻辑。"
        ),
        "conclusion": (
            "智能审查系统建议合并"
            if delta_reputation >= 0
            else "智能审查系统不建议合并"
        ),
        "agent_outputs_count": agent_outputs_count
    }


def log_review_request(author: str, reputation_score: int, reputation_history: list,
                      diff_text: str, comments: list, readme_content: str, 
                      current_user) -> None:
    """
    记录代码审查请求的日志信息
    
    Args:
        author: PR作者
        reputation_score: 信誉分数
        reputation_history: 信誉历史
        diff_text: 代码差异文本
        comments: PR评论
        readme_content: README内容
        current_user: 当前用户
    """
    logger.info("=== 收到代码审查请求 ===")
    logger.info(f"PR diff {len(diff_text)}")
    logger.info(f"PR comments {comments}")
    logger.info(f"PR reputation score {reputation_score}")
    logger.info(f"PR history {reputation_history}")
    logger.info(f"PR readme {len(readme_content)}")
    logger.info(f"Service User: {current_user.username if current_user else 'anonymous'}")
    logger.info(f"=== 以上是审查请求 ===")


# ==============================
# ⭐ 代码审查路由
# ==============================
def calculate_review_summary(issues: List[Dict[str, Any]]) -> Tuple[Dict[str, int], Dict[str, int]]:
    """Calculate summary statistics for review issues"""
    
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

def build_event_description(summary: Dict[str, int], defect_types: Dict[str, int], delta_reputation: int, pr_number: str) -> str:
    """Build natural language event description for reputation update"""
    # 构建自然语言事件描述
    change_type = "提高" if delta_reputation > 0 else "降低" if delta_reputation < 0 else "保持不变"

    # 构建问题描述部分
    issue_parts = []
    severity_map = {
        "严重": "严重问题",
        "中等": "中等问题",
        "轻度": "轻度问题",
        "表扬": "表扬"
    }

    for severity, count in summary.items():
        if count <= 0 or severity == "总计":
            continue
        severity_name = severity_map.get(severity, severity)
        
        # 处理单复数
        if count == 1:
            issue_parts.append(f"1个{severity_name}")
        else:
            issue_parts.append(f"{count}个{severity_name}")

    # 构建缺陷类型描述部分
    defect_parts = []
    # 预定义常见缺陷类型的中文名称映射
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

    for defect_type, count in defect_types.items():
        if count <= 0:
            continue
        # 使用预定义映射，如果不存在则使用原始名称
        defect_name = defect_type_map.get(defect_type, defect_type)
        
        # 处理单复数
        if count == 1:
            defect_parts.append(f"1个{defect_name}")
        else:
            defect_parts.append(f"{count}个{defect_name}")

    # 合并问题描述部分和缺陷类型描述部分
    if not issue_parts and not defect_parts:
        issue_desc = "无问题或表扬"
    elif len(issue_parts) == 1 and not defect_parts:
        issue_desc = issue_parts[0]
    elif len(defect_parts) == 1 and not issue_parts:
        issue_desc = defect_parts[0]
    elif issue_parts and defect_parts:
        # 合并两个描述
        if len(issue_parts) > 1:
            issue_desc = ", ".join(issue_parts[:-1]) + "和" + issue_parts[-1]
        else:
            issue_desc = issue_parts[0]
        
        if len(defect_parts) > 1:
            defect_desc = ", ".join(defect_parts[:-1]) + "和" + defect_parts[-1]
        else:
            defect_desc = defect_parts[0]
        
        issue_desc = f"{issue_desc}，包括{defect_desc}"
    elif issue_parts:
        # 只有问题描述部分
        if len(issue_parts) > 1:
            issue_desc = ", ".join(issue_parts[:-1]) + "和" + issue_parts[-1]
        else:
            issue_desc = issue_parts[0]
    elif defect_parts:
        # 只有缺陷类型描述部分
        if len(defect_parts) > 1:
            issue_desc = ", ".join(defect_parts[:-1]) + "和" + defect_parts[-1]
        else:
            issue_desc = defect_parts[0]
    else:
        issue_desc = "无问题或表扬"

    # 构建最终事件字符串
    if delta_reputation == 0:
        return f"在PR #{pr_number}中，由于{issue_desc}，用户信誉保持不变"
    else:
        return f"在PR #{pr_number}中，由于{issue_desc}，用户信誉{change_type}了{abs(delta_reputation)}分"

@router.post("/review")
async def review(
    payload: CodeReviewPayload,
    current_user: Optional[UserResponse] = Depends(get_current_user_optional),
    code_review_service: CodeReviewService = Depends(get_code_review_service)
):
    import time
    start_time = time.time()

    # 检查认证类型
    if current_user:
        auth_type = getattr(current_user, 'auth_type', 'unknown')
        logger.info(f"Authentication Type: {auth_type}")

    # 使用payload中的author作为PR作者
    author = payload.author or "unknown"
    user_id = str(current_user.id) if current_user else "anonymous"

    # 使用新的信誉服务获取用户信誉信息
    reputation = await reputation_service.get_programmer_reputation(author)
    reputation_score = reputation["score"]
    reputation_history = reputation["history"]

    logger.info(f"作者：{author} | 信誉分：{reputation_score} ")

    # 使用解码后的字段
    diff_text = payload.diff_content
    pr_title = payload.pr_title
    pr_body = payload.pr_body
    readme_content = payload.readme_content or "无README.md文档"
    comments = payload.comments

    # 记录审查请求日志
    log_review_request(
        author, reputation_score, reputation_history, 
        diff_text, comments, readme_content, current_user
    )

    # 创建代码审查记录
    review_data = CodeReviewCreate(
        github_action_id=payload.githubactionid,
        pr_number=payload.pr_number,
        repo_owner=payload.repo_owner,
        repo_name=payload.repo_name,
        author=payload.author,
        diff_content=diff_text,
        pr_title=pr_title,
        pr_body=pr_body,
        readme_content=readme_content,
        comments=comments,
        user_name=current_user.username if current_user else "anonymous"  # 请求头API token所属的用户名
    )
    
    review_id = await code_review_service.create_review(review_data, user_id)
    logger.info(f"创建代码审查记录: {review_id}")

    # 导入AI代码审查服务
    from app.services.codereview import get_ai_code_review_service
    
    # 启动AI代码审查流程
    ai_service = get_ai_code_review_service(code_review_service)
    
    print("🤖 启动AI代码审查流程...")
    
    # 使用AI服务进行代码审查
    review_data = {
        "review_id": review_id,
        "code_diff": diff_text,
        "pr_comments": comments,
        "developer_reputation_score": reputation_score,
        "developer_reputation_history": reputation_history,
        "repository_readme": readme_content,
        "author": author,
        "github_action_id": payload.githubactionid,
        "pr_number": payload.pr_number,
        "repo_owner": payload.repo_owner,
        "repo_name": payload.repo_name,
        "pr_title": pr_title,
        "pr_body": pr_body,
        "user_id": user_id
    }
    ai_result = await ai_service.run_ai_code_review(review_data)
    
    # 获取AI审查结果
    agent_outputs = ai_result.get("agent_outputs", {})
    final_ai_output = ai_result.get("final_result", "")
    
    # 解析AI输出
    issues, summary, defect_types = parse_ai_output(final_ai_output)
    
    print(f"✅ AI审查完成，发现 {len(issues)} 个问题")

    # 计算信誉值变化
    delta_reputation = calculate_reputation_delta(summary)

    # Build event description
    event = build_event_description(summary, defect_types, delta_reputation, payload.pr_number)

    # Update reputation
    await reputation_service.update_programmer_reputation(author, event, delta_reputation=delta_reputation)

    # 构建最终结果
    final_result = build_final_result(
        issues, summary, defect_types, 
        reputation_score, delta_reputation, len(agent_outputs)
    )
    
    total_processing_time = time.time() - start_time
    await code_review_service.complete_review(review_id, final_result)
    
    logger.info(f"代码审查完成，总耗时: {total_processing_time:.2f}秒")

    return {
        "status": "success",
        "review_id": review_id,
        "github_action_id": payload.githubactionid,
        "author": author,
        "reputation_before": reputation_score,
        "reputation_change": delta_reputation,
        "reputation_after": reputation_score + delta_reputation,

        "risk_score": max(0, min(100, summary["严重"] * 30 + summary["中等"] * 10 + summary["轻度"] * 3)),
        "confidence_index": max(0, 100 - (summary["严重"] * 15 + summary["中等"] * 8)),

        "merge_recommendation": (
            "merge"
            if delta_reputation >= 0 else
            "request_changes" if summary["严重"] > 0 else
            "caution"
        ),

        "recommendation_reason": (
            "代码整体质量良好，未发现严重问题，适合合并。"
            if delta_reputation >= 0
            else "检测到严重问题，可能影响系统稳定性，暂不建议合并。"
        ),

        "issues": issues,

        "summary": {
            "total": summary["总计"],
            "critical": summary["严重"],
            "medium": summary["中等"],
            "low": summary["轻度"],
            "praise": summary["表扬"],
        },

        "agent_outputs_count": len(agent_outputs),
        "processing_time": round(total_processing_time, 2),

        "conclusion": (
            "智能审查系统建议合并"
            if summary["中等"] + summary["轻度"] == 0
            else "需要人工审核"
        )
    }



# ==============================
# ⭐ 查询信誉
# ==============================
@router.get("/reputation/{author}")
async def get_reputation(author: str):
    # 使用新的信誉服务获取程序员信誉信息
    return await reputation_service.get_programmer_reputation(author)


# ==============================
# ⭐ 更新信誉
# ==============================
@router.post("/reputation/update")
async def update_reputation(payload: ReputationUpdatePayload):
    # 使用新的信誉服务更新程序员信誉信息
    return await reputation_service.update_programmer_reputation(payload.author, payload.event)


# ==============================
# ⭐ 根据ID获取审查记录
# ==============================
@router.get("/reviews/{review_id}", response_model=CodeReviewResponse)
async def get_review_by_id(
    review_id: str,
    current_user: Optional[UserResponse] = Depends(get_current_user_optional),
    code_review_service: CodeReviewService = Depends(get_code_review_service)
):
    """根据审查记录ID获取详细的审查信息"""
    review = await code_review_service.get_review_by_id(review_id)
    if not review:
        raise HTTPException(status_code=404, detail="审查记录未找到")
    
    return review


# ==============================
# ⭐ 根据GitHub Action ID获取审查记录
# ==============================
@router.get("/reviews/github-action/{github_action_id}", response_model=CodeReviewResponse)
async def get_review_by_github_action_id(
    github_action_id: str,
    current_user: Optional[UserResponse] = Depends(get_current_user_optional),
    code_review_service: CodeReviewService = Depends(get_code_review_service)
):
    """根据GitHub Action ID获取审查记录"""
    review = await code_review_service.get_review_by_github_action_id(github_action_id)
    if not review:
        raise HTTPException(status_code=404, detail="GitHub Action对应的审查记录未找到")
    
    return review


# ==============================
# ⭐ 获取审查记录列表
# ==============================
@router.get("/reviews", response_model=CodeReviewListResponse)
async def list_reviews(
    current_user: Optional[UserResponse] = Depends(get_current_user_optional),
    code_review_service: CodeReviewService = Depends(get_code_review_service),
    status: Optional[ReviewStatus] = Query(None, description="审查状态"),
    repo_owner: Optional[str] = Query(None, description="仓库所有者"),
    repo_name: Optional[str] = Query(None, description="仓库名称"),
    page: int = Query(1, ge=1, description="页码"),
    size: int = Query(20, ge=1, le=100, description="每页数量")
):
    """获取代码审查记录列表"""
    skip = (page - 1) * size
    user_id = str(current_user.id) if current_user else None
    
    return await code_review_service.list_reviews(
        user_id=user_id,
        status=status,
        repo_owner=repo_owner,
        repo_name=repo_name,
        skip=skip,
        limit=size
    )


# ==============================
# ⭐ 获取审查统计信息
# ==============================
@router.get("/reviews/stats", response_model=CodeReviewStats)
async def get_review_stats(
    current_user: Optional[UserResponse] = Depends(get_current_user_optional),
    code_review_service: CodeReviewService = Depends(get_code_review_service)
):
    """获取代码审查统计信息"""
    user_id = str(current_user.id) if current_user else None
    return await code_review_service.get_review_stats(user_id=user_id)


# ==============================
# ⭐ 添加Agent输出
# ==============================
@router.post("/reviews/{review_id}/agents/{agent_name}/output")
async def add_agent_output(
    review_id: str,
    agent_name: str,
    output_content: str,
    processing_time: float = 0.0,
    status: str = "completed",
    current_user: Optional[UserResponse] = Depends(get_current_user_optional),
    code_review_service: CodeReviewService = Depends(get_code_review_service)
):
    """为特定审查记录添加Agent输出"""
    agent_output = AgentOutput(
        agent_name=agent_name,
        output_content=output_content,
        processing_time=processing_time,
        status=status
    )
    
    success = await code_review_service.add_agent_output(review_id, agent_output)
    if not success:
        raise HTTPException(status_code=404, detail="审查记录未找到或更新失败")
    
    return {"status": "success", "message": f"已添加 {agent_name} 的输出"}


# ==============================
# ⭐ 健康检查
# ==============================
@router.get("/health")
async def health():
    return {"status": "ok"}
