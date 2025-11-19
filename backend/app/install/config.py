"""
安装模块配置
"""

import os

# 从环境变量获取API域名，如果未设置则使用默认值
API_DOMAIN = os.getenv("API_DOMAIN", "your-api-domain.com")