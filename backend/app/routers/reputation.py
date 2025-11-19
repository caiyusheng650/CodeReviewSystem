from fastapi import APIRouter, HTTPException, Depends
from typing import Dict, Optional
from app.services.reputation import reputation_service
from app.models.user import UserResponse
from app.utils.auth import get_current_user_optional

router = APIRouter(prefix="/reputation")


@router.get("/{username}")
async def get_reputation_by_username(
    username: str,
    current_user: Optional[UserResponse] = Depends(get_current_user_optional)
) -> Dict:
    """
    根据用户名查询程序员的信誉信息
    
    Args:
        username: 要查询的用户名
        current_user: 当前用户（可选，用于记录查询者信息）
        
    Returns:
        包含信誉分数和历史记录的字典
    """
    try:
        reputation_info = await reputation_service.get_programmer_reputation(username)
        
        # 记录查询日志（可选）
        if current_user:
            print(f"用户 {current_user.username} 查询了 {username} 的信誉信息")
        
        return {
            "username": username,
            "reputation_score": reputation_info["score"],
            "reputation_history": reputation_info["history"],
            "query_by": current_user.username if current_user else "anonymous"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"查询信誉信息失败: {str(e)}")


@router.get("/")
async def get_current_user_reputation(
    current_user: UserResponse = Depends(get_current_user_optional)
) -> Dict:
    """
    查询当前用户的信誉信息（需要认证）
    
    Args:
        current_user: 当前认证用户
        
    Returns:
        当前用户的信誉信息
    """
    if not current_user:
        raise HTTPException(status_code=401, detail="需要认证才能查询当前用户的信誉信息")
    
    try:
        reputation_info = await reputation_service.get_programmer_reputation(current_user.username)
        
        return {
            "username": current_user.username,
            "reputation_score": reputation_info["score"],
            "reputation_history": reputation_info["history"]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"查询当前用户信誉信息失败: {str(e)}")


@router.get("/search/{keyword}")
async def search_reputation_by_keyword(
    keyword: str,
    current_user: Optional[UserResponse] = Depends(get_current_user_optional)
) -> Dict:
    """
    根据关键词搜索程序员的信誉信息
    
    Args:
        keyword: 搜索关键词（用户名的一部分）
        current_user: 当前用户（可选）
        
    Returns:
        包含匹配用户信誉信息的列表
    """
    try:
        # 这里需要实现搜索功能，暂时返回空列表
        # 后续可以扩展为从数据库搜索匹配的用户名
        return {
            "keyword": keyword,
            "results": [],
            "message": "搜索功能待实现"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"搜索信誉信息失败: {str(e)}")