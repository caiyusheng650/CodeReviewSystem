from typing import Optional, Dict, Any, List
from datetime import datetime, timedelta
from passlib.context import CryptContext
import secrets
import logging
from bson import ObjectId

from app.utils.database import apikeys_collection, users_collection
from app.models.apikey import ApiKeyInDB, ApiKeyResponse, ApiKeyGenerated, ApiKeyStatus

# 配置日志
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# API密钥哈希上下文
apikey_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

class ApiKeyService:
    """API密钥服务类，用于处理API密钥的生成、验证和管理"""
    
    @staticmethod
    def generate_api_key() -> str:
        """
        生成安全的API密钥
        
        Returns:
            str: 生成的API密钥
        """
        # 使用secrets模块生成安全的随机密钥
        return secrets.token_urlsafe(32)
    
    @staticmethod
    def get_api_key_hash(api_key: str) -> str:
        """
        获取API密钥的哈希值
        
        Args:
            api_key: API密钥明文
            
        Returns:
            str: 哈希后的API密钥
        """
        # 处理API密钥长度限制，截取前72个字符
        if len(api_key.encode('utf-8')) > 72:
            api_key = api_key.encode('utf-8')[:72].decode('utf-8', 'ignore')
        return apikey_context.hash(api_key)
    
    @staticmethod
    def verify_api_key(api_key: str, hashed_api_key: str) -> bool:
        """
        验证API密钥
        
        Args:
            api_key: API密钥明文
            hashed_api_key: 哈希后的API密钥
            
        Returns:
            bool: 验证结果
        """
        return apikey_context.verify(api_key, hashed_api_key)
    
    @staticmethod
    def generate_key_preview(api_key: str) -> str:
        """
        生成API密钥预览（只显示部分字符，用于UI展示）
        
        Args:
            api_key: API密钥明文
            
        Returns:
            str: API密钥预览（例如：ak_abcdefgh...1234）
        """
        if len(api_key) < 12:
            return api_key
        return f"{api_key[:8]}...{api_key[-4:]}"
    
    @staticmethod
    async def create_api_key(username: str, name: Optional[str] = None, 
                           expires_in: Optional[int] = None) -> ApiKeyGenerated:
        """
        创建新的API密钥
        
        Args:
            username: 用户名
            name: API密钥名称/描述
            expires_in: 过期时间（天）
            
        Returns:
            ApiKeyGenerated: 包含生成的API密钥的响应对象
        """
        # 生成API密钥
        api_key = ApiKeyService.generate_api_key()
        api_key_hash = ApiKeyService.get_api_key_hash(api_key)
        key_preview = ApiKeyService.generate_key_preview(api_key)
        
        # 计算过期时间
        expires_at = None
        if expires_in:
            expires_at = datetime.utcnow() + timedelta(days=expires_in)
        
        # 创建API密钥对象
        apikey_doc = {
            "username": username,
            "name": name,
            "api_key_hash": api_key_hash,
            "key_preview": key_preview,
            "status": ApiKeyStatus.ACTIVE.value,
            "permissions": {},
            "usage_count": 0,
            "rate_limit": 1000,
            "created_at": datetime.utcnow(),
            "last_used": None,
            "expires_at": expires_at,
            "successful_requests": 0,
            "failed_requests": 0,
            "rate_limit_hits": 0,
            "last_hour_requests": 0,
            "last_day_requests": 0
        }
        
        # 保存到数据库
        result = await apikeys_collection.insert_one(apikey_doc)
        apikey_doc["_id"] = result.inserted_id
        
        logger.info(f"为用户 {username} 创建了新的API密钥: {key_preview}")
        
        # 返回生成的API密钥（仅在创建时返回完整密钥）
        return ApiKeyGenerated(
            id=str(result.inserted_id),
            api_key=api_key,
            key_preview=key_preview,
            name=name,
            created_at=apikey_doc["created_at"],
            expires_at=expires_at
        )
    
    @staticmethod
    async def get_api_key_by_id(apikey_id: str) -> Optional[ApiKeyResponse]:
        """
        通过ID获取API密钥信息（不返回完整密钥）
        
        Args:
            apikey_id: API密钥ID
            
        Returns:
            Optional[ApiKeyResponse]: API密钥信息
        """
        apikey_doc = await apikeys_collection.find_one({"_id": ObjectId(apikey_id)})
        if not apikey_doc:
            return None
        
        # 转换ObjectId为字符串
        apikey_doc["_id"] = str(apikey_doc["_id"])
        return ApiKeyResponse(**apikey_doc)
    
    @staticmethod
    async def get_user_api_keys(username: str) -> List[ApiKeyResponse]:
        """
        获取用户的所有API密钥
        
        Args:
            username: 用户名
            
        Returns:
            List[ApiKeyResponse]: API密钥列表
        """
        apikey_docs = await apikeys_collection.find({"username": username}).to_list(100)
        
        # 转换ObjectId为字符串
        for doc in apikey_docs:
            doc["_id"] = str(doc["_id"])
        
        return [ApiKeyResponse(**doc) for doc in apikey_docs]
    
    @staticmethod
    async def update_api_key_status(apikey_id: str, status: ApiKeyStatus) -> Optional[ApiKeyResponse]:
        """
        更新API密钥状态
        
        Args:
            apikey_id: API密钥ID
            status: 新状态
            
        Returns:
            Optional[ApiKeyResponse]: 更新后的API密钥信息
        """
        result = await apikeys_collection.update_one(
            {"_id": ObjectId(apikey_id)},
            {"$set": {"status": status.value}}
        )
        
        if result.modified_count == 0:
            return None
        
        logger.info(f"API密钥 {apikey_id} 状态更新为: {status.value}")
        return await ApiKeyService.get_api_key_by_id(apikey_id)
    
    @staticmethod
    async def delete_api_key(apikey_id: str, username: str) -> bool:
        """
        删除API密钥
        
        Args:
            apikey_id: API密钥ID
            username: 用户名（用于验证所有权）
            
        Returns:
            bool: 删除结果
        """
        result = await apikeys_collection.delete_one(
            {"_id": ObjectId(apikey_id), "username": username}
        )
        
        if result.deleted_count > 0:
            logger.info(f"用户 {username} 删除了API密钥: {apikey_id}")
            return True
        
        return False
    
    @staticmethod
    async def increment_usage_count(apikey_id: str) -> bool:
        """
        增加API密钥的使用次数
        
        Args:
            apikey_id: API密钥ID
            
        Returns:
            bool: 增加使用次数是否成功
        """
        try:
            # 转换为ObjectId并更新使用次数
            result = await apikeys_collection.update_one(
                {"_id": ObjectId(apikey_id), "status": ApiKeyStatus.ACTIVE.value},
                {
                    "$set": {"last_used": datetime.utcnow()},
                    "$inc": {"usage_count": 1, "last_hour_requests": 1, "last_day_requests": 1}
                }
            )
            return result.modified_count > 0
        except Exception as e:
            logger.error(f"增加API密钥使用次数失败: {str(e)}")
            return False

    @staticmethod
    async def validate_api_key(api_key: str) -> str:
        """
        验证API密钥并返回用户名
        
        Args:
            api_key: API密钥
            
        Returns:
            Optional[Dict[str, Any]]: 包含用户名和密钥信息的字典，如果验证失败则返回None
        """
        # 遍历所有API密钥进行验证（在实际应用中，可能需要优化查询方式）
        async for apikey_doc in apikeys_collection.find({"status": ApiKeyStatus.ACTIVE.value}):
            if ApiKeyService.verify_api_key(api_key, apikey_doc.get("api_key_hash", "")):
                # 检查是否过期
                if apikey_doc.get("expires_at") and apikey_doc["expires_at"] < datetime.utcnow():
                    # 更新状态为已过期
                    await apikeys_collection.update_one(
                        {"_id": apikey_doc["_id"]},
                        {"$set": {"status": ApiKeyStatus.REVOKED.value}}
                    )
                    return None
                
                return apikey_doc["username"]
        
        return None

# 创建全局实例
apikey_service = ApiKeyService()