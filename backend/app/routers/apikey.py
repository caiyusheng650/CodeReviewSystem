from fastapi import APIRouter, Depends, HTTPException, status, Query, Body
from typing import List, Optional
from app.models.user import UserResponse
from app.models.apikey import (
    ApiKeyResponse, 
    ApiKeyGenerated, 
    ApiKeyStatusUpdate, 
    ApiKeyDelete, 
    ApiKeyUsageStats,
    ApiKeyStatus
)
from app.services.apikey import apikey_service
from app.utils.userauth import require_bearer
import logging

# 配置日志
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter()

@router.post("/create", response_model=ApiKeyGenerated)
async def create_api_key(
    name: Optional[str] = Query(None, description="API密钥名称/描述"),
    expires_in: Optional[int] = Query(None, ge=1, le=365, description="过期时间（天）"),
    username: str = Depends(require_bearer)
):
    """
    创建新的API密钥
    
    注意：API密钥仅在创建时显示一次，请确保安全保存。
    """
    try:
        api_key = await apikey_service.create_api_key(
            username=username,
            name=name,
            expires_in=expires_in
        )
        return api_key
    except Exception as e:
        logger.error(f"创建API密钥失败: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="创建API密钥失败，请稍后重试"
        )

@router.get("/list", response_model=List[ApiKeyResponse])
async def list_api_keys(
    username: str = Depends(require_bearer)
):
    """
    获取当前用户的所有API密钥
    
    返回的API密钥不包含完整密钥，仅包含密钥预览。
    """
    try:
        api_keys = await apikey_service.get_user_api_keys(username=username)
        return api_keys
    except Exception as e:
        logger.error(f"获取API密钥列表失败: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="获取API密钥列表失败，请稍后重试"
        )

@router.get("/{apikey_id}", response_model=ApiKeyResponse)
async def get_api_key(
    apikey_id: str,
    username: str = Depends(require_bearer)
):
    """
    获取单个API密钥的详细信息
    
    注意：不返回完整密钥，仅返回密钥预览。
    """
    try:
        api_key = await apikey_service.get_api_key_by_id(apikey_id)
        if not api_key:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="API密钥不存在"
            )
        
        # 验证所有权
        if api_key.username != username:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="无权访问此API密钥"
            )
        
        return api_key
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"获取API密钥详情失败: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="获取API密钥详情失败，请稍后重试"
        )

@router.put("/{apikey_id}/status", response_model=ApiKeyResponse)
async def update_api_key_status(
    apikey_id: str,
    status_update: ApiKeyStatusUpdate,
    username: str = Depends(require_bearer) 
):
    """
    更新API密钥状态
    
    可以将API密钥设置为激活(active)、非激活(inactive)或已撤销(revoked)状态。
    """
    try:
        # 先获取API密钥以验证所有权
        api_key = await apikey_service.get_api_key_by_id(apikey_id)
        if not api_key:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="API密钥不存在"
            )
        
        # 验证所有权
        if api_key.username != username:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="无权修改此API密钥"
            )

        
        # 更新状态
        updated_api_key = await apikey_service.update_api_key_status(
            apikey_id=apikey_id,
            status=status_update.status
        )
        if not updated_api_key:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="更新API密钥状态失败"
            )
        
        return updated_api_key
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"更新API密钥状态失败: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="更新API密钥状态失败，请稍后重试"
        )

@router.delete("/{apikey_id}")
async def delete_api_key(
    apikey_id: str,
    confirm: ApiKeyDelete = Body(...),
    username: str = Depends(require_bearer) 
):
    """
    删除API密钥
    
    需要确认删除操作。删除后，该API密钥将立即失效。
    """
    try:
        # 验证确认删除
        if not confirm.confirm_delete:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="请确认删除操作"
            )
        
        # 先获取API密钥以验证所有权
        api_key = await apikey_service.get_api_key_by_id(apikey_id)
        if not api_key:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="API密钥不存在"
            )
        
        # 验证所有权
        if api_key.username != username:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="无权删除此API密钥"
            )
        
        # 删除API密钥
        success = await apikey_service.delete_api_key(
            apikey_id=apikey_id,
            username=username
        )
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="删除API密钥失败"
            )
        
        return {"message": "API密钥已成功删除"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"删除API密钥失败: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="删除API密钥失败，请稍后重试"
        )

@router.post("/activate/{apikey_id}", response_model=ApiKeyResponse)
async def activate_api_key(
    apikey_id: str,
    username: str = Depends(require_bearer) 
):
    """
    激活API密钥
    
    将API密钥状态设置为激活(active)。
    """
    return await update_api_key_status(
        apikey_id=apikey_id,
        status_update=ApiKeyStatusUpdate(status=ApiKeyStatus.ACTIVE),
        username=username
    )

@router.post("/deactivate/{apikey_id}", response_model=ApiKeyResponse)
async def deactivate_api_key(
    apikey_id: str,
    username: str = Depends(require_bearer) 
):
    """
    停用API密钥
    
    将API密钥状态设置为非激活(inactive)。
    """
    return await update_api_key_status(
        apikey_id=apikey_id,
        status_update=ApiKeyStatusUpdate(status=ApiKeyStatus.INACTIVE),
        username=username
    )

@router.post("/revoke/{apikey_id}", response_model=ApiKeyResponse)
async def revoke_api_key(
    apikey_id: str,
    username: str = Depends(require_bearer) 
):
    """
    撤销API密钥
    
    将API密钥状态设置为已撤销(revoked)。
    """
    return await update_api_key_status(
        apikey_id=apikey_id,
        status_update=ApiKeyStatusUpdate(status=ApiKeyStatus.REVOKED),
        username=username
    )