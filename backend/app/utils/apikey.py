from fastapi import Depends, HTTPException, status, Request
from app.services.apikey import apikey_service

import logging

logger = logging.getLogger(__name__)

async def require_api_key(
    request: Request,
):

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
    username = await apikey_service.validate_api_key(api_key)
    if not username:
        logger.error(f"API密钥验证: 无效的API密钥 - {api_key[:20]}...")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="无效的API密钥",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    logger.info(f"API密钥验证成功: {username}")
    return username
