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
def generate_review_issues(diff: str, strictness: float) -> List[Dict[str, Any]]:

    base_issues = [
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

    return base_issues


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
    issues = generate_review_issues(diff_text)

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
        "summary": summary,
        "decoded_title": payload.pr_title,
        "decoded_body": payload.pr_body,
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
