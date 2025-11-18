from pydantic import BaseModel
from typing import List, Optional

class ReputationBase(BaseModel):
    score: int = 60  # 默认信誉分为60
    history: List[str] = []

class ReputationUpdatePayload(BaseModel):
    author: str
    event: str  # passed / minor_issue / severe_bug / rejected