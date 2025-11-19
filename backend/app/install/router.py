"""
安装路由模块
提供AI代码审查系统的安装脚本、工作流配置和安装指南
"""

from fastapi import APIRouter
from fastapi.responses import Response
import logging

from .templates import (
    AI_REVIEW_WORKFLOW,
    INSTALL_SCRIPT,
    POWERSHELL_INSTALL_SCRIPT,
    HTML_INSTALL_GUIDE
)
from .config import API_DOMAIN

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/workflow", summary="获取AI代码审查工作流文件")
async def get_ai_review_workflow():
    """
    返回AI代码审查工作流文件内容
    """
    return Response(
        content=AI_REVIEW_WORKFLOW,
        media_type="application/x-yaml",
        headers={"Content-Disposition": "attachment; filename=ai-review.yml"}
    )


@router.get("/script", summary="获取安装脚本")
async def get_install_script():
    """
    返回一键安装脚本
    """
    # 使用环境变量配置的API域名
    api_url = f"{API_DOMAIN}"
    
    # 替换脚本中的API_URL占位符
    script_content = INSTALL_SCRIPT.replace("$API_URL", api_url)
    
    return Response(
        content=script_content,
        media_type="application/x-shellscript",
        headers={"Content-Disposition": "attachment; filename=install-ai-review.sh"}
    )


@router.get("/powershell", summary="获取PowerShell安装脚本")
async def get_powershell_install_script():
    """
    返回PowerShell一键安装脚本
    """
    # 使用环境变量配置的API域名
    api_url = f"{API_DOMAIN}"
    
    # 替换脚本中的API_URL占位符
    script_content = POWERSHELL_INSTALL_SCRIPT.replace("$API_URL", api_url)
    
    return Response(
        content=script_content,
        media_type="application/x-powershell",
        headers={"Content-Disposition": "attachment; filename=install-ai-review.ps1"}
    )


@router.get("/", summary="获取安装说明")
async def get_install_instructions():
    """
    返回安装说明页面
    """
    return Response(content=HTML_INSTALL_GUIDE, media_type="text/html")