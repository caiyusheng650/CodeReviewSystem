# 统一认证入口 - 重新导出user_auth和api_key模块的功能
from typing import Optional
from app.models.user import UserResponse

# 导入用户认证模块
from app.utils.userauth import (
    pwd_context,
    verify_password,
    get_password_hash,
    authenticate_user,
    create_access_token,
    get_current_user,
    get_current_active_user,
    oauth2_scheme,
    SECRET_KEY,
    ALGORITHM,
    ACCESS_TOKEN_EXPIRE_MINUTES,
)

# 导入API密钥认证模块
from app.utils.apikey import (
    apikey_bearer,
    extract_api_key_from_bearer,
    require_api_key,
)

# 保持兼容性：实现同时支持两种认证方式的复合依赖
from app.utils.userauth import get_current_user as _get_current_user
from app.services.apikey_service import apikey_service
from app.utils.database import users_collection
from bson import ObjectId
from fastapi import Depends

async def get_user_by_apikey(credentials: Optional[dict] = Depends(require_api_key)) -> Optional[UserResponse]:
    """通过API密钥获取用户"""
    if not credentials:
        return None
    
    # 获取用户信息
    user_dict = await users_collection.find_one({"_id": ObjectId(credentials["user_id"])})
    if not user_dict:
        return None
    
    # 确保ObjectId被正确转换为字符串
    if user_dict and "_id" in user_dict:
        user_dict["_id"] = str(user_dict["_id"])
    
    # 移除旧的apikeys字段（已不再使用，API密钥现在存储在独立集合中）
    user_dict.pop("apikeys", None)
    
    # 创建UserResponse对象并添加认证类型信息
    user_response = UserResponse(**user_dict)
    # 使用属性扩展UserResponse，记录认证方式
    user_response.__dict__.setdefault("auth_type", "api_key")
    return user_response

async def get_current_user_optional(
    token_user: Optional[UserResponse] = Depends(_get_current_user),
    apikey_user: Optional[UserResponse] = Depends(get_user_by_apikey)
) -> Optional[UserResponse]:
    """
    获取当前用户（支持JWT和API密钥两种方式）
    
    如果两种认证方式都提供，优先使用JWT认证。
    """
    # 优先使用JWT认证
    if token_user:
        return token_user
    # 其次使用API密钥认证
    return apikey_user

async def get_current_active_user_optional(
    current_user: Optional[UserResponse] = Depends(get_current_user_optional)
) -> Optional[UserResponse]:
    """获取当前活跃用户（支持JWT和API密钥两种方式）"""
    # 这里可以添加额外的用户活跃状态检查
    return current_user