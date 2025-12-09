from typing import List, Optional
from bson import ObjectId
from app.models.jira import JiraConnection, JiraConnectionCreate, JiraConnectionUpdate, JiraConnectionTest
from app.models.jira import JiraConnection, JiraConnectionWithToken
from app.utils.encryption import decrypt_access_token, decrypt_refresh_token
from app.utils.encryption import encrypt_access_token, encrypt_refresh_token
from app.utils.database import get_collection
import datetime
import requests
import json
from requests.auth import HTTPBasicAuth


# 获取Jira连接集合
def get_jira_collection():
    return get_collection("jira_connections")


async def get_user_connections(username: str) -> List[JiraConnection]:
    """获取用户的所有Jira连接"""
    collection = get_jira_collection()
    connections = await collection.find({"username": username}).to_list(length=None)
    return [JiraConnection(**connection) for connection in connections]


async def get_connection_by_id(id: ObjectId) -> Optional[JiraConnection]:
    """根据ID获取Jira连接"""
    collection = get_jira_collection()
    connection = await collection.find_one({"_id": id})
    if connection:
        return JiraConnection(**connection)
    return None


async def get_connection_by_id_with_tokens(id: ObjectId) -> Optional[JiraConnectionWithToken]:
    """根据ID获取Jira连接（包含解密后的令牌）"""    
    collection = get_jira_collection()
    connection = await collection.find_one({"_id": ObjectId(id)})
    if connection:
        # 解密令牌数据
        if connection.get("access_token"):
            connection["access_token"] = decrypt_access_token(connection["access_token"])
        if connection.get("refresh_token"):
            connection["refresh_token"] = decrypt_refresh_token(connection["refresh_token"])
        return JiraConnectionWithToken(**connection)
    return None


async def create_connection(connection_data: JiraConnectionCreate, username: str) -> JiraConnection:
    """创建新的Jira连接"""
    
    collection = get_jira_collection()
    connection_dict = connection_data.dict()
    
    # 加密敏感令牌数据
    if connection_dict.get("access_token"):
        connection_dict["access_token"] = encrypt_access_token(connection_dict["access_token"])
    if connection_dict.get("refresh_token"):
        connection_dict["refresh_token"] = encrypt_refresh_token(connection_dict["refresh_token"])
    
    connection_dict["username"] = username
    connection_dict["created_at"] = datetime.datetime.utcnow()
    connection_dict["updated_at"] = datetime.datetime.utcnow()
    result = await collection.insert_one(connection_dict)
    connection_dict["_id"] = result.inserted_id
    return JiraConnection(**connection_dict)


async def update_connection(id: ObjectId, connection_data: JiraConnectionUpdate, username: str) -> Optional[JiraConnection]:
    """更新Jira连接"""
    
    collection = get_jira_collection()
    update_dict = connection_data.dict(exclude_unset=True)
    
    # 加密敏感令牌数据
    if update_dict.get("access_token"):
        update_dict["access_token"] = encrypt_access_token(update_dict["access_token"])
    if update_dict.get("refresh_token"):
        update_dict["refresh_token"] = encrypt_refresh_token(update_dict["refresh_token"])
    
    update_dict["updated_at"] = datetime.datetime.utcnow()
    
    result = await collection.update_one(
        {"_id": id, "username": username},
        {"$set": update_dict}
    )
    
    if result.modified_count > 0:
        connection = await collection.find_one({"_id": id, "username": username})
        if connection:
            return JiraConnection(**connection)
    return None


async def delete_connection(id: ObjectId, username: str) -> bool:
    """删除Jira连接"""
    collection = get_jira_collection()
    result = await collection.delete_one({"_id": id, "username": username})
    return result.deleted_count > 0


async def check_and_refresh_token(connection: JiraConnection) -> Optional[JiraConnection]:
    """检查令牌是否过期，如果过期则尝试刷新"""
    if not connection.token_expires_at:
        return connection
    
    # 检查令牌是否即将过期（5分钟内）
    now = datetime.datetime.utcnow()
    expires_at = connection.token_expires_at
    time_until_expiry = expires_at - now
    
    # 如果令牌在5分钟内过期，尝试刷新
    if time_until_expiry.total_seconds() < 300:
        try:
            # 这里应该实现刷新令牌的逻辑
            # 由于循环导入问题，我们暂时标记为需要手动刷新
            connection.is_active = False
            return connection
        except Exception as e:
            return connection
    
    return connection


async def test_connection(connection_data: JiraConnectionTest) -> dict:
    """测试Jira连接"""
    try:
        # 只支持OAuth2认证
        headers = {"Content-Type": "application/json"}
        
        if not connection_data.access_token:
            return {"success": False, "message": "访问令牌不能为空"}
        headers["Authorization"] = f"Bearer {connection_data.access_token}"
        
        # 构建API端点URL
        if connection_data.is_cloud:
            api_url = f"{connection_data.jira_url}/rest/api/3/serverInfo"
        else:
            api_url = f"{connection_data.jira_url}/rest/api/2/serverInfo"
        
        # 发送请求测试连接
        response = requests.get(api_url, headers=headers, timeout=10)
        
        if response.status_code == 200:
            return {"success": True, "message": "Jira连接成功!", "server_info": response.json()}
        else:
            return {"success": False, "message": f"连接失败: {response.status_code} {response.text}"}
    except Exception as e:
        return {"success": False, "message": f"连接测试失败: {str(e)}"}

async def get_auth_types() -> List[str]:
    """获取支持的认证类型"""
    return ["oauth2"]

async def get_fields() -> List[dict]:
    """获取Jira字段配置（示例）"""
    # 实际实现中，这应该从Jira API获取
    return [
        {"id": "summary", "name": "Summary", "required": True},
        {"id": "description", "name": "Description", "required": False},
        {"id": "issuetype", "name": "Issue Type", "required": True},
        {"id": "priority", "name": "Priority", "required": True},
        {"id": "assignee", "name": "Assignee", "required": False}
    ]

async def create_issue(connection_id, issue_data: dict) -> dict:
    """在Jira中创建Issue"""
    try:
        # 获取Jira连接配置（包含解密后的令牌）
        connection = await get_connection_by_id_with_tokens(connection_id[0])
        
        if not connection:
            return {"success": False, "message": "Jira连接不存在"}
        
        # 只支持OAuth2认证
        headers = {"Accept": "application/json", "Content-Type": "application/json"}
        
        if not connection.access_token:
            return {"success": False, "message": "访问令牌不能为空"}
        headers["Authorization"] = f"Bearer {connection.access_token}"

        
        api_url = f"https://api.atlassian.com/ex/jira/{connection_id[2]}/rest/api/2/issue"

        
        # 构建Jira Issue数据结构
        jira_issue = {
            "fields": {
                "project": {
                    "key": issue_data.get("projectkey")
                },
                "summary": issue_data.get("summary",""),
                "description": issue_data.get("description",""),
                "issuetype": {
                    "name": issue_data.get("issuetype", "Bug")
                },
                "priority": {
                    "name": issue_data.get("priority", "Medium")
                }
            }
        }
        
        # 可选字段
        if issue_data.get("assignee"):
            jira_issue["fields"]["assignee"] = {"name": issue_data["assignee"]}
        
        # 发送请求创建Issue
        response = requests.post(api_url, headers=headers, json=jira_issue, timeout=10)
        
        if response.status_code == 201 or response.status_code == 200:
            return {"success": True, "issue": response.json()}
        else:
            return {"success": False, "message": f"创建Jira Issue失败: {response.status_code} {response.text}"}
    except Exception as e:
        return {"success": False, "message": f"创建Jira Issue时出错: {str(e)}"}