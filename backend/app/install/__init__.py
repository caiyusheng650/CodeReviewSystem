"""
安装模块
包含AI代码审查系统的安装脚本、工作流配置和安装指南
"""

from .templates import (
    AI_REVIEW_WORKFLOW,
    INSTALL_SCRIPT,
    POWERSHELL_INSTALL_SCRIPT,
    HTML_INSTALL_GUIDE
)
from .config import API_DOMAIN
from .router import router

__all__ = [
    'AI_REVIEW_WORKFLOW',
    'INSTALL_SCRIPT', 
    'POWERSHELL_INSTALL_SCRIPT',
    'HTML_INSTALL_GUIDE',
    'API_DOMAIN',
    'router'
]