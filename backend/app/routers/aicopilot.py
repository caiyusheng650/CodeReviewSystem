"""
AI助手聊天路由模块

该模块提供与AI助手进行实时聊天交互的API端点，支持获取聊天历史和发送流式消息。
使用FastAPI框架构建，集成了Autogen AI模型和自定义的AI助手服务。
"""

# FastAPI核心模块导入
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse

# 数据类型和模型导入
from typing import Dict, Any, List
from pydantic import BaseModel
from app.models.user import UserMeResponse

# 认证和工具导入
from app.utils.userauth import require_bearer
from datetime import timedelta, datetime
from bson import ObjectId
import os
import json
import logging

# AI助手服务导入
from app.services.aicopilot import aicopilot_service
from autogen_core.models import UserMessage, AssistantMessage, SystemMessage
from autogen_ext.models.openai import OpenAIChatCompletionClient
from autogen_core.models import CreateResult, ModelFamily

# 环境变量加载
import dotenv
dotenv.load_dotenv()  # 加载.env文件中的环境变量

# 定义请求体模型
class MessageRequest(BaseModel):
    """
    消息请求模型
    
    用于接收客户端发送的文本消息内容。
    """
    message: str
    """用户发送的文本消息内容"""


# 创建API路由器
router = APIRouter()
"""AI助手聊天相关的API路由集合"""


@router.get("/chathistory/{review_id}")
async def get_chat_history(
    review_id: str,
    current_user: UserMeResponse = Depends(require_bearer)
):
    """
    获取指定审查ID的聊天记录
    
    Args:
        review_id: 代码审查的唯一标识符
        current_user: 当前认证用户信息，通过JWT令牌验证获取
    
    Returns:
        dict: 包含聊天历史记录的字典
    
    Raises:
        HTTPException: 当聊天记录不存在时返回404错误
    """
    # 调用AI助手服务获取指定审查ID的聊天历史
    chat_history = await aicopilot_service.get_chat_history(review_id)
    
    # 如果聊天历史不存在，返回404错误
    if not chat_history:
        raise HTTPException(status_code=404, detail="聊天记录不存在")
    
    # 返回格式化的聊天历史数据
    return {"chat_history": chat_history}

@router.post("/send/{review_id}")
async def send_stream_message(
    review_id: str,
    message_data: MessageRequest,
    current_user: UserMeResponse = Depends(require_bearer)
):
    """
    发送流式消息到指定审查ID的AI助手
    
    该端点接收用户消息，将其保存到聊天历史中，并返回AI助手的流式响应。
    使用Server-Sent Events (SSE) 技术实现实时聊天体验。
    
    Args:
        review_id: 代码审查的唯一标识符
        message_data: 包含用户消息内容的请求数据
        current_user: 当前认证用户信息，通过JWT令牌验证获取
    
    Returns:
        StreamingResponse: 包含AI助手流式响应的SSE流
    
    Raises:
        HTTPException:
            - 当消息内容为空时返回400错误
            - 当内部处理出错时返回500错误
    """
    try:
        # 获取消息内容并进行基本验证
        message = message_data.message
        if not message:
            raise HTTPException(status_code=400, detail="消息内容不能为空")
        
        # 保存用户消息到聊天记录中
        await aicopilot_service.add_chat_message(review_id, message, role='user')
        
        # 获取完整的聊天历史（包含新发送的消息）
        chat_history = await aicopilot_service.get_chat_history(review_id)
        
        # 确保chat_history是列表格式，防止后续处理出错
        if not chat_history:
            chat_history = []
        
        # 定义流式生成器函数，用于创建SSE响应
        async def generate_stream():
            """
            生成流式响应的异步生成器
            
            从AI助手服务获取实时响应块，并格式化为SSE格式输出。
            捕获并处理可能出现的异常，确保客户端能收到错误信息。
            """
            try:
                # 异步迭代获取AI助手的流式响应
                async for chunk in aicopilot_service.sendstream_generator(review_id, chat_history):
                    yield chunk
            except Exception as e:
                # 记录错误并向客户端发送错误信息
                error_msg = f"流式响应生成错误: {str(e)}"
                logging.error(error_msg)
                yield f"data: {json.dumps({'type': 'error', 'content': error_msg})}\n\n"
        
        # 创建并返回StreamingResponse对象
        return StreamingResponse(
            generate_stream(),
            media_type="text/event-stream",  # SSE标准媒体类型
            headers={
                "Cache-Control": "no-cache",  # 禁用缓存以确保实时性
                "Connection": "keep-alive",  # 保持连接开启
                "Access-Control-Allow-Origin": "*",  # 允许跨域访问
                "Access-Control-Allow-Headers": "Cache-Control",
            }
        )
        
    except Exception as e:
        # 记录详细异常信息以便调试
        logging.exception("发送流式消息到AI助手失败: %s", e)
        # 向客户端返回500错误
        raise HTTPException(status_code=500, detail="内部服务器错误")
    
