from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
import os

# 加载环境变量
load_dotenv()

# MongoDB Atlas 连接配置
MONGODB_URI = os.getenv("MONGODB_URI")
DATABASE_NAME = "code_review_db"

# 创建MongoDB客户端
client = AsyncIOMotorClient(MONGODB_URI)
database = client[DATABASE_NAME]

# 获取集合
users_collection = database["users"]

async def connect_to_mongo():
    """连接到MongoDB"""
    try:
        # 测试连接
        await client.admin.command('ping')
        print("成功连接到MongoDB Atlas")
        return True
    except Exception as e:
        print(f"连接MongoDB失败: {e}")
        return False

async def close_mongo_connection():
    """关闭MongoDB连接"""
    client.close()
    print("MongoDB连接已关闭")