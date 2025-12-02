import code
from fastapi import APIRouter, Depends, Header, HTTPException, status, Query, BackgroundTasks
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List, Tuple
import logging
from datetime import datetime
import uuid
from app.services.reputation import reputation_service
from app.services.codereview import CodeReviewService
from app.models.reputation import ReputationUpdatePayload
from app.models.user import UserResponse
from app.models.codereview import (
    CodeReviewCreate, CodeReviewUpdate, CodeReviewResponse, 
    CodeReviewBaseResponse, CodeReviewDetailResponse,
    SimpleCodeReviewListResponse, AsyncTaskResponse, TaskStatusResponse
)
from app.utils.apikey import require_api_key
from app.utils.userauth import require_bearer
from app.utils.codereview import (
    parse_base64_content, parse_comments_from_base64, parse_ai_output,
    calculate_reputation_delta, build_final_result, log_review_request,
    calculate_review_summary, build_event_description, build_ai_chat_message
)
from app.utils.database import get_database
from app.services.codereview import get_ai_code_review_service
from app.services.aicopilot import aicopilot_service

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
       return parse_base64_content(self.diff_base64)
    
    @property
    def pr_title(self) -> str:
        return parse_base64_content(self.pr_title_b64)
    
    @property
    def pr_body(self) -> str:
        return parse_base64_content(self.pr_body_b64)
    
    @property
    def readme_content(self) -> Optional[str]:
        if self.readme_b64:
            return parse_base64_content(self.readme_b64)
        else:
            return "无README.md文档"
    
    @property
    def comments(self) -> List[Dict[str, Any]]:
        return parse_comments_from_base64(self.comments_b64)
    
# ==============================
# ⭐ 异步任务处理
# ==============================

# 全局任务存储（生产环境应使用Redis或数据库）
task_store = {}

async def run_async_review_task(task_id: str, payload: CodeReviewPayload, username: str, code_review_service: CodeReviewService):
    """异步运行代码审查任务"""
    try:
        # 更新任务状态为处理中
        task_store[task_id]["status"] = "processing"
        task_store[task_id]["updated_at"] = datetime.utcnow()
        
        # 使用payload中的author作为PR作者
        author = payload.author or "unknown"
        user_id = username or "anonymous"

        # 使用新的信誉服务获取用户信誉信息
        reputation = await reputation_service.get_programmer_reputation(author)
        reputation_score = reputation["score"]
        reputation_history = reputation["history"][-5:]

        # 使用解码后的字段
        diff_text = payload.diff_content
        pr_title = payload.pr_title
        pr_body = payload.pr_body
        readme_content = payload.readme_content or "无README.md文档"
        comments = payload.comments

        # 记录审查请求日志
        log_review_request(
            author, reputation_score, reputation_history, 
            diff_text, comments, readme_content, username
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
            username=username,
            chat_history=[]
        )
        
        review_id = await code_review_service.create_review(review_data, user_id)

        # 导入AI代码审查服务
        
        # 启动AI代码审查流程（无并发限制）
        ai_service = get_ai_code_review_service(code_review_service)
        
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
        
        # 运行AI代码审查
        ai_result = await ai_service.run_ai_code_review(review_data)
        
        # 获取AI审查结果
        final_ai_output = ai_result.get("final_result", "")
        
        # 解析AI输出
        issues, summary, defect_types = parse_ai_output(final_ai_output)
        
        # 计算信誉值变化
        delta_reputation = calculate_reputation_delta(summary)
        event = build_event_description(summary, defect_types, delta_reputation, payload.pr_number)
        await reputation_service.update_programmer_reputation(author, event, delta_reputation=delta_reputation)

        ai_chat_message = build_ai_chat_message(final_ai_output,diff_text,pr_title,pr_body)
        await aicopilot_service.add_chat_message(review_id, ai_chat_message,'system')

        # 更新任务结果为完成
        task_store[task_id]["status"] = "completed"
        task_store[task_id]["result"] = {"issues": issues}
        task_store[task_id]["updated_at"] = datetime.utcnow()
        
    except Exception as e:
        logger.error(f"Async task {task_id} failed: {str(e)}")
        task_store[task_id]["status"] = "failed"
        task_store[task_id]["error"] = str(e)
        task_store[task_id]["updated_at"] = datetime.utcnow()

# ==============================
# ⭐ 异步任务API端点
# ==============================

@router.post("/submit", response_model=AsyncTaskResponse)
async def submit_review_task(
    payload: CodeReviewPayload,
    background_tasks: BackgroundTasks,
    username: str = Depends(require_api_key),
    code_review_service: CodeReviewService = Depends(get_code_review_service)
):
    """提交异步代码审查任务"""
    # 生成唯一任务ID
    task_id = str(uuid.uuid4())
    
    # 初始化任务状态
    task_store[task_id] = {
        "status": "pending",
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
        "username": username
    }
    
    # 在后台启动异步任务
    background_tasks.add_task(
        run_async_review_task, 
        task_id, payload, username, code_review_service
    )
    
    return AsyncTaskResponse(
        task_id=task_id,
        status="pending",
        message="代码审查任务已提交，正在后台处理中"
    )

@router.get("/status/{task_id}", response_model=TaskStatusResponse)
async def get_task_status(task_id: str):
    """查询异步任务状态"""
    if task_id not in task_store:
        raise HTTPException(status_code=404, detail="任务未找到")
    
    task = task_store[task_id]
    
    return TaskStatusResponse(
        task_id=task_id,
        status=task["status"],
        error=task.get("error"),
        result=task.get("result"),
        created_at=task["created_at"],
        updated_at=task["updated_at"]
    )

@router.get("/result/{task_id}")
async def get_task_result(task_id: str):
    """获取异步任务结果"""
    if task_id not in task_store:
        raise HTTPException(status_code=404, detail="任务未找到")
    
    task = task_store[task_id]
    
    if task["status"] != "completed":
        raise HTTPException(status_code=400, detail="任务尚未完成")
    
    return task["result"]

# ==============================
# ⭐ 代码审查路由（同步版本，保持向后兼容）
# ==============================

@router.post("/review")
async def review(
    payload: CodeReviewPayload,
    username: str = Depends(require_api_key),
    code_review_service: CodeReviewService = Depends(get_code_review_service)
):
    logger.info(f"Received review request for PR {payload.pr_number} by {username}")
    # 使用payload中的author作为PR作者
    author = payload.author or "unknown"
    user_id = username or "anonymous"

    # 使用新的信誉服务获取用户信誉信息
    reputation = await reputation_service.get_programmer_reputation(author)
    reputation_score = reputation["score"]
    reputation_history = reputation["history"]

    # 使用解码后的字段
    diff_text = payload.diff_content
    pr_title = payload.pr_title
    pr_body = payload.pr_body
    readme_content = payload.readme_content or "无README.md文档"
    comments = payload.comments

    # 记录审查请求日志
    log_review_request(
        author, reputation_score, reputation_history, 
        diff_text, comments, readme_content, username
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
        username=username,
        chat_history=[]
    )
    
    review_id = await code_review_service.create_review(review_data, user_id)

    # 导入AI代码审查服务
    
    # 启动AI代码审查流程（无并发限制）
    ai_service = get_ai_code_review_service(code_review_service)
    
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
    
    # 运行AI代码审查
    ai_result = await ai_service.run_ai_code_review(review_data)
    
    # 获取AI审查结果
    final_ai_output = ai_result.get("final_result", "")
    
    # 解析AI输出
    issues, summary, defect_types = parse_ai_output(final_ai_output)
    
    # 计算信誉值变化
    delta_reputation = calculate_reputation_delta(summary)
    event = build_event_description(summary, defect_types, delta_reputation, payload.pr_number)
    await reputation_service.update_programmer_reputation(author, event, delta_reputation=delta_reputation)

    ai_chat_message = build_ai_chat_message(final_ai_output,diff_text,pr_title,pr_body)
    await aicopilot_service.add_chat_message(review_id, ai_chat_message,'system')

    return { 
        "issues": issues,
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
# ⭐ 根据ID获取审查记录基础信息
# ==============================
@router.get("/reviews/{review_id}/base", response_model=CodeReviewBaseResponse)
async def get_review_base_by_id(
    review_id: str,
    username: Optional[str] = Depends(require_bearer),
    code_review_service: CodeReviewService = Depends(get_code_review_service)
):
    """根据审查记录ID获取基础信息（不包含大字段）"""  
    review = await code_review_service.get_review_by_id(review_id)
    if not review:
        raise HTTPException(status_code=404, detail="审查记录未找到")
    
    return review

# ==============================
# ⭐ 根据ID获取审查记录详细信息
# ==============================
@router.get("/reviews/{review_id}/detail", response_model=CodeReviewDetailResponse)
async def get_review_detail_by_id(
    review_id: str,
    username: Optional[str] = Depends(require_bearer),
    code_review_service: CodeReviewService = Depends(get_code_review_service)
):
    """根据审查记录ID获取详细信息（包含所有字段）"""  
    review = await code_review_service.get_review_by_id(review_id)
    if not review:
        raise HTTPException(status_code=404, detail="审查记录未找到")
    
    return review

# ==============================
# ⭐ 根据ID获取审查记录（保持向后兼容）
# ==============================
@router.get("/reviews/{review_id}", response_model=CodeReviewResponse)
async def get_review_by_id(
    review_id: str,
    username: Optional[str] = Depends(require_bearer),
    code_review_service: CodeReviewService = Depends(get_code_review_service)
):
    """根据审查记录ID获取详细的审查信息（保持向后兼容）"""  
    review = await code_review_service.get_review_by_id(review_id)
    if not review:
        raise HTTPException(status_code=404, detail="审查记录未找到")
    
    return review


# ==============================
# ⭐ 根据GitHub Action ID获取审查记录基础信息
# ==============================
@router.get("/reviews/github-action/{github_action_id}/base", response_model=CodeReviewBaseResponse)
async def get_review_base_by_github_action_id(
    github_action_id: str,
    username: str = Depends(require_bearer),
    code_review_service: CodeReviewService = Depends(get_code_review_service)
):
    """根据GitHub Action ID获取审查记录基础信息"""
    review = await code_review_service.get_review_by_github_action_id(github_action_id, username)
    if not review:
        raise HTTPException(status_code=404, detail="GitHub Action对应的审查记录未找到")
    
    return review

# ==============================
# ⭐ 根据GitHub Action ID获取审查记录详细信息
# ==============================
@router.get("/reviews/github-action/{github_action_id}/detail", response_model=CodeReviewDetailResponse)
async def get_review_detail_by_github_action_id(
    github_action_id: str,
    username: str = Depends(require_bearer),
    code_review_service: CodeReviewService = Depends(get_code_review_service)
):
    """根据GitHub Action ID获取审查记录详细信息"""
    review = await code_review_service.get_review_by_github_action_id(github_action_id, username)
    if not review:
        raise HTTPException(status_code=404, detail="GitHub Action对应的审查记录未找到")
    
    return review

# ==============================
# ⭐ 根据GitHub Action ID获取审查记录（保持向后兼容）
# ==============================
@router.get("/reviews/github-action/{github_action_id}", response_model=CodeReviewResponse)
async def get_review_by_github_action_id(
    github_action_id: str,
    username: str = Depends(require_bearer),
    code_review_service: CodeReviewService = Depends(get_code_review_service)
):
    """根据GitHub Action ID获取审查记录（保持向后兼容）"""
    review = await code_review_service.get_review_by_github_action_id(github_action_id, username)
    if not review:
        raise HTTPException(status_code=404, detail="GitHub Action对应的审查记录未找到")
    
    return review


# ==============================
# ⭐ 获取审查记录列表
# ==============================
@router.get("/reviews", response_model=SimpleCodeReviewListResponse)
async def list_reviews(
    username: str = Depends(require_bearer),
    code_review_service: CodeReviewService = Depends(get_code_review_service),
    page: int = Query(1, ge=1, description="页码"),
    size: int = Query(20, ge=1, le=100, description="每页数量")
):
    """获取代码审查记录列表"""
    skip = (page - 1) * size
    
    return await code_review_service.list_reviews(
        username=username,
        skip=skip,
        limit=size
    )



# ==============================
# ⭐ 获取当前用户最近一条审查记录基础信息
# ==============================
@router.get("/review-latest/base", response_model=CodeReviewBaseResponse)
async def get_latest_review_base_by_current_user(
    username: str = Depends(require_bearer),
    code_review_service: CodeReviewService = Depends(get_code_review_service)
):
    """
    获取当前授权用户的最近一条代码审查记录基础信息
    
    Returns:
        CodeReviewBaseResponse: 最近一条审查记录的基础信息
    """
    if not username:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="需要认证才能查询个人审查记录"
        )
    
    try:
        # 获取当前用户的最近一条审查记录（使用用户名查询）
        latest_review = await code_review_service.get_latest_review_by_username(
            username=username
        )
        
        if not latest_review:
            raise HTTPException(
                status_code=status.HTTP_204_NO_CONTENT,
                detail="当前用户暂无审查记录"
            )
        
        return latest_review
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"获取最近审查记录失败: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="获取最近审查记录失败，请稍后重试"
        )

# ==============================
# ⭐ 获取当前用户最近一条审查记录详细信息
# ==============================
@router.get("/review-latest/detail", response_model=CodeReviewDetailResponse)
async def get_latest_review_detail_by_current_user(
    username: str = Depends(require_bearer),
    code_review_service: CodeReviewService = Depends(get_code_review_service)
):
    """
    获取当前授权用户的最近一条代码审查记录详细信息
    
    Returns:
        CodeReviewDetailResponse: 最近一条审查记录的详细信息
    """
    if not username:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="需要认证才能查询个人审查记录"
        )
    
    try:
        # 获取当前用户的最近一条审查记录（使用用户名查询）
        latest_review = await code_review_service.get_latest_review_by_username(
            username=username
        )
        
        if not latest_review:
            raise HTTPException(
                status_code=status.HTTP_204_NO_CONTENT,
                detail="当前用户暂无审查记录"
            )
        
        return latest_review
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"获取最近审查记录失败: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="获取最近审查记录失败，请稍后重试"
        )

# ==============================
# ⭐ 获取当前用户最近一条审查记录（保持向后兼容）
# ==============================
@router.get("/review-latest", response_model=CodeReviewResponse)
async def get_latest_review_by_current_user(
    username: str = Depends(require_bearer),
    code_review_service: CodeReviewService = Depends(get_code_review_service)
):
    """
    获取当前授权用户的最近一条代码审查记录（保持向后兼容）
    
    Returns:
        CodeReviewResponse: 最近一条审查记录的详细信息
    """
    if not username:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="需要认证才能查询个人审查记录"
        )
    
    try:
        # 获取当前用户的最近一条审查记录（使用用户名查询）
        latest_review = await code_review_service.get_latest_review_by_username(
            username=username
        )
        
        if not latest_review:
            raise HTTPException(
                status_code=status.HTTP_204_NO_CONTENT,
                detail="当前用户暂无审查记录"
            )
        
        return latest_review
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"获取最近审查记录失败: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="获取最近审查记录失败，请稍后重试"
        )


# ==============================
# ⭐ 标记问题
# ==============================
class MarkIssuePayload(BaseModel):
    """标记问题请求模型"""
    issue_id: str = Field(..., description="问题项序号")
    marked: bool = Field(..., description="是否标记")

@router.post("/reviews/{review_id}/mark-issue")
async def mark_issue(
    review_id: str,
    payload: MarkIssuePayload,
    username: str = Depends(require_bearer),
    code_review_service: CodeReviewService = Depends(get_code_review_service)
):
    """标记或取消标记问题项"""
    # 获取当前审查记录
    review = await code_review_service.get_review_by_id(review_id)
    if not review:
        raise HTTPException(status_code=404, detail="审查记录未找到")
    
    # 获取当前标记的问题列表
    current_marked_issues = review.marked_issues or []
    
    if payload.marked:
        # 标记问题
        if payload.issue_id not in current_marked_issues:
            current_marked_issues.append(payload.issue_id)
    else:
        # 取消标记
        if payload.issue_id in current_marked_issues:
            current_marked_issues.remove(payload.issue_id)
    
    # 更新数据库
    update_data = CodeReviewUpdate(marked_issues=current_marked_issues)
    success = await code_review_service.update_review(review_id, update_data)
    
    if not success:
        raise HTTPException(status_code=500, detail="更新标记失败")
    
    return {
        "review_id": review_id,
        "issue_id": payload.issue_id,
        "marked": payload.marked,
        "marked_issues": current_marked_issues
    }


# ==============================
# ⭐ 健康检查
# ==============================
@router.get("/health")
async def health():
    return {"status": "ok"}
