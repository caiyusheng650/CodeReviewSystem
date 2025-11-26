"""用户模型模块

此模块定义了与用户相关的数据模型和MongoDB ObjectId的自定义类型，用于代码审查系统中的用户管理功能。
包含用户基础模型、创建模型、数据库模型和各类响应模型，以及API密钥引用模型。
"""

from pydantic import BaseModel, EmailStr, Field, GetJsonSchemaHandler, ConfigDict
from typing import Optional, Dict, Any, List
from datetime import datetime
from bson import ObjectId
from pydantic_core import CoreSchema


class PyObjectId(ObjectId):
    """MongoDB ObjectId的Pydantic兼容实现
    
    自定义类型，用于处理MongoDB ObjectId在Pydantic模型中的序列化和反序列化。
    确保ObjectId可以正确地转换为字符串并在JSON响应中使用。
    """
    
    @classmethod
    def __get_pydantic_core_schema__(cls, _source_type: Any, _handler: Any) -> CoreSchema:
        """获取Pydantic核心模式
        
        定义如何在Pydantic中验证和处理此类型。
        """
        from pydantic_core import core_schema
        return core_schema.with_info_plain_validator_function(cls.validate)

    @classmethod
    def validate(cls, v, _info=None):
        """验证输入值是否为有效的ObjectId
        
        Args:
            v: 待验证的值
            _info: 验证上下文信息（可选）
            
        Returns:
            有效的ObjectId实例
            
        Raises:
            ValueError: 如果输入值不是有效的ObjectId格式或类型
        """
        if isinstance(v, (str, bytes)):
            if not ObjectId.is_valid(v):
                raise ValueError("Invalid ObjectId")
            return ObjectId(v)
        elif isinstance(v, ObjectId):
            return v
        else:
            raise ValueError("Invalid type for ObjectId")

    @classmethod
    def __get_pydantic_json_schema__(cls, core_schema: CoreSchema, handler: GetJsonSchemaHandler) -> Dict[str, Any]:
        """获取JSON模式定义
        
        确保在生成的JSON Schema中，ObjectId被正确地描述为字符串类型。
        
        Args:
            core_schema: 核心模式
            handler: JSON模式处理器
            
        Returns:
            更新后的JSON模式字典
        """
        json_schema = super().__get_pydantic_json_schema__(core_schema, handler)
        json_schema = handler.resolve_ref_schema(json_schema)
        json_schema.update(type="string")
        return json_schema


class ApiKeyReference(BaseModel):
    """API密钥引用模型
    
    用于在用户模型中引用相关联的API密钥信息，避免完整密钥信息的冗余存储。
    """
    
    # API密钥的唯一标识符
    id: str = Field(..., description="API密钥的唯一标识符")
    
    # API密钥的名称，用于用户识别
    name: str = Field(..., description="API密钥的名称")
    
    # API密钥的状态（如active、revoked等）
    status: str = Field(..., description="API密钥的状态")
    
    # API密钥的创建时间
    created_at: datetime = Field(..., description="API密钥的创建时间")
    
    # API密钥最后使用的时间，可选
    last_used_at: Optional[datetime] = Field(None, description="API密钥最后使用的时间")
    
    # API密钥的使用次数统计
    usage_count: int = Field(default=0, description="API密钥的使用次数")
    
    # 模型配置
    model_config = {
        "from_attributes": True  # 允许从ORM对象创建模型实例
    }


class UserBase(BaseModel):
    """用户基础模型
    
    包含用户的基本信息字段，作为其他用户相关模型的基类。
    """
    
    # 用户的电子邮件地址，使用EmailStr确保格式有效
    email: EmailStr = Field(..., description="用户的电子邮件地址")
    
    # 用户的用户名，用于系统内识别
    username: str = Field(..., description="用户的用户名")


class UserCreate(BaseModel):
    """用户创建模型
    
    用于用户注册和创建新用户时的数据验证。
    """
    
    # 用户的电子邮件地址
    email: EmailStr = Field(..., description="用户的电子邮件地址")
    
    # 用户的用户名
    username: str = Field(..., description="用户的用户名")
    
    # 用户的密码，设置最小长度为6位
    password: str = Field(..., min_length=6, description="用户的密码，最少6个字符")


class UserInDB(UserBase):
    """数据库中的用户模型
    
    用于数据库交互的用户完整模型，包含了敏感信息如哈希密码。
    """
    
    # 数据库ID字段，使用PyObjectId类型并设置别名
    id: Optional[PyObjectId] = Field(default_factory=PyObjectId, alias="_id", description="用户在数据库中的唯一标识")
    
    # 哈希后的密码，出于安全考虑存储哈希值而非明文
    hashed_password: str = Field(..., description="哈希后的用户密码")
    
    # 创建时间，默认为当前UTC时间
    created_at: datetime = Field(default_factory=datetime.utcnow, description="用户账户创建时间")
    
    # 更新时间，默认为当前UTC时间
    updated_at: datetime = Field(default_factory=datetime.utcnow, description="用户账户最后更新时间")

    # 模型配置
    model_config = {
        "populate_by_name": True,  # 允许通过名称填充字段
        "json_encoders": {ObjectId: str},  # 将ObjectId类型转换为字符串进行JSON序列化
        "arbitrary_types_allowed": True  # 允许使用任意类型
    }


class UserResponse(UserBase):
    """用户响应模型
    
    用于API响应的用户模型，不包含敏感信息。
    """
    
    # 响应中的用户ID，字符串格式
    id: str = Field(alias="_id", description="用户的唯一标识（字符串格式）")
   
    # 模型配置
    model_config = {
        "populate_by_name": True,  # 允许通过名称填充字段
        "json_encoders": {ObjectId: str},  # 将ObjectId类型转换为字符串
        "arbitrary_types_allowed": True,  # 允许使用任意类型
        "ignore_extra": True  # 忽略额外的字段，避免序列化错误
    }


class UserInfoResponse(UserBase):
    """用户信息响应模型
    
    用于返回用户基本信息的响应模型。
    """
    
    # 用户ID，字符串格式
    id: str = Field(alias="_id", description="用户的唯一标识（字符串格式）")

    # 模型配置
    model_config = {
        "populate_by_name": True,  # 允许通过名称填充字段
        "json_encoders": {ObjectId: str},  # 将ObjectId类型转换为字符串
        "arbitrary_types_allowed": True  # 允许使用任意类型
    }


class UserMeResponse(BaseModel):
    """当前用户响应模型
    
    用于返回当前登录用户的基本信息。
    """
    
    # 当前用户的用户名
    username: str = Field(..., description="当前登录用户的用户名")