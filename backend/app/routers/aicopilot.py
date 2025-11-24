from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from typing import Dict, Any, List
from pydantic import BaseModel
from app.utils.userauth import require_bearer
from datetime import timedelta, datetime
from bson import ObjectId
import os
import json
import logging
from app.services.aicopilot import aicopilot_service
from app.models.user import UserMeResponse
from autogen_core.models import UserMessage, AssistantMessage, SystemMessage
from autogen_ext.models.openai import OpenAIChatCompletionClient
from autogen_core.models import CreateResult
from autogen_core.models import ModelFamily

import dotenv
dotenv.load_dotenv()

# 定义请求体模型
class MessageRequest(BaseModel):
    message: str


router = APIRouter()


@router.get("/chathistory/{review_id}")
async def get_chat_history(
    review_id: str,
    current_user: UserMeResponse = Depends(require_bearer)
):
    """
    获取指定审查ID的聊天记录
    """
    chat_history = await aicopilot_service.get_chat_history(review_id)
    if not chat_history:
        raise HTTPException(status_code=404, detail="聊天记录不存在")
    return {"chat_history": chat_history}

@router.post("/send/{review_id}")
async def send_stream_message(
    review_id: str,
    message_data: MessageRequest,
    current_user: UserMeResponse = Depends(require_bearer)
):
    """
    发送流式消息到指定审查ID的AI助手
    """ 
    try:
        # 获取消息内容
        message = message_data.message
        if not message:
            raise HTTPException(status_code=400, detail="消息内容不能为空")
        
        # 保存用户消息到聊天记录
        await aicopilot_service.add_chat_message(review_id, message, role='user')
        
        # 获取完整的聊天历史并转换为autogen格式
        chat_history = await aicopilot_service.get_chat_history(review_id)
        
        # 确保chat_history是列表格式
        if not chat_history:
            chat_history = []
        
        # 使用aicopilot_service的生成器方法
        async def generate_stream():
            """生成流式响应"""
            try:
                async for chunk in aicopilot_service.sendstream_generator(review_id, chat_history):
                    yield chunk
            except Exception as e:
                error_msg = f"流式响应生成错误: {str(e)}"
                logging.error(error_msg)
                yield f"data: {json.dumps({'type': 'error', 'content': error_msg})}\n\n"
        
        return StreamingResponse(
            generate_stream(),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Headers": "Cache-Control",
            }
        )
        
    except Exception as e:
        logging.exception("发送流式消息到AI助手失败: %s", e)
        raise HTTPException(status_code=500, detail="内部服务器错误")
    
