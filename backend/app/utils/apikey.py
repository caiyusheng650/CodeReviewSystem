from typing import Optional
from fastapi import Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer
from fastapi.security.utils import get_authorization_scheme_param
from app.services.apikey_service import apikey_service

# API密钥使用Bearer令牌方式
apikey_bearer = HTTPBearer(auto_error=False)

def extract_api_key_from_bearer(bearer_token: str) -> Optional[str]:
    """从Bearer令牌中提取API密钥"""
    scheme, param = get_authorization_scheme_param(bearer_token)
    if scheme.lower() != "bearer":
        return None
    return param

import logging

logger = logging.getLogger(__name__)

async def require_api_key(
    request: Request,
    credentials: Optional[HTTPBearer] = Depends(apikey_bearer)
):
    """要求提供有效的API密钥（支持Bearer令牌和X-Api-Key头部两种方式）"""
    api_key = None
    
    # 先尝试从Authorization头获取Bearer令牌
    if credentials and credentials.credentials:
        logger.info(f"API密钥验证: 检查Authorization头 - {credentials.credentials[:20]}...")
        api_key = extract_api_key_from_bearer(credentials.credentials)
        if api_key:
            logger.info(f"API密钥验证: 从Bearer令牌提取到API密钥 - {api_key[:20]}...")
        else:
            logger.error(f"API密钥验证: 从Bearer令牌提取API密钥失败 - 令牌格式错误")
    
    # 如果Bearer令牌提取失败，尝试从X-Api-Key头获取API密钥
    if not api_key:
        api_key = request.headers.get("X-Api-Key")
        if api_key:
            logger.info(f"API密钥验证: 从X-Api-Key头获取到API密钥 - {api_key[:20]}...")
        else:
            logger.error(f"API密钥验证: 未提供API密钥 - 未找到Authorization或X-Api-Key头")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="未提供API密钥",
                headers={"WWW-Authenticate": "Bearer"},
            )
    
    # 验证API密钥
    logger.info(f"API密钥验证: 验证API密钥 - {api_key[:20]}...")
    apikey_info = await apikey_service.validate_api_key(api_key)
    if not apikey_info:
        logger.error(f"API密钥验证: 无效的API密钥 - {api_key[:20]}...")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="无效的API密钥",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    logger.info(f"API密钥验证成功: API密钥ID - {apikey_info['_id']}, 用户ID - {apikey_info['user_id']}")
    return apikey_info