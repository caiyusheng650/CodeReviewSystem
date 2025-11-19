from datetime import datetime, timedelta
from typing import Optional, Union
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, HTTPBearer, HTTPAuthorizationCredentials
import os
from app.models.user import UserInDB, UserResponse
from app.utils.database import users_collection
from bson import ObjectId
import logging
logger = logging.getLogger(__name__)


# 密码哈希上下文
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# JWT配置
SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

# OAuth2 scheme
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/auth/login")

# HTTPBearer for simpler Bearer token authentication
http_bearer = HTTPBearer(auto_error=False)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """验证密码"""
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    """获取密码哈希值"""
    # 处理密码长度限制，截取前72个字符
    if len(password.encode('utf-8')) > 72:
        password = password.encode('utf-8')[:72].decode('utf-8', 'ignore')
    return pwd_context.hash(password)

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



async def require_bearer(token: str = Depends(oauth2_scheme)) -> str:
    """
    使用FastAPI的OAuth2PasswordBearer依赖获取当前用户
    
    Args:
        token: 从Authorization头提取的Bearer令牌
        
    Returns:
        UserResponse: 认证成功的用户信息
        
    Raises:
        HTTPException: 认证失败时抛出401错误
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        # 使用FastAPI推荐的JWT解码方式
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        identifier: str = payload.get("sub")
        if identifier is None:
            logger.error("Bearer令牌验证失败: JWT payload中没有sub字段")
            raise credentials_exception
    except JWTError as e:
        logger.error(f"Bearer令牌验证失败: JWT解码错误 - {str(e)}")
        raise credentials_exception
    
    # 使用email或username查找用户（与authenticate_user保持一致）
    user_dict = await users_collection.find_one({
        "$or": [
            {"email": identifier},
            {"username": identifier}
        ]
    })
    if user_dict is None:
        logger.error(f"Bearer令牌验证失败: 未找到用户 (identifier: {identifier})")
        raise credentials_exception
    return user_dict['username']
    



