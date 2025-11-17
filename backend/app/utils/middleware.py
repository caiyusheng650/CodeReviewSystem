from fastapi import Request, HTTPException, status
from fastapi.responses import JSONResponse
from fastapi.security import APIKeyHeader, HTTPBearer
from fastapi.security.utils import get_authorization_scheme_param
from app.services.apikey_service import apikey_service
from app.utils.database import users_collection
from bson import ObjectId
import logging
# 导入JWT相关模块
from jose import JWTError, jwt
from app.utils.userauth import SECRET_KEY, ALGORITHM

logger = logging.getLogger(__name__)

async def api_key_middleware(request: Request, call_next):
    """
    API密钥和JWT令牌认证中间件
    
    该中间件会检查所有请求中的认证信息：
    1. 首先检查Authorization头部的Bearer令牌
       - 如果是有效的JWT令牌，则进行JWT认证
    2. 如果JWT认证失败或没有Bearer令牌，则检查X-Api-Key头部
       - 如果存在X-Api-Key，则尝试进行API密钥认证
    如果验证成功，则将用户信息和认证类型添加到请求状态中。
    注意：这个中间件不会拒绝没有API密钥或JWT的请求，它只是验证并设置用户信息。
    对于需要强制认证的路由，应该使用相应的依赖（如get_current_user或require_api_key）。
    """
    try:
        # 初始化认证状态
        request.state.user = None
        request.state.auth_type = None
        request.state.api_key = None
        
        # 1. 检查Authorization头部的Bearer令牌
        authorization_header = request.headers.get("Authorization")
        if authorization_header:
            scheme, param = get_authorization_scheme_param(authorization_header)
            logger.info(f"Bearer令牌验证: 发现Authorization头 - scheme: {scheme}, param: {param}")
            if scheme.lower() == "bearer":
                token = param
                
                # 尝试验证JWT令牌
                try:
                    # 解码JWT令牌
                    payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
                    email: str = payload.get("sub")
                    if email:
                        # 通过邮箱查找用户
                        user_dict = await users_collection.find_one({"email": email})
                        if user_dict:
                            # 确保ObjectId被正确转换为字符串
                            user_dict["_id"] = str(user_dict["_id"])
                            # 将用户信息和认证类型添加到请求状态中
                            request.state.user = user_dict
                            request.state.auth_type = "bearer"
                            logger.info(f"Bearer令牌验证成功: user_id={user_dict['_id']}, email={email}")
                        else:
                            logger.error(f"Bearer令牌验证失败: 未找到用户 (email: {email})")
                    else:
                        logger.error(f"Bearer令牌验证失败: JWT payload中没有sub字段")
                except JWTError as e:
                    logger.error(f"Bearer令牌验证失败: JWT解码错误 - {str(e)}")
            else:
                logger.error(f"Bearer令牌验证失败: 令牌方案错误 - 期望bearer，得到{scheme}")
        else:
            logger.info(f"Bearer令牌验证: 未找到Authorization头")
        
        # 2. 如果没有JWT认证成功，检查X-Api-Key头部
        if not request.state.user:
            x_api_key = request.headers.get("X-Api-Key")
            if x_api_key:
                logger.info(f"API密钥验证: 发现X-Api-Key头")
                try:
                    apikey_info = await apikey_service.validate_api_key(x_api_key)
                    
                    if apikey_info:
                        # 获取用户信息
                        user_dict = await users_collection.find_one({"_id": ObjectId(apikey_info["user_id"])})
                        
                        if user_dict:
                            # 确保ObjectId被正确转换为字符串
                            user_dict["_id"] = str(user_dict["_id"])
                            # 将用户信息、API密钥信息和认证类型添加到请求状态中
                            request.state.user = user_dict
                            request.state.api_key = apikey_info
                            request.state.auth_type = "api_key"
                            
                            # 记录API密钥使用情况
                            await apikey_service.increment_usage_count(apikey_info["_id"])
                            logger.info(f"API密钥验证成功: user_id={user_dict['_id']}, api_key_id={apikey_info['_id']}")
                        else:
                            logger.error(f"API密钥验证失败: 未找到对应用户 (user_id: {apikey_info['user_id']})")
                    else:
                        logger.error(f"API密钥验证失败: 无效的API密钥")
                except Exception as e:
                    logger.error(f"API密钥验证失败: 验证过程出错 - {str(e)}")
            else:
                logger.info(f"API密钥验证: 未找到X-Api-Key头")
        
        # 继续处理请求
        response = await call_next(request)
        return response
        
    except Exception as e:
        logger.error(f"认证中间件错误: {str(e)}")
        # 继续处理请求，不要因为中间件错误而阻止请求
        return await call_next(request)

async def get_current_user_from_request(request: Request):
    """
    从请求状态中获取当前用户信息
    
    该函数可以在路由处理函数中使用，通过依赖注入获取当前已认证的用户信息。
    """
    if hasattr(request.state, "user"):
        return request.state.user
    return None

async def get_current_apikey_from_request(request: Request):
    """
    从请求状态中获取当前API密钥信息
    
    该函数可以在路由处理函数中使用，通过依赖注入获取当前已认证的API密钥信息。
    """
    if hasattr(request.state, "api_key"):
        return request.state.api_key
    return None