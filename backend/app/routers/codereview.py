from fastapi import APIRouter, Header, HTTPException, status
from pydantic import BaseModel
from typing import Optional, Dict, Any, List
import logging

# 配置日志
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter()

# ==============================
# ⭐ 简单内存版信誉数据库（可换成 Redis/Mongo）
# ==============================
author_reputation_db = {}  
"""
结构如下：
{
    "alice": { "score": 82, "history": ["passed", "minor_issue"] },
    "bob":   { "score": 45, "history": ["severe_bug", "rejected"] }
}
"""

def get_default_reputation():
    return {"score": 60, "history": []}

# ==============================
# ⭐ 请求模型
# ==============================
class CodeReviewPayload(BaseModel):
    diff: str
    pr_number: str
    pr_title: str
    pr_body: str
    repo_owner: str
    repo_name: str
    author: Optional[str] = None      # GitHub Action 会传入这个
    comments: List[Dict[str, Any]]

class ReputationUpdatePayload(BaseModel):
    author: str
    event: str  # passed / minor_issue / severe_bug / rejected


# ==============================
# ⭐ 评论生成（按信誉动态调整严格程度）
# ==============================
def calculate_strictness(score: int) -> float:
    """
    信誉评分 0~100，转换为严格因子：
    越低越严格，最严格 2.0，最宽松 0.5
    """
    strictness = max(0.5, min(2.0, (100 - score) / 50))
    return round(strictness, 2)


def generate_review_issues(diff: str, strictness: float) -> List[ Dict[str, Any] ]:
    """
    这里是 mock，你后续可以插入 LLM（DeepSeek / Qwen2 / GPT-4o）
    strictness 会影响 issues 返回数量与严重程度
    """

    base_issues = [
        {
            "file": "index.js",
            "line": 10,
            "description": "变量命名不规范。",
            "suggestion": "请使用更具语义化的变量名。",
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
            "suggestion": "对输入进行转义。",
            "severity": "中"
        }
    ]

    # 根据严格程度裁剪问题数量 或 强化严重度
    if strictness > 1.2:
        # 严格：增加严重度
        for issue in base_issues:
            if issue["severity"] == "低":
                issue["severity"] = "中"

    if strictness > 1.5:
        # 超级严格：再加两条 mock
        base_issues.append({
            "file": "index.js",
            "line": 5,
            "description": "疑似使用 magic number。",
            "suggestion": "请使用常量替代。",
            "severity": "低"
        })

    return base_issues


# ==============================
# ⭐ /review 主逻辑
# ==============================
@router.post("/review")
async def review(payload: CodeReviewPayload, authorization: str = Header(None)):

    logger.info("=== 收到代码审查请求 ===")
    logger.info(f"PR {payload.pr_number} | {payload.repo_owner}/{payload.repo_name}")

    author = payload.author or "unknown"
    reputation = author_reputation_db.get(author, get_default_reputation())
    score = reputation["score"]

    strictness = calculate_strictness(score)

    logger.info(f"作者：{author} | 信誉分：{score} | 严格度：{strictness}")

    issues = generate_review_issues(payload.diff, strictness)

    # 按严重度统计
    summary = {
        "total": len(issues),
        "high": sum(1 for i in issues if i["severity"] == "高"),
        "medium": sum(1 for i in issues if i["severity"] == "中"),
        "low": sum(1 for i in issues if i["severity"] == "低"),
    }

    return {
        "status": "success",
        "strictness": strictness,
        "author_reputation": score,
        "issues": issues,
        "summary": summary
    }


# ==============================
# ⭐ 查询信誉
# ==============================
@router.get("/reputation/{author}")
async def get_reputation(author: str):
    return author_reputation_db.get(author, get_default_reputation())


# ==============================
# ⭐ 更新信誉（AI/人工审查之后触发）
# ==============================
@router.post("/reputation/update")
async def update_reputation(payload: ReputationUpdatePayload):

    author = payload.author
    event = payload.event

    rep = author_reputation_db.get(author, get_default_reputation())

    if event == "passed":
        rep["score"] += 2
    elif event == "minor_issue":
        rep["score"] -= 3
    elif event == "severe_bug":
        rep["score"] -= 10
    elif event == "rejected":
        rep["score"] -= 15

    rep["score"] = max(0, min(100, rep["score"]))
    rep["history"].append(event)

    author_reputation_db[author] = rep

    return {
        "status": "updated",
        "author": author,
        "new_score": rep["score"],
        "history": rep["history"]
    }


# ==============================
# 健康检查
# ==============================
@router.get("/health")
async def health():
    return {"status": "ok"}
