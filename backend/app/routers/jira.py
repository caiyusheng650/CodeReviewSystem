from fastapi import APIRouter, Depends, HTTPException, Query, Body, Request
from typing import List, Optional
from bson import ObjectId
from app.models.jira import JiraConnection, JiraConnectionCreate, JiraConnectionUpdate, JiraConnectionTest
from app.services.jira import (
    get_connections,
    get_connection_by_id,
    create_connection,
    update_connection,
    delete_connection,
    test_connection,
    get_auth_types,
    get_fields
)
from app.utils.userauth import require_bearer
from app.utils.database import users_collection
import httpx
from fastapi.responses import RedirectResponse
import os

router = APIRouter()

@router.get("/connections", response_model=List[JiraConnection])
async def list_jira_connections(username: str = Depends(require_bearer)):
    """获取用户的所有Jira连接"""
    user = await users_collection.find_one({"username": username})
    if not user:
        raise HTTPException(status_code=404, detail="用户不存在")
    return await get_connections(user["_id"])

@router.post("/connections", response_model=JiraConnection)
async def create_jira_connection(
    connection_data: JiraConnectionCreate = Body(...),
    username: str = Depends(require_bearer)
):
    """创建新的Jira连接"""
    user = await users_collection.find_one({"username": username})
    if not user:
        raise HTTPException(status_code=404, detail="用户不存在")
    return await create_connection(connection_data, user["_id"])

@router.get("/connections/{id}", response_model=JiraConnection)
async def get_jira_connection(
    id: str,
    username: str = Depends(require_bearer)
):
    """根据ID获取特定的Jira连接"""
    user = await users_collection.find_one({"username": username})
    if not user:
        raise HTTPException(status_code=404, detail="用户不存在")
    connection = await get_connection_by_id(ObjectId(id), user["_id"])
    if not connection:
        raise HTTPException(status_code=404, detail="Jira连接不存在")
    return connection

@router.put("/connections/{id}", response_model=JiraConnection)
async def update_jira_connection(
    id: str,
    connection_data: JiraConnectionUpdate = Body(...),
    username: str = Depends(require_bearer)
):
    """更新Jira连接"""
    user = await users_collection.find_one({"username": username})
    if not user:
        raise HTTPException(status_code=404, detail="用户不存在")
    connection = await update_connection(ObjectId(id), connection_data, user["_id"])
    if not connection:
        raise HTTPException(status_code=404, detail="Jira连接不存在")
    return connection

@router.delete("/connections/{id}")
async def delete_jira_connection(
    id: str,
    username: str = Depends(require_bearer)
):
    """删除Jira连接"""
    user = await users_collection.find_one({"username": username})
    if not user:
        raise HTTPException(status_code=404, detail="用户不存在")
    result = await delete_connection(ObjectId(id), user["_id"])
    if not result:
        raise HTTPException(status_code=404, detail="Jira连接不存在")
    return {"message": "Jira连接已成功删除"}

@router.post("/connections/test")
async def test_jira_connection(
    request: dict = Body(...),
    username: str = Depends(require_bearer)
):
    """测试Jira连接"""
    # 获取当前用户
    user = await users_collection.find_one({"username": username})
    if not user:
        raise HTTPException(status_code=404, detail="用户不存在")
    
    # 检查请求参数，支持两种格式：
    # 1. 直接发送connection_id字符串
    # 2. 发送整个连接对象
    connection_id = None
    if isinstance(request, dict) and "_id" in request:
        connection_id = request["_id"]
    elif isinstance(request, str):
        connection_id = request
    elif isinstance(request, dict) and "connection_id" in request:
        connection_id = request["connection_id"]
    else:
        raise HTTPException(status_code=422, detail="无效的请求格式，期望connection_id或连接对象")
    
    # 获取Jira连接配置（包含解密后的令牌）
    connection = await get_connection_by_id(ObjectId(connection_id), user["_id"], include_tokens=True)
    if not connection:
        raise HTTPException(status_code=404, detail="Jira连接不存在")
    
    # 检查access_token是否有效
    if not connection.access_token:
        raise HTTPException(status_code=400, detail="连接配置中access_token为空，请重新授权")
    
    # 使用连接中的access token进行测试
    connection_data = JiraConnectionTest(
        jira_url=connection.jira_url,
        auth_type=connection.auth_type,
        access_token=connection.access_token,
        is_cloud=connection.is_cloud
    )
    
    return await test_connection(connection_data)

@router.get("/config/auth-types", response_model=List[str])
async def get_jira_auth_types():
    """获取支持的认证方式"""
    return await get_auth_types()

@router.get("/config/fields", response_model=List[dict])
async def get_jira_fields():
    """获取Jira字段配置"""
    return await get_fields()

@router.get("/oauth/auth-url")
async def get_jira_oauth_url(
    jira_url: str = Query(...),
    client_id: str = Query(...),
    redirect_uri: str = Query(...)
):
    """获取OAuth授权URL"""
    try:
        # 构建Jira OAuth授权URL
        # 注意：这只是一个示例实现，实际的Jira OAuth流程可能有所不同
        if ".atlassian.net" in jira_url:
            # Jira Cloud
            auth_url = f"https://auth.atlassian.com/authorize"
            params = {
                "audience": "api.atlassian.com",
                "client_id": client_id,
                "scope": "read:jira-work write:jira-work",
                "redirect_uri": redirect_uri,
                "state": "your-state-here",
                "response_type": "code",
                "prompt": "consent"
            }
        else:
            # Jira Server/Data Center
            auth_url = f"{jira_url}/plugins/servlet/oauth/authorize"
            params = {
                "oauth_token": "your-request-token",
                "oauth_callback": redirect_uri
            }
        
        # 构建完整的授权URL
        import urllib.parse
        full_url = f"{auth_url}?{urllib.parse.urlencode(params)}"
        
        return {"auth_url": full_url}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取OAuth授权URL失败: {str(e)}")

@router.post("/oauth/refresh-token")
async def refresh_jira_oauth_token(
    refresh_token: str = Body(..., embed=True),
    client_id: str = Body(..., embed=True),
    client_secret: str = Body(..., embed=True)
):
    """刷新OAuth令牌"""
    try:
        # 向Atlassian认证服务器发送刷新令牌请求
        # 注意：这只是一个示例实现，实际的刷新令牌流程可能有所不同
        token_url = "https://auth.atlassian.com/oauth/token"
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                token_url,
                data={
                    "grant_type": "refresh_token",
                    "client_id": client_id,
                    "client_secret": client_secret,
                    "refresh_token": refresh_token
                },
                headers={"Content-Type": "application/x-www-form-urlencoded"}
            )
            
        if response.status_code == 200:
            return response.json()
        else:
            raise HTTPException(status_code=response.status_code, detail=f"刷新令牌失败: {response.text}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"刷新OAuth令牌失败: {str(e)}")

@router.post("/oauth/revoke-token")
async def revoke_jira_oauth_token(
    token: str = Body(..., embed=True),
    client_id: str = Body(..., embed=True),
    client_secret: str = Body(..., embed=True)
):
    """撤销OAuth令牌"""
    try:
        # 向Atlassian认证服务器发送撤销令牌请求
        # 注意：这只是一个示例实现，实际的撤销令牌流程可能有所不同
        revoke_url = "https://auth.atlassian.com/oauth/revoke"
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                revoke_url,
                data={
                    "token": token,
                    "client_id": client_id,
                    "client_secret": client_secret
                },
                headers={"Content-Type": "application/x-www-form-urlencoded"}
            )
            
        if response.status_code == 200:
            return {"message": "令牌已成功撤销"}
        else:
            raise HTTPException(status_code=response.status_code, detail=f"撤销令牌失败: {response.text}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"撤销OAuth令牌失败: {str(e)}")

@router.post("/oauth/exchange-token")
async def exchange_jira_oauth_token(
    code: str = Body(..., embed=True),
    client_id: str = Body(..., embed=True),
    client_secret: str = Body(..., embed=True),
    redirect_uri: str = Body(..., embed=True),
    username: str = Depends(require_bearer)
):
    """交换授权码为访问令牌和刷新令牌，并创建Jira连接"""
    try:
        import datetime
        
        # 获取当前用户
        user = await users_collection.find_one({"username": username})
        if not user:
            raise HTTPException(status_code=404, detail="用户不存在")
        
        # 向Atlassian认证服务器发送令牌交换请求
        token_url = "https://auth.atlassian.com/oauth/token"
        
        # 创建基本认证头
        import base64
        auth_header = "Basic " + base64.b64encode(f"{client_id}:{client_secret}".encode()).decode()
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                token_url,
                data={
                    "grant_type": "authorization_code",
                    "code": code,
                    "redirect_uri": redirect_uri
                },
                headers={
                    "Content-Type": "application/x-www-form-urlencoded",
                    "Authorization": auth_header
                }
            )
            
        # Log the response for debugging
        print(f"Atlassian token exchange response: {response.status_code}, {response.text}")
            
        if response.status_code == 200:
            token_data = response.json()
            
            # 使用访问令牌获取用户信息
            access_token = token_data.get("access_token")
            if access_token:
                # 获取可访问资源信息
                userinfo_url = "https://api.atlassian.com/oauth/token/accessible-resources"
                
                async with httpx.AsyncClient() as client:
                    userinfo_response = await client.get(
                        userinfo_url,
                        headers={
                            "Authorization": f"Bearer {access_token}",
                            "Accept": "application/json"
                        }
                    )
                    
                if userinfo_response.status_code == 200:
                    accessible_resources = userinfo_response.json()
                    
                    # 获取第一个可访问的资源作为默认Jira实例
                    if accessible_resources and len(accessible_resources) > 0:
                        jira_resource = accessible_resources[0]
                        jira_url = jira_resource.get("url", "")
                        jira_name = jira_resource.get("name", "Jira Connection")
                        
                        # 创建Jira连接记录
                        expires_in = token_data.get("expires_in", 3600)
                        token_expires_at = datetime.datetime.utcnow() + datetime.timedelta(seconds=expires_in)
                        
                        connection_data = {
                            "name": jira_name,
                            "description": f"通过OAuth连接的Jira实例",
                            "jira_url": jira_url,
                            "auth_type": "oauth2",
                            "client_id": client_id,
                            "access_token": access_token,
                            "refresh_token": token_data.get("refresh_token", ""),
                            "token_expires_at": token_expires_at,
                            "is_cloud": True,
                            "user_id": user["_id"]
                        }
                        
                        # 创建连接
                        connection = await create_connection(JiraConnectionCreate(**connection_data), user["_id"])
                        
                        # 返回包含连接信息和令牌的响应
                        return {
                            "connection": connection,
                            "token_data": token_data
                        }
                    else:
                        raise HTTPException(status_code=400, detail="未找到可访问的Jira资源")
                else:
                    raise HTTPException(status_code=userinfo_response.status_code, detail=f"获取可访问资源失败: {userinfo_response.text}")
            else:
                raise HTTPException(status_code=400, detail="令牌交换响应中缺少访问令牌")
        else:
            # Return the exact error from Atlassian for better debugging
            raise HTTPException(status_code=response.status_code, detail=f"Atlassian令牌交换失败: {response.text}")
    except HTTPException:
        # Re-raise HTTP exceptions (including those from Atlassian)
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"服务器内部错误: {str(e)}")


