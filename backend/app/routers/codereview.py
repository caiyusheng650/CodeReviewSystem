from fastapi import APIRouter, Depends, Header, HTTPException, status
from pydantic import BaseModel
from typing import Optional, Dict, Any, List, Tuple
import logging
import base64
from app.services.reputation_service import reputation_service
from app.schemas.reputation import ReputationUpdatePayload
from app.models.user import UserResponse
from app.utils.auth import get_current_user_optional

# 配置日志
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter()


# ==============================
# ⭐ 请求模型
# ==============================
class CodeReviewPayload(BaseModel):
    diff_base64: str
    pr_number: str

    pr_title_b64: str
    pr_body_b64: str
    readme_b64: Optional[str] = None

    repo_owner: str
    repo_name: str
    author: Optional[str] = None

    comments: List[Dict[str, Any]]

    # ---- 自动 decode ----
    @property
    def pr_title(self) -> str:
        return base64.b64decode(self.pr_title_b64).decode("utf-8", errors="ignore")

    @property
    def pr_body(self) -> str:
        return base64.b64decode(self.pr_body_b64).decode("utf-8", errors="ignore")

    @property
    def diff(self) -> str:
        return base64.b64decode(self.diff_base64).decode("utf-8", errors="ignore")

    @property
    def readme(self) -> Optional[str]:
        if self.readme_b64:
            return base64.b64decode(self.readme_b64).decode("utf-8", errors="ignore")
        return None



# ==============================
# ⭐ mock issue generator
# ==============================
def generate_review_issues(diff: str, comments: List[Dict[str, Any]], reputation_score: int, programmer_reputation_history: List[str], readme: Optional[str] = None) -> List[Dict[str, Any]]:


    # 问题列表
    issues = [
        {
            "file": "README.md",
            "line": 10,
            "bug_type": "static_defect",
            "description": "变量命名不规范。",
            "suggestion": "请使用更语义化的变量名。",
            "severity": "低"
        },
        {
            "file": "README.md",
            "line": 30,
            "bug_type": "logical_defect",    
            "description": "异常未处理，可能导致程序崩溃。",
            "suggestion": "建议增加 try/catch。",
            "severity": "高"
        },
        {
            "file": "README.md",
            "line": 60,
            "bug_type": "security_vulnerability",
            "description": "可能存在 XSS 风险。",
            "suggestion": "应对输入进行转义。",
            "severity": "中"
        }
    ]

    # 称赞列表
    praises = [
        {
            "file": "README.md",
            "line": 15,
            "bug_type":"praise",
            "description": "代码逻辑清晰，易于理解。",
            "suggestion": "继续保持良好的编码习惯。",
            "severity": "表扬"
        },
        {
            "file": "README.md",
            "line": 25,
            "bug_type":"praise",
            "description": "API 调用封装得很好，便于维护。",
            "suggestion": "这种模块化的设计值得推广。",
            "severity": "表扬"
        }
    ]


    # 合并问题和称赞
    all_feedback = issues + praises

    return all_feedback


# ==============================
# ⭐ /review 主逻辑
# ==============================
def calculate_review_summary(issues: List[Dict[str, Any]]) -> Tuple[Dict[str, int], Dict[str, int]]:
    """Calculate summary statistics for review issues"""
    summary = {
        "总计": len(issues),
        "高": sum(1 for i in issues if i["severity"] == "高"),
        "中": sum(1 for i in issues if i["severity"] == "中"),
        "低": sum(1 for i in issues if i["severity"] == "低"),
        "表扬": sum(1 for i in issues if i["severity"] == "表扬"),
    }

    defect_types = {
        "static_defect": sum(1 for i in issues if i.get("bug_type") == "static_defect"),
        "logical_defect": sum(1 for i in issues if i.get("bug_type") == "logical_defect"),
        "memory_issue": sum(1 for i in issues if i.get("bug_type") == "memory_issue"),
        "security_vulnerability": sum(1 for i in issues if i.get("bug_type") == "security_vulnerability"),
    }
    return summary, defect_types

def build_event_description(summary: Dict[str, int], defect_types: Dict[str, int], delta_reputation: int, pr_number: str) -> str:
    """Build natural language event description for reputation update"""
    # 构建自然语言事件描述
    change_type = "提高" if delta_reputation > 0 else "降低" if delta_reputation < 0 else "保持不变"

    # 构建问题描述部分
    issue_parts = []
    severity_map = {
        "高": "高严重级问题",
        "中": "中严重级问题",
        "低": "低严重级问题",
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
    defect_type_map = {
        "static_defect": "静态缺陷",
        "logical_defect": "逻辑缺陷",
        "memory_issue": "内存问题",
        "security_vulnerability": "安全漏洞"
    }

    for defect_type, count in defect_types.items():
        if count <= 0:
            continue
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
        issue_desc = ", ".join(issue_parts[:-1]) + "和" + issue_parts[-1]
        defect_desc = ", ".join(defect_parts[:-1]) + "和" + defect_parts[-1]
        issue_desc = f"{issue_desc}，包括{defect_desc}"
    else:
        issue_desc = ", ".join(issue_parts[:-1]) + "和" + issue_parts[-1]

    # 构建最终事件字符串
    if delta_reputation == 0:
        return f"在PR #{pr_number}中，由于{issue_desc}，用户信誉保持不变"
    else:
        return f"在PR #{pr_number}中，由于{issue_desc}，用户信誉{change_type}了{abs(delta_reputation)}分"

@router.post("/review")
async def review(
    payload: CodeReviewPayload,
    current_user: Optional[UserResponse] = Depends(get_current_user_optional)
):
    logger.info("=== 收到代码审查请求 ===")
    logger.info(f"PR {payload.pr_number} | {payload.repo_owner}/{payload.repo_name}")
    logger.info(f"Service User: {current_user.username if current_user else 'unknown'}")
    # 检查认证类型
    if current_user:
        auth_type = getattr(current_user, 'auth_type', 'unknown')
        logger.info(f"Authentication Type: {auth_type}")

    # 使用payload中的author作为PR作者
    author = payload.author or "unknown"

    # 使用新的信誉服务获取用户信誉信息
    reputation = await reputation_service.get_programmer_reputation(author)
    score = reputation["score"]
    history = reputation["history"]

    logger.info(f"作者：{author} | 信誉分：{score} ")

    diff_text = payload.diff
    comments = payload.comments
    readme_content = payload.readme
    issues = generate_review_issues(diff_text, comments, score, history, readme_content)

    # Calculate review summary and defect types
    summary, defect_types = calculate_review_summary(issues)

    # Calculate reputation delta
    delta_reputation = summary["高"] * (-10) + summary["中"] * (-5) + summary["低"] * (-2) + summary["表扬"] * 3

    # Build event description
    event = build_event_description(summary, defect_types, delta_reputation, payload.pr_number)

    # Update reputation
    await reputation_service.update_programmer_reputation(author, event, delta_reputation=delta_reputation)

    return {
        "status": "success",
        "author": author,
        "reputation_before": score,
        "reputation_change": delta_reputation,
        "reputation_after": score + delta_reputation,

        "risk_score": max(0, min(100, summary["高"] * 30 + summary["中"] * 10 + summary["低"] * 3)),
        "confidence_index": max(0, 100 - (summary["高"] * 15 + summary["中"] * 8)),

        "merge_recommendation": (
            "merge"
            if delta_reputation >= 0 else
            "request_changes" if summary["高"] > 0 else
            "caution"
        ),

        "recommendation_reason": (
            "代码整体质量良好，未发现重大问题，适合合并。"
            if delta_reputation >= 0
            else "检测到关键性问题，可能影响系统稳定性，暂不建议合并。"
        ),

        "issues": issues,

        "summary": {
            "total": summary["总计"],
            "critical": summary["高"],
            "medium": summary["中"],
            "low": summary["低"],
            "praise": summary["表扬"],
        },

        "overall_suggestion": (
            "本次提交展现出良好的代码质量，但可进一步完善异常处理与安全边界。"
            if delta_reputation >= 0
            else "请重点关注高危险代码段，检查异常处理、依赖边界和输入校验逻辑。"
        ),

        "conclusion": (
            "智能审查系统建议合并"
            if delta_reputation >= 0
            else "智能审查系统不建议合并"
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
# 健康检查
# ==============================
@router.get("/health")
async def health():
    return {"status": "ok"}
