from typing import List, Optional
from bson import ObjectId
from app.models.jira import JiraConnection, JiraConnectionCreate, JiraConnectionUpdate, JiraConnectionTest
from app.models.jira import JiraConnection, JiraConnectionWithToken
from app.utils.encryption import decrypt_access_token, decrypt_refresh_token
from app.utils.database import get_collection
import datetime
import requests
from requests.auth import HTTPBasicAuth

def get_jira_collection():
    return get_collection("jira_connections")

async def get_connections(user_id: ObjectId) -> List[JiraConnection]:
    """获取用户的所有Jira连接"""
    
    
    collection = get_jira_collection()
    connections = []
    async for doc in collection.find({"user_id": user_id}):
        # 解密敏感令牌数据
        if doc.get("access_token"):
            doc["access_token"] = decrypt_access_token(doc["access_token"])
        if doc.get("refresh_token"):
            doc["refresh_token"] = decrypt_refresh_token(doc["refresh_token"])
        connections.append(JiraConnection(**doc))
    return connections

async def get_connection_by_id(id: ObjectId, user_id: ObjectId, include_tokens: bool = False) -> Optional[JiraConnection]:
    """根据ID获取特定的Jira连接"""
    
    
    collection = get_jira_collection()
    doc = await collection.find_one({"_id": id, "user_id": user_id})
    if doc:
        if include_tokens:
            # 解密敏感令牌数据并返回包含令牌的模型
            if doc.get("access_token"):
                doc["access_token"] = decrypt_access_token(doc["access_token"])
            if doc.get("refresh_token"):
                doc["refresh_token"] = decrypt_refresh_token(doc["refresh_token"])
            return JiraConnectionWithToken(**doc)
        else:
            # 不包含令牌数据，返回标准模型
            return JiraConnection(**doc)
    return None

async def create_connection(connection_data: JiraConnectionCreate, user_id: ObjectId) -> JiraConnection:
    """创建新的Jira连接"""
    from app.utils.encryption import encrypt_access_token, encrypt_refresh_token
    
    collection = get_jira_collection()
    connection_dict = connection_data.dict()
    
    # 加密敏感令牌数据
    if connection_dict.get("access_token"):
        connection_dict["access_token"] = encrypt_access_token(connection_dict["access_token"])
    if connection_dict.get("refresh_token"):
        connection_dict["refresh_token"] = encrypt_refresh_token(connection_dict["refresh_token"])
    
    connection_dict["user_id"] = user_id
    connection_dict["created_at"] = datetime.datetime.utcnow()
    connection_dict["updated_at"] = datetime.datetime.utcnow()
    result = await collection.insert_one(connection_dict)
    connection_dict["_id"] = result.inserted_id
    return JiraConnection(**connection_dict)

async def update_connection(id: ObjectId, connection_data: JiraConnectionUpdate, user_id: ObjectId) -> Optional[JiraConnection]:
    """更新Jira连接"""
    from app.utils.encryption import encrypt_access_token, encrypt_refresh_token
    
    collection = get_jira_collection()
    update_data = connection_data.dict(exclude_unset=True)
    
    # 加密敏感令牌数据（如果提供了）
    if update_data.get("access_token"):
        update_data["access_token"] = encrypt_access_token(update_data["access_token"])
    if update_data.get("refresh_token"):
        update_data["refresh_token"] = encrypt_refresh_token(update_data["refresh_token"])
    
    update_data["updated_at"] = datetime.datetime.utcnow()
    result = await collection.update_one(
        {"_id": id, "user_id": user_id},
        {"$set": update_data}
    )
    if result.modified_count > 0:
        updated_doc = await collection.find_one({"_id": id})
        return JiraConnection(**updated_doc)
    return None

async def delete_connection(id: ObjectId, user_id: ObjectId) -> bool:
    """删除Jira连接"""
    collection = get_jira_collection()
    result = await collection.delete_one({"_id": id, "user_id": user_id})
    return result.deleted_count > 0

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

async def create_issue(connection_id: ObjectId, user_id: ObjectId, issue_data: dict) -> dict:
    """在Jira中创建Issue"""
    try:
        # 获取Jira连接配置
        connection = await get_connection_by_id(connection_id, user_id)
        if not connection:
            return {"success": False, "message": "Jira连接不存在"}
        
        # 只支持OAuth2认证
        headers = {"Content-Type": "application/json"}
        
        if not connection.access_token:
            return {"success": False, "message": "访问令牌不能为空"}
        headers["Authorization"] = f"Bearer {connection.access_token}"
        
        # 构建API端点URL
        if connection.is_cloud:
            api_url = f"{connection.jira_url}/rest/api/3/issue"
        else:
            api_url = f"{connection.jira_url}/rest/api/2/issue"
        
        # 获取项目密钥，优先使用issue_data中的，否则使用连接中的
        project_key = issue_data.get("project_key") or connection.project_key
        if not project_key:
            return {"success": False, "message": "项目密钥不能为空，请在请求中指定project_key"}
        
        # 构建Jira Issue数据结构
        jira_issue = {
            "fields": {
                "project": {
                    "key": project_key
                },
                "summary": issue_data.get("summary", "未命名问题"),
                "description": issue_data.get("description", ""),
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
