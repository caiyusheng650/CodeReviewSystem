from fastapi import APIRouter, HTTPException
from fastapi.responses import PlainTextResponse, Response
import os
from pathlib import Path

router = APIRouter()

# 获取source目录中的install.tar文件路径
SOURCE_DIR = Path(__file__).parent.parent / "source"
INSTALL_TAR_PATH = SOURCE_DIR / "install.tar"

@router.get("/script")
async def get_install_script():
    """返回安装脚本"""
    # 获取当前服务器的URL（需要根据实际部署环境调整）
    base_url = os.getenv("API_BASE_URL", "https://your-api-domain.com")
    
    install_script = f"""#!/bin/bash

# AI代码审查系统安装脚本
# 这个脚本会从source目录下载ai-review.yml文件并安装到GitHub Workflow

echo "🚀 开始安装AI代码审查系统..."

# 检查是否在Git仓库中
if ! git rev-parse --git-dir > /dev/null 2>&1; then
    echo "❌ 错误：当前目录不是Git仓库"
    echo "请切换到您的Git仓库目录再运行此脚本"
    exit 1
fi

echo "📥 下载AI代码审查Workflow文件..."

# 创建.github/workflows目录（如果不存在）
mkdir -p .github/workflows

# 检查是否已有ai-review.yml文件
if [ -f ".github/workflows/ai-review.yml" ]; then
    echo "⚠️  检测到已有ai-review.yml文件，将备份现有文件"
    cp .github/workflows/ai-review.yml .github/workflows/ai-review.yml.backup.$(date +%s)
fi

# 下载ai-review.yml文件
curl -s "{base_url}/api/install/workflow/ai-review.yml" -o .github/workflows/ai-review.yml

if [ $? -ne 0 ]; then
    echo "❌ 下载失败，请检查网络连接"
    exit 1
fi

# 检查是否已有docs.txt文件，如果需要的话
if [ -f ".github/workflows/docs.txt" ]; then
    echo "⚠️  检测到已有docs.txt文件，将备份现有文件"
    cp .github/workflows/docs.txt .github/workflows/docs.txt.backup.$(date +%s)
fi

# 下载docs.txt文件
curl -s "{base_url}/api/install/workflow/docs.txt" -o .github/workflows/docs.txt

if [ $? -ne 0 ]; then
    echo "⚠️  docs.txt文件下载失败，但ai-review.yml已成功安装"
fi

echo "✅ 安装完成！"
echo ""
echo "📋 已安装的文件："
echo "   - .github/workflows/ai-review.yml (主工作流文件)"
echo "   - .github/workflows/docs.txt (文档说明)"
echo ""
echo "📋 下一步操作："
echo "1. 在GitHub仓库的Settings -> Secrets -> Actions中添加以下secrets："
echo "   - CODE_REVIEW_API_TOKEN: 您的API密钥"
echo "   - CODE_REVIEW_API_URL: {base_url}"
echo ""
echo "2. 提交更改到仓库："
echo "   git add .github/workflows/"
echo "   git commit -m 'feat: 添加AI代码审查workflow'"
echo "   git push"
echo ""
echo "3. 创建Pull Request测试功能"
echo ""
echo "💡 提示：您可以在 {base_url} 获取API密钥"
"""
    
    return PlainTextResponse(install_script, media_type="text/plain")

@router.get("/workflow/{filename}")
async def get_github_workflow_file(filename: str):
    """返回GitHub Workflow文件"""
    # 允许的文件列表
    allowed_files = ["ai-review.yml", "docs.txt"]
    
    if filename not in allowed_files:
        raise HTTPException(status_code=404, detail="File not found")
    
    # 构建文件路径
    file_path = SOURCE_DIR / filename
    
    # 检查文件是否存在
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")
    
    # 读取文件内容
    with open(file_path, "r", encoding="utf-8") as f:
        file_content = f.read()
    
    # 根据文件类型设置媒体类型
    media_type = "text/plain"
    if filename.endswith(".yml"):
        media_type = "text/yaml"
    
    return PlainTextResponse(
        content=file_content,
        media_type=media_type,
        headers={
            "Content-Disposition": f"attachment; filename={filename}"
        }
    )

@router.get("/")
async def get_install_instructions():
    """返回安装说明页面"""
    base_url = os.getenv("API_BASE_URL", "https://your-api-domain.com")
    
    instructions = f"""
<!DOCTYPE html>
<html>
<head>
    <title>AI代码审查系统 - 安装指南</title>
    <meta charset="utf-8">
    <style>
        body {{ font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }}
        .code {{ background: #f4f4f4; padding: 10px; border-radius: 5px; font-family: monospace; }}
        .step {{ margin: 20px 0; }}
        .warning {{ background: #fff3cd; border: 1px solid #ffeaa7; padding: 10px; border-radius: 5px; }}
    </style>
</head>
<body>
    <h1>🚀 AI代码审查系统安装指南</h1>
    
    <div class="step">
        <h2>方法一：一键安装（推荐）</h2>
        <p>在您的Git仓库根目录运行以下命令：</p>
        <div class="code">curl -s {base_url}/api/install/script | bash</div>
        <p class="warning">⚠️ 注意：请确保您信任此服务，因为这会下载并执行远程脚本</p>
    </div>
    
    <div class="step">
        <h2>方法二：手动安装</h2>
        <p>1. 创建GitHub Workflows目录：</p>
        <div class="code">mkdir -p .github/workflows</div>
        
        <p>2. 下载AI代码审查工作流文件：</p>
        <div class="code">curl -s {base_url}/api/install/workflow/ai-review.yml -o .github/workflows/ai-review.yml</div>
        
        <p>3. 下载文档说明文件（可选）：</p>
        <div class="code">curl -s {base_url}/api/install/workflow/docs.txt -o .github/workflows/docs.txt</div>
        
        <p>4. 提交更改：</p>
        <div class="code">
git add .github/workflows/
git commit -m 'feat: 添加AI代码审查workflow'
git push
        </div>
    </div>
    
    <div class="step">
        <h2>配置GitHub Secrets</h2>
        <p>在GitHub仓库的 Settings → Secrets and variables → Actions 中添加：</p>
        <ul>
            <li><strong>CODE_REVIEW_API_TOKEN</strong>: 您的API密钥（从 {base_url} 获取）</li>
            <li><strong>CODE_REVIEW_API_URL</strong>: {base_url}</li>
        </ul>
    </div>
    
    <div class="step">
        <h2>验证安装</h2>
        <p>创建Pull Request测试功能，系统会自动进行代码审查。</p>
    </div>
    
</body>
</html>
"""
    
    return PlainTextResponse(instructions, media_type="text/html")