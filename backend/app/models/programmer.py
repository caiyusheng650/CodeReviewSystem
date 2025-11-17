from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime
from bson import ObjectId
from app.models.user import PyObjectId

class ProgrammerBase(BaseModel):
    username: str
    
class ProgrammerInDB(ProgrammerBase):
    id: Optional[PyObjectId] = Field(default_factory=PyObjectId, alias="_id")
    reputation_score: int = 60  # 默认信誉分为60
    reputation_history: List[str] = []
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    model_config = {
        "populate_by_name": True,
        "json_encoders": {ObjectId: str},
        "arbitrary_types_allowed": True
    }

class ProgrammerResponse(ProgrammerBase):
    id: str = Field(alias="_id")
    reputation_score: int = 60
    reputation_history: List[str] = []
    created_at: datetime
    updated_at: datetime

    model_config = {
        "populate_by_name": True,
        "json_encoders": {ObjectId: str},
        "arbitrary_types_allowed": True
    }