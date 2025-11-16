from fastapi import APIRouter, Depends
from app.models.user import UserResponse, UserInfoResponse
from app.utils.auth import get_current_active_user

router = APIRouter()

@router.get("/protected")
async def protected_route(current_user: UserResponse = Depends(get_current_active_user)):
    """受保护的路由示例"""
    # 只返回用户基本信息，不包含敏感的API密钥
    user_info = UserInfoResponse(
        _id=current_user.id,
        username=current_user.username,
        email=current_user.email
    )
    
    return {
        "message": "这是一个受保护的路由，只有认证用户才能访问",
        "user": user_info.dict()
    }