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
from fastapi import Depends, HTTPException, status
from jose import JWTError, jwt

from fastapi import Request
from fastapi.security import HTTPBearer
from fastapi.security.utils import get_authorization_scheme_param
from bson import ObjectId

async def get_current_user_optional(
    request: Request,
    jwt_credentials: Optional[HTTPBearer] = Depends(HTTPBearer(auto_error=False)),
    api_credentials: Optional[HTTPBearer] = Depends(HTTPBearer(auto_error=False))
) -> Optional[UserResponse]:
    """
    获取当前用户（支持JWT和API密钥两种方式）
    
    如果两种认证方式都提供，优先使用JWT认证。
    """
    # 1. 尝试JWT认证
    token = None
    if jwt_credentials and jwt_credentials.credentials:
        scheme, param = get_authorization_scheme_param(jwt_credentials.credentials)
        if scheme.lower() == "bearer":
            token = param
    
    if token:
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            username: str = payload.get("sub")
            if username is None:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Could not validate credentials",
                    headers={"WWW-Authenticate": "Bearer"},
                )
            # 获取用户信息
            user_dict = await users_collection.find_one({"username": username})
            if not user_dict:
                return None
            
            # 确保ObjectId被正确转换为字符串
            if user_dict and "_id" in user_dict:
                user_dict["_id"] = str(user_dict["_id"])
            
            # 移除旧的apikeys字段
            user_dict.pop("apikeys", None)
            
            # 创建UserResponse对象并添加认证类型信息
            user_response = UserResponse(**user_dict)
            user_response.__dict__.setdefault("auth_type", "bearer")
            return user_response
        except JWTError:
            # JWT认证失败，继续尝试API密钥认证
            pass
    
    # 2. 尝试API密钥认证
    api_key = None
    
    # 先尝试从Authorization头获取Bearer令牌
    if api_credentials and api_credentials.credentials:
        scheme, param = get_authorization_scheme_param(api_credentials.credentials)
        if scheme.lower() == "bearer":
            api_key = param
    
    # 如果Bearer令牌提取失败，尝试从X-Api-Key头获取API密钥
    if not api_key:
        api_key = request.headers.get("X-Api-Key")
    
    if api_key:
        # 验证API密钥
        apikey_info = await apikey_service.validate_api_key(api_key)
        if apikey_info:
            # 获取用户信息
            user_dict = await users_collection.find_one({"_id": ObjectId(apikey_info["user_id"])})
            if not user_dict:
                return None
            
            # 确保ObjectId被正确转换为字符串
            if user_dict and "_id" in user_dict:
                user_dict["_id"] = str(user_dict["_id"])
            
            # 移除旧的apikeys字段
            user_dict.pop("apikeys", None)
            
            # 创建UserResponse对象并添加认证类型信息
            user_response = UserResponse(**user_dict)
            user_response.__dict__.setdefault("auth_type", "api_key")
            return user_response
    
    # 两种认证方式都失败，返回None
    return None

async def get_current_active_user_optional(
    current_user: Optional[UserResponse] = Depends(get_current_user_optional)
) -> Optional[UserResponse]:
    """获取当前活跃用户（支持JWT和API密钥两种方式）"""
    # 这里可以添加额外的用户活跃状态检查
    return current_user