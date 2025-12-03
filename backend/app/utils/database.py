from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
import os

# 加载环境变量
load_dotenv()

# MongoDB Atlas 连接配置
MONGODB_URI = os.getenv("MONGODB_URI")
DATABASE_NAME = os.getenv("DATABASE_NAME")

# 创建MongoDB客户端
client = AsyncIOMotorClient(MONGODB_URI)
database = client[DATABASE_NAME]

# 获取集合
users_collection = database["users"]
apikeys_collection = database["apikeys"]
programmers_collection = database["programmers"]
codereviews_collection = database["codereviews"]

async def connect_to_mongo():
    """连接到MongoDB"""
    try:
        # 测试连接
        await client.admin.command('ping')
        return True
    except Exception as e:
        return False

async def close_mongo_connection():
    """关闭MongoDB连接"""
    client.close()


# FastAPI依赖函数
def get_database():
    """FastAPI依赖函数：获取数据库实例"""
    return database