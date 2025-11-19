from fastapi import APIRouter, HTTPException, Depends
from typing import Dict, Optional
from app.services.reputation import reputation_service
from app.models.user import UserResponse
from app.utils.userauth import require_bearer

router = APIRouter(prefix="/reputation")

