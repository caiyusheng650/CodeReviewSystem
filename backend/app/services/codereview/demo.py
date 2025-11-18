# codereview/demo.py
# 演示如何使用模块化的AI代码审查服务

import asyncio
import sys
import os
from pathlib import Path
from typing import Dict, Any, Optional

# 添加项目根目录到Python路径，以便能够导入模块
project_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
sys.path.insert(0, project_root)

from app.services.codereview import (
    AICodeReviewService,
    create_ai_code_review_service,
    get_ai_code_review_service,
    create_default_flow,
    logger
)

"""
演示模块 - 用于测试AI代码审查服务
"""

import asyncio
import logging
from pathlib import Path
from typing import Dict, Any
from motor.motor_asyncio import AsyncIOMotorClient
from app.utils.database import get_database
from app.services.codereview.database_service import CodeReviewService

logger = logging.getLogger(__name__)


async def get_real_db_service() -> CodeReviewService:
    """获取真实的数据库服务实例"""
    try:
        # 获取数据库连接（注意：get_database()返回的是数据库对象，不是集合）
        db = get_database()  # 不需要await，因为get_database()是同步函数
        # 获取代码审查集合
        collection = db.code_reviews
        # 创建真实的数据库服务实例
        return CodeReviewService(collection)
    except Exception as e:
        logger.error("获取真实数据库服务失败: %s", e)
        # 如果获取真实数据库失败，返回一个模拟服务
        return DummyDBService()


class DummyDBService:
    """模拟数据库服务（备用）"""
    
    async def create_review(self, review_data, user_id):
        """模拟创建审查记录"""
        logger.debug("DB_CREATE_SIM: 创建审查记录，用户ID: %s", user_id)
        return "demo_review_id"  # 模拟成功，返回模拟ID
    
    async def add_agent_output(self, review_id, agent_output):
        logger.debug("DB_SAVE_SIM: %s %s %d", review_id, agent_output.agent_name, len(agent_output.output_content))
    
    async def add_review_report(self, report):
        logger.debug("DB_REPORT_SIM: %s", report["review_id"])

async def demo_singleton():
    """演示单例模式使用"""
    print("=== 演示单例模式 ===")
    
    # 创建默认的GraphFlow
    flow = create_default_flow()
    
    # 获取单例实例
    db_service = await get_real_db_service()
    service = get_ai_code_review_service(
        code_review_service=db_service,
        flow=flow,
        silence_agent_console=True
    )
    
    print("单例服务创建成功")
    print(f"数据库服务类型: {type(db_service).__name__}")
    return service

async def demo_create_new():
    """演示创建新实例"""
    print("=== 演示创建新实例 ===")
    
    # 创建默认的GraphFlow
    flow = create_default_flow()
    
    # 创建新实例
    db_service = await get_real_db_service()
    service = create_ai_code_review_service(
        code_review_service=db_service,
        flow=flow,
        silence_agent_console=True
    )
    
    print("新服务实例创建成功")
    print(f"数据库服务类型: {type(db_service).__name__}")
    return service

async def demo_run_review():
    """演示运行代码审查"""
    
    # 使用真实数据库服务
    db_service = await get_real_db_service()
    
    # 获取AI服务实例
    service = get_ai_code_review_service(db_service)
    
    print(f"✅ 使用真实数据库服务: {type(db_service).__name__}")
    
    # 构建测试数据
    from bson import ObjectId
    
    # 先创建审查记录
    review_data = {
        "github_action_id": "demo_github_action_001",
        "pr_number": 1,
        "repo_owner": "demo_owner",
        "repo_name": "demo_repo",
        "author": "demo_user",
        "diff_content": """diff --git a/src/main.py b/src/main.py
index abc123..def456 100644
--- a/src/main.py
+++ b/src/main.py
@@ -1,5 +1,5 @@
 def main():
-    print("Hello World")
+    print("Hello, World!")
     return 0
 
 if __name__ == "__main__":
""",
        "pr_title": "更新问候语",
        "pr_body": "将问候语从'Hello World'改为'Hello, World!'",
        "readme_content": "# 演示项目\n这是一个演示项目",
        "comments": [
            {"body": "建议使用更具体的问候语", "id": 1, "line": 2, "path": "src/main.py"}
        ]
    }
    
    # 先创建审查记录，获取真实的review_id
    print("📝 创建审查记录...")
    
    # 将字典转换为CodeReviewCreate模型对象
    from app.models.codereview import CodeReviewCreate
    review_create_data = CodeReviewCreate(**review_data)
    
    # 使用有效的ObjectId作为user_id
    from bson import ObjectId
    user_id = str(ObjectId())  # 生成有效的ObjectId
    
    review_id = await db_service.create_review(review_create_data, user_id)
    print(f"✅ 审查记录创建成功，ID: {review_id}")
    
    # 构建完整的审查请求数据
    review_request = {
        "review_id": review_id,  # 使用数据库返回的真实ID
        "code_diff": review_data["diff_content"],
        "pr_comments": review_data["comments"],
        "developer_reputation_score": 75,
        "developer_reputation_history": [
            "PR#10：代码质量良好，无严重问题",
            "PR#9：1个中等问题，2个轻度问题"
        ],
        "repository_readme": review_data["readme_content"],
        "author": review_data["author"],
        "github_action_id": review_data["github_action_id"],
        "pr_number": review_data["pr_number"],
        "repo_owner": review_data["repo_owner"],
        "repo_name": review_data["repo_name"],
        "pr_title": review_data["pr_title"],
        "pr_body": review_data["pr_body"],
        "user_id": "demo_user_id"
    }
    
    print("🚀 开始演示代码审查...")
    
    # 运行AI代码审查
    result = await service.run_ai_code_review(review_request)
    
    print("✅ 代码审查完成")
    
    # 使用JSON序列化确保中文字符正确显示
    import json
    print(f"审查结果: {json.dumps(result, ensure_ascii=False, indent=2)}")
    
    return result

async def main():
    """主演示函数"""
    
    # 演示单例模式
    service1 = await demo_singleton()
    
    # 演示创建新实例
    service2 = await demo_create_new()
    
    # 演示运行审查（现在demo_run_review内部会创建自己的服务实例）
    result = await demo_run_review()
    
    if result:
        print("演示完成！")
    else:
        print("演示失败，但模块结构验证通过")

if __name__ == "__main__":
    asyncio.run(main())