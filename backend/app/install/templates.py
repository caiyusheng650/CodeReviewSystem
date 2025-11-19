"""
安装模块模板
包含所有安装相关的字符串模板
"""

import os
from .config import API_DOMAIN

# 从文件读取模板内容
def _read_template_file(filename):
    """从文件读取模板内容"""
    file_path = os.path.join(os.path.dirname(__file__), filename)
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            return f.read()
    except FileNotFoundError:
        raise FileNotFoundError(f"模板文件 {filename} 不存在")
    except Exception as e:
        raise Exception(f"读取模板文件 {filename} 失败: {e}")

# 动态生成HTML安装指南
def get_html_install_guide():
    """动态生成HTML安装指南，插入API_DOMAIN和AI_REVIEW_WORKFLOW"""
    html_template = _read_template_file("html_install_guide_template.html")
    return html_template.replace("{API_DOMAIN}", API_DOMAIN).replace("{AI_REVIEW_WORKFLOW}", AI_REVIEW_WORKFLOW)

# AI代码审查工作流文件内容
AI_REVIEW_WORKFLOW = _read_template_file("template.txt")

# 安装脚本内容
INSTALL_SCRIPT = _read_template_file("install_script.txt")

# PowerShell安装脚本内容
POWERSHELL_INSTALL_SCRIPT = _read_template_file("powershell_install_script.txt")

# HTML安装指南模板（动态生成）
HTML_INSTALL_GUIDE = get_html_install_guide()
