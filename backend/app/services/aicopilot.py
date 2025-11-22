from typing import Optional, Dict, Any, List
from datetime import datetime, timedelta
from passlib.context import CryptContext
import secrets
import logging
import os
import json
from bson import ObjectId

from app.utils.database import codereviews_collection

from autogen_core.models import CreateResult, UserMessage, AssistantMessage, SystemMessage, ModelFamily
from autogen_ext.models.openai import OpenAIChatCompletionClient 
   

class AICopilotService:
    @staticmethod
    async def get_chat_history(review_id: str) -> Optional[List]:
        """
        获取智能助手的聊天记录
        
        Args:
            review_id: 代码审查ID
            
        Returns:
            Optional[List]: 聊天记录列表
        """
        chat_history = await codereviews_collection.find_one({"_id": ObjectId(review_id)})
        if not chat_history:
            return None
        
        return chat_history.get("chat_history", [])

    @staticmethod
    async def update_chat_history(review_id: str, chat_history: List[Dict[str, Any]]) -> bool:
        """
        更新智能助手的聊天记录
        
        Args:
            review_id: 代码审查ID
            chat_history: 新的聊天记录列表
            
        Returns:
            bool: 更新是否成功
        """
        try:
            result = await codereviews_collection.update_one(
                {"_id": ObjectId(review_id)},
                {"$set": {"chat_history": chat_history}}
            )
            return result.modified_count > 0
        except Exception as e:
            logging.error(f"Failed to update chat history: {e}")
            return False

    @staticmethod
    async def add_chat_message(review_id: str, message_content: str, role: str) -> bool:
        """
        添加单条聊天消息到历史记录
        
        Args:
            review_id: 代码审查ID
            message_content: 消息内容字符串
            role: 消息角色 ('user', 'assistant', 'system')
            
        Returns:
            bool: 添加是否成功
        """
        # 创建可序列化的消息字典，避免MongoDB序列化问题
        message_dict = {
            "content": message_content,
            "role": role,
            "source": role,
            "timestamp": datetime.utcnow().isoformat()
        }

        try:
            result = await codereviews_collection.update_one(
                {"_id": ObjectId(review_id)},
                {
                    "$push": {"chat_history": message_dict},
                    "$set": {"updated_at": datetime.utcnow()}
                }
            )
            return result.modified_count > 0
        except Exception as e:
            logging.error(f"Failed to add chat message: {e}")
            return False

    @staticmethod
    async def sendstream(review_id: str, messages: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        发送消息到指定审查ID的AI助手
        
        Args:
            review_id: 代码审查ID
            messages: 聊天消息列表
            
        Returns:
            Dict[str, Any]: 完整的AI响应消息
        """
        try:
            # 获取OpenAI配置，使用默认值
            model = os.getenv("AI_MODEL", "gpt-3.5-turbo")
            api_key = os.getenv("AI_API_KEY")
            api_base = os.getenv("AI_API_URL", "https://api.openai.com/v1")
            
            if not api_key:
                raise Exception("OpenAI API key not configured. Please set AI_API_KEY environment variable.")
            
            model_client = OpenAIChatCompletionClient(
                model=model,
                api_key=api_key,
                api_base=api_base,
                model_info={
                    "vision": False,
                    "function_calling": True,
                    "json_output": False,
                    "family": "openai",  # 修复family字段类型
                    "structured_output": False,
                },
                max_retries=2,
            )
            
            # 转换消息格式为 autogen 消息对象（仅用于API调用）
            autogen_messages = []
            for msg in messages:
                role = msg.get("role", "user")
                content = msg.get("content", "")
                
                if role == "user":
                    autogen_messages.append(UserMessage(content=content, source="user"))
                elif role == "assistant":
                    autogen_messages.append(AssistantMessage(content=content, source="assistant"))
                elif role == "system":
                    autogen_messages.append(SystemMessage(content=content, source="system"))
            
            # 创建流
            stream = model_client.create_stream(messages=autogen_messages)
            
            # 收集完整的响应
            full_response = ""
            async for chunk in stream:
                if isinstance(chunk, str):
                    full_response += chunk
                else:
                    # 最终的 CreateResult 对象
                    assert isinstance(chunk, CreateResult) and isinstance(chunk.content, str)
                    full_response += chunk.content
            
            # 保存AI响应到聊天记录
            await aicopilot_service.add_chat_message(review_id, full_response, role='assistant')
            
            return {
                "status": "success",
                "response": full_response,
                "timestamp": datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            logging.error(f"Failed to send stream message: {e}")
            return {
                "status": "error",
                "error": str(e),
                "timestamp": datetime.utcnow().isoformat()
            }

    @staticmethod
    async def sendstream_generator(review_id: str, messages: List[Dict[str, Any]]):
        """
        发送流式消息到指定审查ID的AI助手（生成器版本）
        
        Args:
            review_id: 代码审查ID
            messages: 聊天消息列表
            
        Yields:
            流式响应数据
        """
        try:
            # 获取OpenAI配置，使用默认值
            model = os.getenv("AI_MODEL", "gpt-3.5-turbo")
            api_key = os.getenv("AI_API_KEY")
            base_url = os.getenv("AI_API_URL", "https://api.openai.com/v1")
            
            if not api_key:
                yield f"data: {json.dumps({'type': 'error', 'content': 'OpenAI API key not configured'})}\n\n"
                return
            
            model_client = OpenAIChatCompletionClient(
                model=model,
                api_key=api_key,
                base_url=base_url,
                model_info={
                    "vision": False,
                    "function_calling": True,
                    "json_output": False,
                    "family": "openai",
                    "structured_output": False,
                },
                max_retries=2,
            )
            
            # 转换消息格式为 autogen 消息对象（仅用于API调用）
            autogen_messages = []
            for msg in messages:
                role = msg.get("role", "user")
                content = msg.get("content", "")
                
                if role == "user":
                    autogen_messages.append(UserMessage(content=content, source="user"))
                elif role == "assistant":
                    autogen_messages.append(AssistantMessage(content=content, source="assistant"))
                elif role == "system":
                    autogen_messages.append(SystemMessage(content=content, source="system"))
            
            # 创建流
            stream = model_client.create_stream(messages=autogen_messages)
            
            # 收集完整的响应
            full_response = ""
            async for chunk in stream:
                if isinstance(chunk, str):
                    full_response += chunk
                    # 发送增量数据
                    yield f"data: {json.dumps({'type': 'content', 'content': chunk})}\n\n"
                else:
                    # 最终的 CreateResult 对象
                    assert isinstance(chunk, CreateResult) and isinstance(chunk.content, str)
                    full_response += chunk.content
                    yield f"data: {json.dumps({'type': 'content', 'content': chunk.content})}\n\n"
            
            # 保存AI响应到聊天记录
            await aicopilot_service.add_chat_message(review_id, full_response, role='assistant')
            
            # 发送结束信号
            yield f"data: {json.dumps({'type': 'done', 'content': full_response})}\n\n"
            
        except Exception as e:
            error_msg = f"流式响应生成错误: {str(e)}"
            logging.error(error_msg)
            yield f"data: {json.dumps({'type': 'error', 'content': error_msg})}\n\n"



aicopilot_service = AICopilotService()