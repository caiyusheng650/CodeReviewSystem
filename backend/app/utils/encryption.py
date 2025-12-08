"""
加密工具模块
用于对敏感数据进行加密和解密，如access_token等
"""
import os
import base64
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
import logging

logger = logging.getLogger(__name__)

class TokenEncryption:
    """令牌加密类"""
    
    def __init__(self):
        # 从环境变量获取加密密钥
        self.encryption_key = os.getenv("TOKEN_ENCRYPTION_KEY")
        
        # 如果没有设置环境变量，使用默认密钥（仅用于开发环境）
        if not self.encryption_key:
            logger.warning("TOKEN_ENCRYPTION_KEY环境变量未设置，使用默认密钥（仅限开发环境）")
            self.encryption_key = "default-encryption-key-for-development-only"
        
        # 生成Fernet密钥
        self.fernet = self._generate_fernet_key(self.encryption_key)
    
    def _generate_fernet_key(self, password: str) -> Fernet:
        """
        根据密码生成Fernet密钥
        
        Args:
            password: 密码字符串
            
        Returns:
            Fernet: Fernet加密对象
        """
        # 使用PBKDF2从密码派生密钥
        salt = b'jira_token_encryption_salt'  # 固定盐值
        kdf = PBKDF2HMAC(
            algorithm=hashes.SHA256(),
            length=32,
            salt=salt,
            iterations=100000,
        )
        key = base64.urlsafe_b64encode(kdf.derive(password.encode()))
        return Fernet(key)
    
    def encrypt_token(self, token: str) -> str:
        """
        加密令牌
        
        Args:
            token: 要加密的令牌字符串
            
        Returns:
            str: 加密后的令牌（base64编码）
        """
        if not token:
            return ""
        
        try:
            encrypted_token = self.fernet.encrypt(token.encode())
            return encrypted_token.decode('utf-8')
        except Exception as e:
            logger.error(f"加密令牌失败: {str(e)}")
            raise
    
    def decrypt_token(self, encrypted_token: str) -> str:
        """
        解密令牌
        
        Args:
            encrypted_token: 加密的令牌字符串
            
        Returns:
            str: 解密后的原始令牌
        """
        if not encrypted_token:
            return ""
        
        try:
            decrypted_token = self.fernet.decrypt(encrypted_token.encode())
            return decrypted_token.decode('utf-8')
        except Exception as e:
            logger.error(f"解密令牌失败: {str(e)}")
            raise

# 创建全局加密实例
token_encryption = TokenEncryption()

def encrypt_access_token(token: str) -> str:
    """
    加密access_token的便捷函数
    
    Args:
        token: access_token字符串
        
    Returns:
        str: 加密后的access_token
    """
    return token_encryption.encrypt_token(token)

def decrypt_access_token(encrypted_token: str) -> str:
    """
    解密access_token的便捷函数
    
    Args:
        encrypted_token: 加密的access_token字符串
        
    Returns:
        str: 解密后的access_token
    """
    return token_encryption.decrypt_token(encrypted_token)

def encrypt_refresh_token(token: str) -> str:
    """
    加密refresh_token的便捷函数
    
    Args:
        token: refresh_token字符串
        
    Returns:
        str: 加密后的refresh_token
    """
    return token_encryption.encrypt_token(token)

def decrypt_refresh_token(encrypted_token: str) -> str:
    """
    解密refresh_token的便捷函数
    
    Args:
        encrypted_token: 加密的refresh_token字符串
        
    Returns:
        str: 解密后的refresh_token
    """
    return token_encryption.decrypt_token(encrypted_token)