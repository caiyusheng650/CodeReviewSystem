from pydantic import BaseModel, EmailStr, Field, GetJsonSchemaHandler, ConfigDict
from typing import Optional, Dict, Any, List
from datetime import datetime
from bson import ObjectId
from pydantic_core import CoreSchema
from typing import Any, Dict

class PyObjectId(ObjectId):
    @classmethod
    def __get_pydantic_core_schema__(
        cls, _source_type: Any, _handler: Any
    ) -> CoreSchema:
        from pydantic_core import core_schema
        return core_schema.with_info_plain_validator_function(cls.validate)

    @classmethod
    def validate(cls, v, _info=None):
        if isinstance(v, (str, bytes)):
            if not ObjectId.is_valid(v):
                raise ValueError("Invalid ObjectId")
            return ObjectId(v)
        elif isinstance(v, ObjectId):
            return v
        else:
            raise ValueError("Invalid type for ObjectId")

    @classmethod
    def __get_pydantic_json_schema__(
        cls, core_schema: CoreSchema, handler: GetJsonSchemaHandler
    ) -> Dict[str, Any]:
        json_schema = super().__get_pydantic_json_schema__(core_schema, handler)
        json_schema = handler.resolve_ref_schema(json_schema)
        json_schema.update(type="string")
        return json_schema

# API密钥模型
class ApiKey(BaseModel):
    key: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    is_active: bool = True
    disabled_at: Optional[datetime] = None

class UserBase(BaseModel):
    email: EmailStr
    username: str

class UserCreate(BaseModel):
    email: EmailStr
    username: str
    password: str = Field(..., min_length=6)

class UserInDB(UserBase):
    id: Optional[PyObjectId] = Field(default_factory=PyObjectId, alias="_id")
    hashed_password: str
    apikeys: Optional[List[ApiKey]] = None
    reputation_score: int = 60  # 默认信誉分为60
    reputation_history: List[str] = []

    model_config = {
        "populate_by_name": True,
        "json_encoders": {ObjectId: str},
        "arbitrary_types_allowed": True
    }

class UserResponse(UserBase):
    id: str = Field(alias="_id")
    apikeys: Optional[List[ApiKey]] = None
    reputation_score: int = 60  # 默认信誉分为60
    reputation_history: List[str] = []

    model_config = {
        "populate_by_name": True,
        "json_encoders": {ObjectId: str},
        "arbitrary_types_allowed": True
    }

class UserInfoResponse(UserBase):
    id: str = Field(alias="_id")

    model_config = {
        "populate_by_name": True,
        "json_encoders": {ObjectId: str},
        "arbitrary_types_allowed": True
    }