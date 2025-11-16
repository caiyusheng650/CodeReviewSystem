from fastapi import APIRouter, Header, HTTPException, status
from pydantic import BaseModel
from typing import Optional, Dict, Any, List
import logging
import base64
from app.services.reputation_service import reputation_service
from app.schemas.reputation import ReputationUpdatePayload

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



# ==============================
# ⭐ mock issue generator
# ==============================
def generate_review_issues(diff: str, comments: List[Dict[str, Any]], reputation_score: int) -> List[Dict[str, Any]]:

    # 问题列表
    issues = [
        {
            "file": "index.js",
            "line": 10,
            "description": "变量命名不规范。",
            "suggestion": "请使用更语义化的变量名。",
            "severity": "低"
        },
        {
            "file": "index.js",
            "line": 30,
            "description": "异常未处理，可能导致程序崩溃。",
            "suggestion": "建议增加 try/catch。",
            "severity": "高"
        },
        {
            "file": "index.js",
            "line": 60,
            "description": "可能存在 XSS 风险。",
            "suggestion": "应对输入进行转义。",
            "severity": "中"
        }
    ]

    # 称赞列表
    praises = [
        {
            "file": "utils.js",
            "line": 15,
            "description": "代码逻辑清晰，易于理解。",
            "suggestion": "继续保持良好的编码习惯。",
            "severity": "表扬"
        },
        {
            "file": "api.js",
            "line": 25,
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
@router.post("/review")
async def review(payload: CodeReviewPayload, authorization: str = Header(None)):

    logger.info("=== 收到代码审查请求 ===")
    logger.info(f"PR {payload.pr_number} | {payload.repo_owner}/{payload.repo_name}")

    author = payload.author or "unknown"
    # 使用新的信誉服务获取用户信誉信息
    reputation = await reputation_service.get_user_reputation(author)
    score = reputation["score"]


    logger.info(f"作者：{author} | 信誉分：{score} ")

    diff_text = payload.diff
    comments = payload.comments
    issues = generate_review_issues(diff_text, comments,score)

    summary = {
        "总计": len(issues),
        "高": sum(1 for i in issues if i["severity"] == "高"),
        "中": sum(1 for i in issues if i["severity"] == "中"),
        "低": sum(1 for i in issues if i["severity"] == "低"),
        "表扬": sum(1 for i in issues if i["severity"] == "表扬"),
    }

    delta_reputation = summary["高"] * (-10) + summary["中"] * (-5) + summary["低"] * (-2) + summary["表扬"] * 3

    event = ("passed" if delta_reputation >= 0 else "minor_issue" if delta_reputation < 0 else "severe_bug")+"_"+str(delta_reputation) + f"at {payload.pr_number}"

    # update reputation
    await reputation_service.update_user_reputation(author, event, delta_reputation=delta_reputation)

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
    # 使用新的信誉服务获取用户信誉信息
    return await reputation_service.get_user_reputation(author)


# ==============================
# ⭐ 更新信誉
# ==============================
@router.post("/reputation/update")
async def update_reputation(payload: ReputationUpdatePayload):
    # 使用新的信誉服务更新用户信誉信息
    return await reputation_service.update_user_reputation(payload.author, payload.event)


# ==============================
# 健康检查
# ==============================
@router.get("/health")
async def health():
    return {"status": "ok"}
