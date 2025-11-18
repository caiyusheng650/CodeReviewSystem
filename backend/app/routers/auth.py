from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from typing import Dict, Any, List
from app.models.user import UserCreate, UserInDB, UserResponse, UserInfoResponse
from app.utils.auth import (
    authenticate_user,
    create_access_token,
    get_password_hash,
    get_current_active_user
)
from app.services.apikey import apikey_service
from app.utils.database import users_collection
from datetime import timedelta, datetime
from bson import ObjectId
import os

router = APIRouter()

ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", 30))

@router.post("/login", response_model=Dict[str, Any])
async def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends()):
    """用户登录接口"""
    # 注意：OAuth2PasswordRequestForm 使用 username 字段接收电子邮件地址
    user = await authenticate_user(form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.email}, expires_delta=access_token_expires
    )
    
    # 登录时只返回用户基本信息，不包含敏感的API密钥
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": UserInfoResponse(
            _id=str(user.id),
            email=user.email,
            username=user.username
        ).dict()
    }

@router.post("/register", response_model=UserInfoResponse)
async def register_user(user_data: UserCreate):
    """用户注册接口"""
    # 检查用户是否已存在（通过邮箱或用户名）
    existing_user_email = await users_collection.find_one({"email": user_data.email})
    if existing_user_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
        
    existing_user_name = await users_collection.find_one({"username": user_data.username})
    if existing_user_name:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already taken"
        )
    
    # 创建新用户
    hashed_password = get_password_hash(user_data.password)
    
    user_dict = {
        "email": user_data.email,
        "username": user_data.username,
        "hashed_password": hashed_password,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
        "reputation_score": 60,
        "reputation_history": []
    }
    
    result = await users_collection.insert_one(user_dict)
    user_id = str(result.inserted_id)
    
    # 为新用户生成API密钥
    await apikey_service.create_api_key(user_id)
    
    created_user = await users_collection.find_one({"_id": result.inserted_id})
    
    # 确保 ObjectId 被正确转换为字符串
    if created_user and "_id" in created_user:
        created_user["_id"] = str(created_user["_id"])
    
    # 注册时只返回用户基本信息，不包含敏感的API密钥
    return UserInfoResponse(**created_user)

@router.get("/me", response_model=UserInfoResponse)
async def read_users_me(current_user: UserResponse = Depends(get_current_active_user)):
    """获取当前用户信息"""
    # 只返回基本信息，不包含敏感的API密钥
    return UserInfoResponse(
        _id=current_user.id,
        username=current_user.username,
        email=current_user.email
    )