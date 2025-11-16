from datetime import datetime, timedelta
from typing import Optional, Union, List
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
import secrets
import os
from app.models.user import UserInDB, UserResponse, ApiKey
from app.utils.database import users_collection

# 密码哈希上下文
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# JWT配置
SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

# OAuth2 scheme
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/auth/login")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """验证密码"""
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    """获取密码哈希值"""
    # 处理密码长度限制，截取前72个字符
    if len(password.encode('utf-8')) > 72:
        password = password.encode('utf-8')[:72].decode('utf-8', 'ignore')
    return pwd_context.hash(password)

def generate_apikey() -> str:
    """生成API密钥"""
    return secrets.token_urlsafe(32)

def create_apikey_object(key: str) -> ApiKey:
    """创建API密钥对象"""
    return ApiKey(key=key)

async def authenticate_user(identifier: str, password: str) -> Union[UserInDB, bool]:
    """通过用户名或电子邮件和密码验证用户"""
    # 尝试使用邮箱或用户名查找用户
    user_dict = await users_collection.find_one({
        "$or": [
            {"email": identifier},
            {"username": identifier}
        ]
    })
    if not user_dict:
        return False
    # 确保 ObjectId 被正确转换为字符串
    if user_dict and "_id" in user_dict:
        user_dict["_id"] = str(user_dict["_id"])
    user = UserInDB(**user_dict)
    if not verify_password(password, user.hashed_password):
        return False
    return user

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """创建访问令牌"""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(token: str = Depends(oauth2_scheme)) -> UserResponse:
    """获取当前用户"""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    user_dict = await users_collection.find_one({"email": email})
    if user_dict is None:
        raise credentials_exception
    
    # 确保 ObjectId 被正确转换为字符串
    if user_dict and "_id" in user_dict:
        user_dict["_id"] = str(user_dict["_id"])
    
    return UserResponse(**user_dict)

async def get_user_by_apikey(apikey: str) -> Optional[UserResponse]:
    """通过API密钥获取用户"""
    user_dict = await users_collection.find_one({
        "apikeys": {
            "$elemMatch": {
                "key": apikey,
                "is_active": True
            }
        }
    })
    
    if user_dict is None:
        return None
    
    # 确保 ObjectId 被正确转换为字符串
    if user_dict and "_id" in user_dict:
        user_dict["_id"] = str(user_dict["_id"])
    
    return UserResponse(**user_dict)

async def get_current_active_user(current_user: UserResponse = Depends(get_current_user)) -> UserResponse:
    """获取当前活跃用户"""
    # 在简化模型中，所有用户都是活跃的
    return current_user