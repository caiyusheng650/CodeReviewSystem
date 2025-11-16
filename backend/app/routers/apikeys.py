from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
from app.models.user import UserResponse, UserInfoResponse, ApiKey
from app.utils.auth import get_current_active_user
from app.utils.database import users_collection
from datetime import datetime
import secrets

router = APIRouter()

def generate_apikey() -> str:
    """生成API密钥"""
    return secrets.token_urlsafe(32)

def create_apikey_object(key: str) -> ApiKey:
    """创建API密钥对象"""
    return ApiKey(key=key)

@router.post("/", response_model=UserInfoResponse, summary="生成新的API密钥")
async def create_apikey(current_user: UserResponse = Depends(get_current_active_user)):
    """为当前用户生成新的API密钥"""
    new_apikey = generate_apikey()
    new_apikey_obj = create_apikey_object(new_apikey)
    
    # 将新的API密钥添加到用户的API密钥列表中
    await users_collection.update_one(
        {"email": current_user.email},
        {"$push": {"apikeys": new_apikey_obj.dict()}}
    )
    
    # 返回用户基本信息，不包含敏感的API密钥
    return UserInfoResponse(
        _id=current_user.id,
        username=current_user.username,
        email=current_user.email
    )

@router.get("/", response_model=List[ApiKey], summary="列出所有API密钥")
async def list_apikeys(current_user: UserResponse = Depends(get_current_active_user)):
    """列出当前用户的所有API密钥"""
    user = await users_collection.find_one({"email": current_user.email})
    if user and "apikeys" in user:
        return [ApiKey(**apikey) for apikey in user["apikeys"]]
    return []

@router.put("/{apikey}/disable", response_model=UserInfoResponse, summary="禁用API密钥")
async def disable_apikey(apikey: str, current_user: UserResponse = Depends(get_current_active_user)):
    """禁用指定的API密钥"""
    # 查找并禁用指定的API密钥
    result = await users_collection.update_one(
        {"email": current_user.email, "apikeys.key": apikey},
        {"$set": {"apikeys.$.is_active": False, "apikeys.$.disabled_at": datetime.utcnow()}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="API key not found"
        )
    
    # 返回用户基本信息，不包含敏感的API密钥
    return UserInfoResponse(
        _id=current_user.id,
        username=current_user.username,
        email=current_user.email
    )

@router.delete("/{apikey}", response_model=UserInfoResponse, summary="删除API密钥")
async def delete_apikey(apikey: str, current_user: UserResponse = Depends(get_current_active_user)):
    """删除指定的API密钥"""
    # 从用户的API密钥列表中移除指定的API密钥
    result = await users_collection.update_one(
        {"email": current_user.email},
        {"$pull": {"apikeys": {"key": apikey}}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="API key not found"
        )
    
    # 返回用户基本信息，不包含敏感的API密钥
    return UserInfoResponse(
        _id=current_user.id,
        username=current_user.username,
        email=current_user.email
    )

@router.put("/{apikey}/enable", response_model=UserInfoResponse, summary="启用API密钥")
async def enable_apikey(apikey: str, current_user: UserResponse = Depends(get_current_active_user)):
    """启用指定的API密钥"""
    # 查找并启用指定的API密钥
    result = await users_collection.update_one(
        {"email": current_user.email, "apikeys.key": apikey},
        {"$set": {"apikeys.$.is_active": True, "apikeys.$.disabled_at": None}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="API key not found"
        )
    
    # 返回用户基本信息，不包含敏感的API密钥
    return UserInfoResponse(
        _id=current_user.id,
        username=current_user.username,
        email=current_user.email
    )